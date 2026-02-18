import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { isUserAdmin } from '../utils/api_utils';
import Logger from "../utils/logger";

export default async function adminController(fastify: FastifyInstance) {

    // Authorization Middleware
    fastify.addHook('preHandler', async (request, reply) => {
        // Skip auth for this hook if it's not an admin route (safety check, though we register this controller under a prefix usually, or we just check path)
        if (!request.url.includes('/admin/')) return;

        const nonce = request.headers['nonce'];

        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce }
        });

        if (!session || !session.address) {
            return reply.code(403).send({ success: false, message: "Nonce is invalid" });
        }

        const { isAdmin, isSuperAdmin } = await isUserAdmin(session.address);
        if (!isAdmin) {
            return reply.code(403).send({ error: 'Unauthorized: Access denied' });
        }

        // Attach admin info to request for downstream use
        (request as any).adminSource = isSuperAdmin ? 'env' : 'db';
        (request as any).walletAddress = session.address;
    });

    fastify.get('/admin/check', async (request, reply) => {
        // If we reach here, the preHandler has already verified the user is an admin
        return reply.send({ isAdmin: true });
    });

    fastify.get('/admin/data/:type', async (request, reply) => {
        const { type } = request.params as { type: string };
        const { page = 1, limit = 20 } = request.query as { page?: number, limit?: number };

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
                                createdAt: true
                            }
                        })
                    ]);
                    break;

                case 'payments':
                    [totalCount, data] = await Promise.all([
                        prisma.payment.count(),
                        prisma.payment.findMany({
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
}
