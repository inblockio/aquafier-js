import { Prisma, PrismaClient } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { prisma } from '../database/db';
import Logger from '../utils/logger';
import { usageService } from './usageService';

type TransactionClient = Omit<
    PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Which of the target user's SIWE sessions to remove.
 *
 * 'nonce' removes only the session the caller presented — used when a user clears
 * their own data, so they are signed out of this device.
 * 'all' removes every session belonging to the target — used when an admin wipes
 * somebody else, so the target is force-signed-out and the admin is not.
 */
export type SessionScope =
    | { kind: 'nonce'; nonce: string }
    | { kind: 'all' };

export interface DeletionSummary {
    notifications: number;
    latest: number;
    contractsSoftDeleted: number;
    contractsDeleted: number;
    revisions: number;
    links: number;
    signatures: number;
    witnesses: number;
    witnessEvents: number;
    aquaForms: number;
    fileNames: number;
    fileIndexes: number;
    files: number;
    templates: number;
    settings: number;
    sessions: number;
}

const emptySummary = (): DeletionSummary => ({
    notifications: 0,
    latest: 0,
    contractsSoftDeleted: 0,
    contractsDeleted: 0,
    revisions: 0,
    links: 0,
    signatures: 0,
    witnesses: 0,
    witnessEvents: 0,
    aquaForms: 0,
    fileNames: 0,
    fileIndexes: 0,
    files: 0,
    templates: 0,
    settings: 0,
    sessions: 0,
});

/**
 * Remove every trace of a user's workspace data: revisions, trees, files,
 * templates, settings, notifications and contracts.
 *
 * The Users row itself is deliberately left in place, so the address can sign
 * back in to an empty workspace and no foreign key into Users is left dangling.
 *
 * Files are reference counted through FileIndex.pubkey_hash: a file shared with
 * another user only loses this user's reference, and the File row is removed
 * only once nothing points at it.
 */
export async function clearUserData(
    userAddress: string,
    opts: { sessionScope: SessionScope }
): Promise<DeletionSummary> {
    const summary = emptySummary();

    await prisma.$transaction(async (tx) => {
        Logger.info(`Starting user data deletion transaction for user: ${userAddress}`);

        const deletedNotifications = await tx.notifications.deleteMany({
            where: { receiver: userAddress },
        });
        summary.notifications = deletedNotifications.count;

        const deletedLatest = await tx.latest.deleteMany({
            where: { user: userAddress },
        });
        summary.latest = deletedLatest.count;

        // Contracts the user received are soft deleted — the other party still
        // needs their copy — so we only push this user into receiver_has_deleted.
        const contractsToSoftDelete = await tx.contract.findMany({
            where: { recipients: { has: userAddress } },
        });

        const contractsNeedingSoftDelete = contractsToSoftDelete.filter(
            (contract) => !contract.receiver_has_deleted?.includes(userAddress)
        );

        for (const contract of contractsNeedingSoftDelete) {
            await tx.contract.update({
                where: { hash: contract.hash },
                data: { receiver_has_deleted: { push: userAddress } },
            });
            summary.contractsSoftDeleted++;
        }

        // Contracts the user sent have no other owner, so they go for good.
        const deletedSenderContracts = await tx.contract.deleteMany({
            where: { sender: { equals: userAddress, mode: 'insensitive' } },
        });
        summary.contractsDeleted = deletedSenderContracts.count;

        const userRevisions = await tx.revision.findMany({
            where: {
                pubkey_hash: { contains: userAddress, mode: 'insensitive' },
            },
            select: { pubkey_hash: true },
        });

        const revisionHashes = userRevisions.map((rev) => rev.pubkey_hash);
        Logger.info(`Found ${revisionHashes.length} revisions to process for ${userAddress}`);

        if (revisionHashes.length > 0) {
            const deletedLinks = await tx.link.deleteMany({
                where: { hash: { in: revisionHashes } },
            });
            summary.links = deletedLinks.count;

            const deletedSignatures = await tx.signature.deleteMany({
                where: { hash: { in: revisionHashes } },
            });
            summary.signatures = deletedSignatures.count;

            const witnessRecords = await tx.witness.findMany({
                where: { hash: { in: revisionHashes } },
                select: { hash: true, Witness_merkle_root: true },
            });

            if (witnessRecords.length > 0) {
                for (const merkelItem of witnessRecords) {
                    if (merkelItem.Witness_merkle_root == null) {
                        continue;
                    }

                    // A merkle root shared with another user's witness must survive.
                    const allWithMerkleRoot = await tx.witness.findMany({
                        where: {
                            Witness_merkle_root: {
                                not: null,
                                equals: merkelItem.Witness_merkle_root,
                            },
                        },
                    });

                    if (allWithMerkleRoot.length <= 1) {
                        const deletedWitnessEvents = await tx.witnessEvent.deleteMany({
                            where: {
                                Witness_merkle_root: { equals: merkelItem.Witness_merkle_root },
                            },
                        });
                        summary.witnessEvents += deletedWitnessEvents.count;
                    }
                }

                const deletedWitness = await tx.witness.deleteMany({
                    where: { hash: { in: revisionHashes } },
                });
                summary.witnesses = deletedWitness.count;
            }

            const deletedAquaForms = await tx.aquaForms.deleteMany({
                where: { hash: { in: revisionHashes } },
            });
            summary.aquaForms = deletedAquaForms.count;

            for (const hash of revisionHashes) {
                const deletedFileNames = await tx.fileName.deleteMany({
                    where: { pubkey_hash: hash },
                });
                summary.fileNames += deletedFileNames.count;

                const fileCounts = await handleFilesDeletion(tx, hash);
                summary.fileIndexes += fileCounts.fileIndexes;
                summary.files += fileCounts.files;
            }

            const deletedRevisions = await tx.revision.deleteMany({
                where: { pubkey_hash: { in: revisionHashes } },
            });
            summary.revisions = deletedRevisions.count;
        }

        Logger.info(`User data deletion completed for ${userAddress}`);
    });

    // Outside the transaction: these are independent of the tree teardown above,
    // and a failure here should not roll back a successful wipe.
    summary.templates = await deleteUserTemplates(userAddress);

    if (opts.sessionScope.kind === 'nonce') {
        const deleted = await prisma.siweSession.deleteMany({
            where: { nonce: opts.sessionScope.nonce },
        });
        summary.sessions = deleted.count;
    } else {
        const deleted = await prisma.siweSession.deleteMany({
            where: { address: userAddress },
        });
        summary.sessions = deleted.count;
    }

    const deletedSettings = await prisma.settings.deleteMany({
        where: { user_pub_key: userAddress },
    });
    summary.settings = deletedSettings.count;

    usageService
        .recalculateUserUsage(userAddress)
        .catch((err) =>
            Logger.error('Failed to recalculate usage after user data deletion:', err)
        );

    return summary;
}

