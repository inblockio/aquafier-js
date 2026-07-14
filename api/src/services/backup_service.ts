import { FastifyReply } from 'fastify';
import { Archiver, ZipArchive } from 'archiver';
import { AquaTree, FileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { prisma } from '../database/db';
import Logger from '../utils/logger';
import { getFile } from '../utils/file_utils';
import { getGenesisHash } from '../utils/aqua_tree_utils';
import { getAquaTreeFileName } from '../utils/api_utils';
import { buildEntireTreeFromGivenRevisionHash } from '../utils/revision_query_utils';
import { createAquaTreeFromRevisions } from '../utils/revision_build_utils';

const BACKUP_MANIFEST_TYPE = 'aqua_workspace_backup';
const BACKUP_MANIFEST_VERSION = '1.0.0';
const ZERO_GENESIS = '0'.repeat(64);

export interface BackupUserSummary {
    address: string;
    treeCount: number;
    estimatedBytes: number;
}

/**
 * Every user that holds at least one aqua tree, with enough detail for an operator
 * to see what an export is about to pull down before starting it.
 */
export async function getBackupUserList(): Promise<BackupUserSummary[]> {
    const [users, treeCounts, usages] = await Promise.all([
        prisma.users.findMany({ select: { address: true }, orderBy: { createdAt: 'asc' } }),
        prisma.latest.groupBy({ by: ['user'], _count: { hash: true } }),
        prisma.userUsage.findMany({
            select: { user_address: true, storage_usage_bytes: true },
        }),
    ]);

    const countByUser = new Map<string, number>(
        treeCounts.map((t: { user: string; _count: { hash: number } }) => [t.user, t._count.hash])
    );
    const bytesByUser = new Map<string, number>(
        usages.map((u: { user_address: string; storage_usage_bytes: bigint }) => [
            u.user_address,
            Number(u.storage_usage_bytes),
        ])
    );

    return users.map((user) => ({
        address: user.address,
        treeCount: countByUser.get(user.address) ?? 0,
        estimatedBytes: bytesByUser.get(user.address) ?? 0,
    }));
}

/**
 * Stream a complete workspace backup for one user straight to the HTTP reply.
 *
 * The archive layout matches the browser-built backup that WorkspaceManagment.tsx
 * produces, so the result stays importable through /explorer_workspace_upload:
 *
 *   <treeName>.aqua.json   one per aqua tree
 *   <assetName>            each referenced asset, raw, at the archive root
 *   aqua.json              manifest, type: aqua_workspace_backup
 *
 * Unlike that flow, this reads every tree in Latest — workflow and template trees
 * included — because an admin export is taken as the record of truth before a
 * delete, and silently dropping trees would lose data that cannot be recovered.
 */
export async function streamUserBackup(
    address: string,
    url: string,
    reply: FastifyReply
): Promise<void> {
    const latestRecords = await prisma.latest.findMany({
        where: { user: address },
        select: { hash: true },
        orderBy: { createdAt: 'desc' },
    });

    const archive = new ZipArchive({ zlib: { level: 9 } });

    reply.raw.setHeader('Content-Type', 'application/zip');
    reply.raw.setHeader(
        'Content-Disposition',
        `attachment; filename="workspace_${address}.zip"`
    );

    // We are writing the socket ourselves from here on, so Fastify must not try to
    // send a reply of its own on top of the stream.
    reply.hijack();
    archive.pipe(reply.raw);

    archive.on('warning', (err) => Logger.error(`Backup archive warning for ${address}:`, err));
    archive.on('error', (err) => {
        Logger.error(`Backup archive error for ${address}:`, err);
        reply.raw.destroy(err);
    });

    const nameWithHash: { name: string; hash: string }[] = [];
    const seenAssets = new Set<string>();

    // Past the hijack there is no status code left to send, so nothing in here may
    // throw: a failure has to tear the socket down, which is what tells the client
    // the zip it received is truncated rather than handing it a corrupt file.
    try {
        for (const record of latestRecords) {
            try {
                const revisionChain = await buildEntireTreeFromGivenRevisionHash(record.hash);
                if (revisionChain.length === 0) continue;

                const latestRevisionHash = revisionChain[revisionChain.length - 1].revisionHash;
                const [rawTree, fileObjects] = await createAquaTreeFromRevisions(
                    latestRevisionHash,
                    url
                );
                const aquaTree = OrderRevisionInAquaTree(rawTree);

                const treeName = getAquaTreeFileName(aquaTree);
                if (!treeName) continue;

                const treeFileName = `${treeName}.aqua.json`;
                if (!seenAssets.has(treeFileName)) {
                    archive.append(JSON.stringify(aquaTree, null, 2), { name: treeFileName });
                    seenAssets.add(treeFileName);
                    nameWithHash.push({
                        name: treeFileName,
                        hash: getGenesisHash(aquaTree) ?? '',
                    });
                }

                for (const fileObject of fileObjects) {
                    await appendFileObject(archive, fileObject, url, seenAssets, nameWithHash);
                }
            } catch (error) {
                // One unbuildable tree must not cost the operator the whole backup.
                Logger.error(`Skipping tree ${record.hash} for ${address}:`, error);
            }
        }

        const manifest = {
            type: BACKUP_MANIFEST_TYPE,
            version: BACKUP_MANIFEST_VERSION,
            createdAt: new Date().toISOString(),
            genesis: ZERO_GENESIS,
            name_with_hash: nameWithHash,
        };
        archive.append(JSON.stringify(manifest, null, 2), { name: 'aqua.json' });

        await archive.finalize();
    } catch (error) {
        Logger.error(`Backup stream failed for ${address}:`, error);
        archive.destroy();
        reply.raw.destroy();
    }
}

/**
 * Resolve one FileObject into archive bytes.
 *
 * createAquaTreeFromRevisions hands back assets as a `${url}/files/<hash>` URL rather
 * than content — the browser flow re-fetches each one over HTTP. Here we short-circuit
 * that and read the bytes straight out of storage instead.
 */
async function appendFileObject(
    archive: Archiver,
    fileObject: FileObject,
    url: string,
    seenAssets: Set<string>,
    nameWithHash: { name: string; hash: string }[]
): Promise<void> {
    const { fileName, fileContent } = fileObject;
    if (!fileName || seenAssets.has(fileName)) return;

    try {
        const assetUrlPrefix = `${url}/files/`;

        if (typeof fileContent === 'string' && fileContent.startsWith(assetUrlPrefix)) {
            const fileHash = fileContent.slice(assetUrlPrefix.length);
            const file = await prisma.file.findFirst({ where: { file_hash: fileHash } });

            if (!file?.file_location) {
                Logger.error(`No stored location for file ${fileHash} (${fileName})`);
                return;
            }

            // Reads local disk or S3/MinIO, whichever this deployment uses.
            const buffer = await getFile(file.file_location);
            if (!buffer) {
                Logger.error(`Could not read file ${fileHash} at ${file.file_location}`);
                return;
            }

            archive.append(buffer, { name: fileName });
            seenAssets.add(fileName);
            return;
        }

        // Anything else is already inline content: a linked aqua tree, or the tree
        // itself, which createAquaTreeFromRevisions appends as a JSON string.
        const content =
            typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent, null, 2);

        if (fileName.endsWith('.aqua.json')) {
            const parsed = safeParseAquaTree(content);
            if (parsed) {
                nameWithHash.push({ name: fileName, hash: getGenesisHash(parsed) ?? '' });
            }
        }

        archive.append(content, { name: fileName });
        seenAssets.add(fileName);
    } catch (error) {
        Logger.error(`Failed to add ${fileName} to backup:`, error);
    }
}

function safeParseAquaTree(content: string): AquaTree | null {
    try {
        const parsed = JSON.parse(content);
        return parsed?.revisions ? (parsed as AquaTree) : null;
    } catch {
        return null;
    }
}
