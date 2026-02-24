import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { isUserAdmin } from '../utils/api_utils';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { getFile, getFileSize } from '../utils/file_utils.js';
import path from 'path';
import Logger from "../utils/logger";

export default async function adminController(fastify: FastifyInstance) {

    // Authorization Middleware
    fastify.addHook('preHandler', async (request, reply) => {
        if (!request.url.includes('/admin/')) return;

        await authenticate(request as AuthenticatedRequest, reply);

        const address = (request as AuthenticatedRequest).user?.address;
        if (!address) return;

        const { isAdmin, isSuperAdmin } = await isUserAdmin(address);
        if (!isAdmin) {
            return reply.code(403).send({ error: 'Unauthorized: Access denied' });
        }

        (request as any).adminSource = isSuperAdmin ? 'env' : 'db';
        (request as any).walletAddress = address;
    });

    fastify.get('/admin/check', async (request, reply) => {
        // If we reach here, the preHandler has already verified the user is an admin
        return reply.send({ isAdmin: true });
    });

    fastify.get('/admin/data/:type', async (request, reply) => {
        const { type } = request.params as { type: string };
        const { page = 1, limit = 20, status } = request.query as { page?: number, limit?: number, status?: string };

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        try {
            let data;
            let totalCount;

            switch (type) {
                case 'users':
                    [totalCount, data] = await Promise.all([
                        prisma.users.count(),
                        prisma.users.findMany({
                            skip,
                            take: limitNum,
                            orderBy: { createdAt: 'desc' },
                            select: {
                                address: true,
                                email: true,
                                ens_name: true,
                                is_admin: true,
                                createdAt: true,
                                updatedAt: true
                            }
                        })
                    ]);
                    break;

                case 'contracts':
                    [totalCount, data] = await Promise.all([
                        prisma.contract.count(),
                        prisma.contract.findMany({
                            skip,
                            take: limitNum,
                            orderBy: { created_at: 'desc' },
                            select: {
                                hash: true,
                                file_name: true,
                                sender: true,
                                recipients: true,
                                created_at: true
                            }
                        })
                    ]);
                    break;

                case 'revisions':
                    [totalCount, data] = await Promise.all([
                        prisma.revision.count(),
                        prisma.revision.findMany({
                            skip,
                            take: limitNum,
                            orderBy: { createdAt: 'desc' },
                            select: {
                                pubkey_hash: true,
                                revision_type: true,
                                has_content: true,
                                createdAt: true
                            }
                        })
                    ]);
                    break;

                case 'files':
                    [totalCount, data] = await Promise.all([
                        prisma.file.count(),
                        prisma.file.findMany({
                            skip,
                            take: limitNum,
                            orderBy: { createdAt: 'desc' },
                            select: {
                                file_hash: true,
                                file_location: true,
                                file_size: true,
                                createdAt: true
                            }
                        })
                    ]);

                    // Resolve file sizes from filesystem for entries with 0 bytes in DB
                    data = await Promise.all(
                        (data as any[]).map(async (file) => {
                            if (file.file_size === 0 && file.file_location) {
                                try {
                                    const actualSize = await getFileSize(file.file_location);
                                    if (actualSize && actualSize > 0) {
                                        return { ...file, file_size: actualSize };
                                    }
                                } catch (_) { /* keep 0 if lookup fails */ }
                            }
                            return file;
                        })
                    );
                    break;

                case 'payments':
                    const paymentWhere = status ? { status: status as any } : {};
                    [totalCount, data] = await Promise.all([
                        prisma.payment.count({ where: paymentWhere }),
                        prisma.payment.findMany({
                            where: paymentWhere,
                            skip,
                            take: limitNum,
                            orderBy: { createdAt: 'desc' },
                            include: {
                                Subscription: {
                                    select: {
                                        user_address: true
                                    }
                                }
                            }
                        })
                    ]);
                    break;

                default:
                    return reply.code(400).send({ error: 'Invalid type requested' });
            }

            return reply.send({
                data,
                pagination: {
                    total: totalCount,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(totalCount / limitNum)
                }
            });

        } catch (error) {
            Logger.error(`Error fetching admin data for ${type}:`, error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    fastify.post('/admin/toggle-admin', async (request, reply) => {
        const { targetAddress, makeAdmin } = request.body as { targetAddress: string; makeAdmin: boolean };
        const requesterAddress = (request as any).walletAddress as string;

        if (!targetAddress || typeof makeAdmin !== 'boolean') {
            return reply.code(400).send({ error: 'Missing required fields: targetAddress, makeAdmin' });
        }

        // Prevent self-demotion
        if (targetAddress.toLowerCase() === requesterAddress.toLowerCase() && !makeAdmin) {
            return reply.code(403).send({ error: 'Cannot remove your own admin status' });
        }

        // Check if target is a super admin (env-configured)
        const superAdmins = (process.env.DASHBOARD_WALLETS || "")
            .split(",")
            .map(w => w.trim().toLowerCase())
            .filter(Boolean);

        if (superAdmins.includes(targetAddress.toLowerCase()) && !makeAdmin) {
            return reply.code(403).send({ error: 'Cannot remove super admin status. This admin is configured via environment.' });
        }

        try {
            const updatedUser = await prisma.users.update({
                where: { address: targetAddress },
                data: { is_admin: makeAdmin },
                select: {
                    address: true,
                    email: true,
                    ens_name: true,
                    is_admin: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            return reply.send({
                success: true,
                user: updatedUser,
                isSuperAdmin: superAdmins.includes(targetAddress.toLowerCase()),
            });
        } catch (error) {
            Logger.error('Error toggling admin status:', error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    // Admin file serving endpoint (bypasses ownership check)
    fastify.get('/admin/files/:fileHash', async (request, reply) => {
        const { fileHash } = request.params as { fileHash: string };

        if (!fileHash || fileHash.trim() === '') {
            return reply.code(400).send({ error: 'Missing or empty file hash' });
        }

        try {
            const file = await prisma.file.findFirst({
                where: { file_hash: fileHash }
            });

            if (!file) {
                return reply.code(404).send({ error: 'File not found' });
            }

            const fileContent = await getFile(file.file_location!);

            const fileExt = path.extname(file.file_location ?? '').toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.png': 'image/png', '.gif': 'image/gif',
                '.webp': 'image/webp', '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.mp4': 'video/mp4', '.webm': 'video/webm',
                '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
                '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
                '.ogg': 'audio/ogg', '.flac': 'audio/flac',
                '.json': 'application/json',
                '.txt': 'text/plain', '.md': 'text/markdown',
                '.html': 'text/html', '.css': 'text/css',
                '.js': 'text/javascript', '.ts': 'text/typescript',
                '.xml': 'application/xml',
                '.csv': 'text/csv',
            };

            reply.header('Content-Type', mimeTypes[fileExt] || 'application/octet-stream');
            return reply.send(fileContent);
        } catch (error) {
            Logger.error('Error serving admin file:', error);
            return reply.code(500).send({ error: 'Error reading file content' });
        }
    });
}