/**
 * Drop this revision's references to stored files, deleting the File and FileIndex
 * rows only when no other pubkey still points at them.
 */
async function handleFilesDeletion(
    tx: TransactionClient,
    pubKey: string
): Promise<{ fileIndexes: number; files: number }> {
    let filesToDelete = await tx.fileIndex.findMany({
        where: { pubkey_hash: { hasSome: [pubKey] } },
        select: { file_hash: true, pubkey_hash: true },
    });

    if (filesToDelete.length === 0) {
        const rawQuery = await tx.$queryRaw`
            SELECT file_hash, pubkey_hash FROM file_index
            WHERE EXISTS (
                SELECT 1 FROM unnest(pubkey_hash) AS h
                WHERE LOWER(h) LIKE LOWER('%' || ${pubKey} || '%')
            )
        `;
        filesToDelete = rawQuery as { file_hash: string; pubkey_hash: string[] }[];
    }

    if (filesToDelete.length === 0) {
        return { fileIndexes: 0, files: 0 };
    }

    const fileHashesToRemoveUser = new Set<string>();
    const fileHashesToDeleteCompletely = new Set<string>();

    for (const fileIndex of filesToDelete) {
        fileHashesToRemoveUser.add(fileIndex.file_hash);
        if (fileIndex.pubkey_hash.length <= 1) {
            fileHashesToDeleteCompletely.add(fileIndex.file_hash);
        }
    }

    for (const fileHash of fileHashesToRemoveUser) {
        if (fileHashesToDeleteCompletely.has(fileHash)) continue;

        const currentFileIndex = await tx.fileIndex.findUnique({
            where: { file_hash: fileHash },
            select: { pubkey_hash: true },
        });
        if (!currentFileIndex) continue;

        const updatedPubkeyHash = currentFileIndex.pubkey_hash.filter(
            (hash) => hash !== pubKey
        );

        if (updatedPubkeyHash.length === 0) {
            fileHashesToDeleteCompletely.add(fileHash);
        } else {
            await tx.fileIndex.update({
                where: { file_hash: fileHash },
                data: { pubkey_hash: updatedPubkeyHash },
            });
        }
    }

    if (fileHashesToDeleteCompletely.size === 0) {
        return { fileIndexes: 0, files: 0 };
    }

    const orphaned = Array.from(fileHashesToDeleteCompletely);

    const deletedFileIndexes = await tx.fileIndex.deleteMany({
        where: { file_hash: { in: orphaned } },
    });

    const deletedFiles = await tx.file.deleteMany({
        where: { file_hash: { in: orphaned } },
    });

    return { fileIndexes: deletedFileIndexes.count, files: deletedFiles.count };
}

async function deleteUserTemplates(userAddress: string): Promise<number> {
    const userTemplates = await prisma.aquaTemplate.findMany({
        where: { owner: userAddress },
        select: { id: true },
    });

    for (const template of userTemplates) {
        await prisma.aquaTemplateFields.deleteMany({
            where: { aqua_form_id: template.id },
        });
        await prisma.aquaTemplate.delete({
            where: { id: template.id },
        });
    }

    Logger.info(`Deleted ${userTemplates.length} templates for ${userAddress}`);
    return userTemplates.length;
}
