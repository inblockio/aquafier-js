import { FastifyInstance } from 'fastify';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { prisma } from '../database/db';
import { getHost, getPort } from '../utils/api_utils';
import { getFile, getFileSize } from '../utils/file_utils';
import {
    buildEntireTreeFromGivenRevisionHash,
    saveMyRevisionInAquaTree,
    deleteAquaTree,
    orderRevisionsFromGenesisToLatest,
} from '../utils/revisions_utils';
import { createAquaTreeFromRevisions } from '../utils/revisions_operations_utils';
import {
    verifyRevisionAccess,
    buildCatalogItem,
    parseRangeParam,
    validateSha3Hash,
    unixSecondsToDate,
    dateToUnixSeconds,
} from '../utils/aqua_rest_api_utils';
import {
    AquaRestListQuery,
    AquaRestUpdatesQuery,
    CatalogItem,
    ChangeEntry,
    SaveRevisionForUser,
} from '../models/request_models';
import Logger from '../utils/logger';
import path from 'path';

export default async function aquaRestApiController(fastify: FastifyInstance) {

    // ──────────────────────────────────────────────
    // GET /aqua-api/list
    // ──────────────────────────────────────────────
    fastify.get('/aqua-api/list', { preHandler: [authenticate] }, async (request: AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user!.address;
            const query = request.query as AquaRestListQuery;
            const includeMetadata = query.include_metadata === 'true';
            const typeFilter = query.type;

            // 1. Get user's own files (non-template, non-workflow)
            const ownedLatest = await prisma.latest.findMany({
                where: {
                    user: userAddress,
                    template_id: null,
                    is_workflow: false,
                }
            });

            // 2. Get shared items from Contract table
            const sharedContracts = await prisma.contract.findMany({
                where: {
                    recipients: { has: userAddress.toLowerCase() },
                    receiver_has_deleted: { isEmpty: true },
                }
            });

            // Collect all pubkey_hashes to process
            const pubkeyHashes: string[] = ownedLatest.map(l => l.hash);

            // For shared contracts, build pubkey_hash from sender + latest hash
            for (const contract of sharedContracts) {
                if (contract.sender && contract.latest) {
                    pubkeyHashes.push(`${contract.sender}_${contract.latest}`);
                }
            }

            // 3. Optionally filter by revision type
            let filteredHashes = pubkeyHashes;
            if (typeFilter) {
                const typeChecks = await Promise.all(
                    pubkeyHashes.map(async (pkh) => {
                        const rev = await prisma.revision.findFirst({
                            where: { pubkey_hash: pkh },
                            select: { revision_type: true }
                        });
                        return { pkh, matches: rev?.revision_type === typeFilter };
                    })
                );
                filteredHashes = typeChecks.filter(t => t.matches).map(t => t.pkh);
            }

            // 4. Build catalog items
            const items: CatalogItem[] = await Promise.all(
                filteredHashes.map(pkh => buildCatalogItem(pkh, includeMetadata))
            );

            return reply.code(200).send({ success: true, data: items });
        } catch (error: any) {
            Logger.error('Error in GET /aqua-api/list:', error);
            return reply.code(500).send({ success: false, message: 'Internal server error' });
        }
    });

    // ──────────────────────────────────────────────
    // GET /aqua-api/get_branch/:revision_hash
    // ──────────────────────────────────────────────
    fastify.get('/aqua-api/get_branch/:revision_hash', { preHandler: [authenticate] }, async (request: AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user!.address;
            const { revision_hash } = request.params as { revision_hash: string };

            if (!revision_hash) {
                return reply.code(400).send({ success: false, message: 'revision_hash is required' });
            }

            // Verify access
            const access = await verifyRevisionAccess(userAddress, revision_hash);
            if (!access) {
                return reply.code(403).send({ success: false, message: 'Access denied' });
            }

            // Build the full tree from this revision
            const revisionTree = await buildEntireTreeFromGivenRevisionHash(access.pubkeyHash);

            if (!revisionTree || revisionTree.length === 0) {
                return reply.code(404).send({ success: false, message: 'Revision not found' });
            }

            // Order revisions from genesis to latest
            const ordered = orderRevisionsFromGenesisToLatest(revisionTree);

            // Map to response format
            const branch = ordered.map((item: any) => {
                const hash = item.revisionHash.includes('_')
                    ? item.revisionHash.split('_').slice(1).join('_')
                    : item.revisionHash;
                return {
                    hash,
                    children: (item.children || []).map((c: string) =>
                        c.includes('_') ? c.split('_').slice(1).join('_') : c
                    ),
                };
            });

            return reply.code(200).send({ success: true, data: branch });
        } catch (error: any) {
            Logger.error('Error in GET /aqua-api/get_branch:', error);
            return reply.code(500).send({ success: false, message: 'Internal server error' });
        }
    });

    // ──────────────────────────────────────────────
    // GET /aqua-api/get_revision/:revision_hash
    // ──────────────────────────────────────────────
    fastify.get('/aqua-api/get_revision/:revision_hash', { preHandler: [authenticate] }, async (request: AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user!.address;
            const { revision_hash } = request.params as { revision_hash: string };

            if (!revision_hash) {
                return reply.code(400).send({ success: false, message: 'revision_hash is required' });
            }

            // Verify access
            const access = await verifyRevisionAccess(userAddress, revision_hash);
            if (!access) {
                return reply.code(403).send({ success: false, message: 'Access denied' });
            }

            // Construct the URL for internal calls
            const host = request.headers.host || `${getHost()}:${getPort()}`;
            const protocol = request.protocol || 'https';
            const url = `${protocol}://${host}`;

            // Build a full AquaTree from this revision
            const [aquaTree, fileObjects] = await createAquaTreeFromRevisions(revision_hash, url);

            // Find the specific revision data
            const revisionData = await prisma.revision.findFirst({
                where: { pubkey_hash: access.pubkeyHash },
                include: {
                    Signature: true,
                    Witness: true,
                    Link: true,
                    AquaForms: true,
                }
            });

            if (!revisionData) {
                return reply.code(404).send({ success: false, message: 'Revision not found' });
            }

            return reply.code(200).send({
                success: true,
                data: {
                    revision: revisionData,
                    aquaTree,
                    fileObjects,
                }
            });
        } catch (error: any) {
            Logger.error('Error in GET /aqua-api/get_revision:', error);
            return reply.code(500).send({ success: false, message: 'Internal server error' });
        }
    });

    // ──────────────────────────────────────────────
    // GET /aqua-api/get_file/:revision_hash
    // ──────────────────────────────────────────────
    fastify.get('/aqua-api/get_file/:revision_hash', { preHandler: [authenticate] }, async (request: AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user!.address;
            const { revision_hash } = request.params as { revision_hash: string };
            const query = request.query as { range?: string };

            if (!revision_hash) {
                return reply.code(400).send({ success: false, message: 'revision_hash is required' });
            }

            // Verify access
            const access = await verifyRevisionAccess(userAddress, revision_hash);
            if (!access) {
                return reply.code(403).send({ success: false, message: 'Access denied' });
            }

            // Find the revision to get the file_hash
            const revision = await prisma.revision.findFirst({
                where: { pubkey_hash: access.pubkeyHash },
                select: { file_hash: true }
            });

            if (!revision || !revision.file_hash) {
                return reply.code(404).send({ success: false, message: 'No file associated with this revision' });
            }

            // Look up the file record
            const file = await prisma.file.findFirst({
                where: { file_hash: revision.file_hash }
            });

            if (!file) {
                return reply.code(404).send({ success: false, message: 'File not found' });
            }

            // Read the file
            const fileContent = await getFile(file.file_location);
            if (!fileContent) {
                return reply.code(404).send({ success: false, message: 'File content not found' });
            }

            // Get file name for Content-Disposition
            const fileName = await prisma.fileName.findFirst({
                where: { pubkey_hash: access.pubkeyHash }
            });
            const displayName = fileName?.file_name || path.basename(file.file_location);

            // Set Content-Type based on extension
            const fileExt = path.extname(displayName).toLowerCase();
            let contentType = 'application/octet-stream';
            if (fileExt === '.pdf') contentType = 'application/pdf';
            else if (fileExt === '.json') contentType = 'application/json';
            else if (fileExt === '.txt') contentType = 'text/plain';
            else if (fileExt === '.html') contentType = 'text/html';
            else if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(fileExt)) {
                contentType = `image/${fileExt.slice(1).replace('jpg', 'jpeg')}`;
            }

            // Handle range request
            if (query.range) {
                const totalSize = fileContent.length;
                const range = parseRangeParam(query.range, totalSize);
                if (!range) {
                    return reply.code(416).send({ success: false, message: 'Invalid range' });
                }

                const sliced = fileContent.subarray(range.start, range.end + 1);

                reply.header('Content-Range', `bytes ${range.start}-${range.end}/${totalSize}`);
                reply.header('Accept-Ranges', 'bytes');
                reply.header('Content-Length', sliced.length);
                reply.header('Content-Type', contentType);
                return reply.code(206).send(sliced);
            }

            // Full file response
            const encodedFilename = encodeURIComponent(displayName)
                .replace(/['()]/g, escape)
                .replace(/\*/g, '%2A');

            reply.header('Content-Type', contentType);
            reply.header('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
            reply.header('Accept-Ranges', 'bytes');
            return reply.code(200).send(fileContent);
        } catch (error: any) {
            Logger.error('Error in GET /aqua-api/get_file:', error);
            return reply.code(500).send({ success: false, message: 'Internal server error' });
        }
    });

    // ──────────────────────────────────────────────
    // POST /aqua-api/import_revision
    // ──────────────────────────────────────────────
    fastify.post('/aqua-api/import_revision', { preHandler: [authenticate] }, async (request: AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user!.address;

            // Construct the URL for internal calls
            const host = request.headers.host || `${getHost()}:${getPort()}`;
            const protocol = request.protocol || 'https';
            const url = `${protocol}://${host}`;

            // Parse multipart form data
            const isMultipart = request.isMultipart();
            if (!isMultipart) {
                return reply.code(400).send({ success: false, message: 'Expected multipart form data' });
            }

            let metadataStr: string | null = null;
            let fileBuffer: Buffer | null = null;
            let fileName: string | null = null;

            const parts = request.parts();
            for await (const part of parts) {
                if (part.type === 'field' && part.fieldname === 'metadata') {
                    metadataStr = part.value as string;
                } else if (part.type === 'file' && part.fieldname === 'file') {
                    const chunks: Buffer[] = [];
                    for await (const chunk of part.file) {
                        chunks.push(chunk);
                    }
                    fileBuffer = Buffer.concat(chunks);
                    fileName = part.filename;
                }
            }

            if (!metadataStr) {
                return reply.code(400).send({ success: false, message: 'metadata field is required' });
            }

            let metadata: any;
            try {
                metadata = JSON.parse(metadataStr);
            } catch {
                return reply.code(400).send({ success: false, message: 'metadata must be valid JSON' });
            }

            const { revision, revisionHash, originAddress } = metadata;

            if (!revision || !revisionHash) {
                return reply.code(400).send({ success: false, message: 'revision and revisionHash are required in metadata' });
            }

            // Validate hash format
            if (!validateSha3Hash(revisionHash)) {
                return reply.code(400).send({ success: false, message: 'Invalid revision hash format. Expected 0x-prefixed 64-char hex string.' });
            }

            const revisionData: SaveRevisionForUser = {
                revision,
                revisionHash,
                address: userAddress,
                originAddress: originAddress || userAddress,
                templateId: '',
                isWorkflow: false,
            };

            const [status, message] = await saveMyRevisionInAquaTree(revisionData, userAddress, url);

            if (status !== 200) {
                return reply.code(status).send({ success: false, message });
            }

            return reply.code(201).send({ success: true, hash: revisionHash });
        } catch (error: any) {
            Logger.error('Error in POST /aqua-api/import_revision:', error);
            return reply.code(500).send({ success: false, message: 'Internal server error' });
        }
    });

    // ──────────────────────────────────────────────
    // DELETE /aqua-api/remove_revision/:revision_hash
    // ──────────────────────────────────────────────
    fastify.delete('/aqua-api/remove_revision/:revision_hash', { preHandler: [authenticate] }, async (request: AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user!.address;
            const { revision_hash } = request.params as { revision_hash: string };

            if (!revision_hash) {
                return reply.code(400).send({ success: false, message: 'revision_hash is required' });
            }

            // Verify ownership (must own, not just have shared access)
            const access = await verifyRevisionAccess(userAddress, revision_hash);
            if (!access) {
                return reply.code(404).send({ success: false, message: 'Revision not found' });
            }
            if (!access.isOwner) {
                return reply.code(403).send({ success: false, message: 'Only the owner can delete a revision' });
            }

            // Construct the URL for internal calls
            const host = request.headers.host || `${getHost()}:${getPort()}`;
            const protocol = request.protocol || 'https';
            const url = `${protocol}://${host}`;

            const [status, message] = await deleteAquaTree(revision_hash, userAddress, url);

            if (status !== 200) {
                return reply.code(status).send({ success: false, message });
            }

            return reply.code(200).send({ success: true, message: 'Revision deleted successfully' });
        } catch (error: any) {
            Logger.error('Error in DELETE /aqua-api/remove_revision:', error);
            return reply.code(500).send({ success: false, message: 'Internal server error' });
        }
    });

    // ──────────────────────────────────────────────
    // GET /aqua-api/updates
    // ──────────────────────────────────────────────
    fastify.get('/aqua-api/updates', { preHandler: [authenticate] }, async (request: AuthenticatedRequest, reply) => {
        try {
            const userAddress = request.user!.address;
            const query = request.query as AquaRestUpdatesQuery;

            if (!query.start_time) {
                return reply.code(400).send({ success: false, message: 'start_time query parameter is required (UNIX seconds)' });
            }

            const startTime = unixSecondsToDate(parseInt(query.start_time, 10));
            const endTime = query.end_time
                ? unixSecondsToDate(parseInt(query.end_time, 10))
                : new Date();
            const typeFilter = query.type;
            const includeMetadata = query.include_metadata === 'true';
            const page = parseInt(query.page || '1', 10);
            const limit = Math.min(parseInt(query.limit || '50', 10), 200);
            const skip = (page - 1) * limit;

            // Query revisions belonging to the user within the time range
            const whereClause: any = {
                pubkey_hash: { startsWith: userAddress },
                createdAt: {
                    gte: startTime,
                    lte: endTime,
                }
            };

            if (typeFilter) {
                whereClause.revision_type = typeFilter;
            }

            const [revisions, totalCount] = await Promise.all([
                prisma.revision.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.revision.count({ where: whereClause }),
            ]);

            // Map to ChangeEntry objects
            const entries: ChangeEntry[] = await Promise.all(
                revisions.map(async (rev) => {
                    const revisionHash = rev.pubkey_hash.includes('_')
                        ? rev.pubkey_hash.split('_').slice(1).join('_')
                        : rev.pubkey_hash;

                    const entry: ChangeEntry = {
                        hash: revisionHash,
                        action: 'added',
                        timestamp: dateToUnixSeconds(rev.createdAt),
                    };

                    if (includeMetadata) {
                        entry.type = rev.revision_type ?? undefined;

                        const fileName = await prisma.fileName.findFirst({
                            where: { pubkey_hash: rev.pubkey_hash }
                        });
                        if (fileName) {
                            entry.title = fileName.file_name;
                        }
                    }

                    return entry;
                })
            );

            return reply.code(200).send({
                success: true,
                data: entries,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    total_pages: Math.ceil(totalCount / limit),
                }
            });
        } catch (error: any) {
            Logger.error('Error in GET /aqua-api/updates:', error);
            return reply.code(500).send({ success: false, message: 'Internal server error' });
        }
    });
}
