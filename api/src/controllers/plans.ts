import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import Logger from '../utils/logger';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';

export default async function plansController(fastify: FastifyInstance) {

    // Admin authorization hook
    fastify.addHook('preHandler', async (request, reply) => {
        if (!request.url.includes('/admin/plans')) return;

        await authenticate(request as AuthenticatedRequest, reply);

        const address = (request as AuthenticatedRequest).user?.address;
        if (!address) return;

        const allowedWallets = (process.env.DASHBOARD_WALLETS || '').split(',').map(w => w.trim().toLowerCase());
        if (!allowedWallets.includes(address.toLowerCase())) {
            return reply.code(403).send({ error: 'Unauthorized: Access denied' });
        }
    });

    // GET /admin/plans - List all plans
    fastify.get('/admin/plans', async (request, reply) => {
        try {
            const plans = await prisma.subscriptionPlan.findMany({
                orderBy: { sort_order: 'asc' },
                include: {
                    _count: {
                        select: { subscriptions: true }
                    }
                }
            });

            return reply.send({ success: true, data: plans });
        } catch (error: any) {
            Logger.error('Error fetching plans:', error);
            return reply.code(500).send({ success: false, error: 'Failed to fetch plans' });
        }
    });

    // GET /admin/plans/:planId - Get single plan
    fastify.get('/admin/plans/:planId', async (request, reply) => {
        const { planId } = request.params as { planId: string };

        try {
            const plan = await prisma.subscriptionPlan.findUnique({
                where: { id: planId },
                include: {
                    _count: {
                        select: { subscriptions: true }
                    }
                }
            });

            if (!plan) {
                return reply.code(404).send({ success: false, error: 'Plan not found' });
            }

            return reply.send({ success: true, data: plan });
        } catch (error: any) {
            Logger.error('Error fetching plan:', error);
            return reply.code(500).send({ success: false, error: 'Failed to fetch plan' });
        }
    });

    // POST /admin/plans - Create a new plan
    fastify.post('/admin/plans', async (request, reply) => {
        const body = request.body as any;

        if (!body.id || !body.name || !body.display_name) {
            return reply.code(400).send({ success: false, error: 'Missing required fields: id, name, display_name' });
        }

        try {
            const plan = await prisma.subscriptionPlan.create({
                data: {
                    id: body.id,
                    name: body.name,
                    display_name: body.display_name,
                    description: body.description || null,
                    price_monthly_usd: body.price_monthly_usd ?? 0,
                    price_yearly_usd: body.price_yearly_usd ?? 0,
                    stripe_monthly_price_id: body.stripe_monthly_price_id || null,
                    stripe_yearly_price_id: body.stripe_yearly_price_id || null,
                    crypto_monthly_price_usd: body.crypto_monthly_price_usd ?? null,
                    crypto_yearly_price_usd: body.crypto_yearly_price_usd ?? null,
                    max_storage_gb: body.max_storage_gb ?? 1,
                    max_files: body.max_files ?? 100,
                    max_contracts: body.max_contracts ?? 10,
                    max_templates: body.max_templates ?? 5,
                    features: body.features ?? {},
                    sort_order: body.sort_order ?? 0,
                    is_active: body.is_active ?? true,
                    is_public: body.is_public ?? true,
                }
            });

            return reply.code(201).send({ success: true, data: plan });
        } catch (error: any) {
            Logger.error('Error creating plan:', error);
            if (error.code === 'P2002') {
                return reply.code(409).send({ success: false, error: 'A plan with that id or name already exists' });
            }
            return reply.code(500).send({ success: false, error: 'Failed to create plan' });
        }
    });

    // PUT /admin/plans/:planId - Update a plan
    fastify.put('/admin/plans/:planId', async (request, reply) => {
        const { planId } = request.params as { planId: string };
        const body = request.body as any;

        try {
            const existing = await prisma.subscriptionPlan.findUnique({
                where: { id: planId }
            });

            if (!existing) {
                return reply.code(404).send({ success: false, error: 'Plan not found' });
            }

            const plan = await prisma.subscriptionPlan.update({
                where: { id: planId },
                data: {
                    ...(body.name !== undefined && { name: body.name }),
                    ...(body.display_name !== undefined && { display_name: body.display_name }),
                    ...(body.description !== undefined && { description: body.description }),
                    ...(body.price_monthly_usd !== undefined && { price_monthly_usd: body.price_monthly_usd }),
                    ...(body.price_yearly_usd !== undefined && { price_yearly_usd: body.price_yearly_usd }),
                    ...(body.stripe_monthly_price_id !== undefined && { stripe_monthly_price_id: body.stripe_monthly_price_id }),
                    ...(body.stripe_yearly_price_id !== undefined && { stripe_yearly_price_id: body.stripe_yearly_price_id }),
                    ...(body.crypto_monthly_price_usd !== undefined && { crypto_monthly_price_usd: body.crypto_monthly_price_usd }),
                    ...(body.crypto_yearly_price_usd !== undefined && { crypto_yearly_price_usd: body.crypto_yearly_price_usd }),
                    ...(body.max_storage_gb !== undefined && { max_storage_gb: body.max_storage_gb }),
                    ...(body.max_files !== undefined && { max_files: body.max_files }),
                    ...(body.max_contracts !== undefined && { max_contracts: body.max_contracts }),
                    ...(body.max_templates !== undefined && { max_templates: body.max_templates }),
                    ...(body.features !== undefined && { features: body.features }),
                    ...(body.sort_order !== undefined && { sort_order: body.sort_order }),
                    ...(body.is_active !== undefined && { is_active: body.is_active }),
                    ...(body.is_public !== undefined && { is_public: body.is_public }),
                }
            });

            return reply.send({ success: true, data: plan });
        } catch (error: any) {
            Logger.error('Error updating plan:', error);
            if (error.code === 'P2002') {
                return reply.code(409).send({ success: false, error: 'A plan with that name already exists' });
            }
            return reply.code(500).send({ success: false, error: 'Failed to update plan' });
        }
    });

    // DELETE /admin/plans/:planId - Delete a plan
    fastify.delete('/admin/plans/:planId', async (request, reply) => {
        const { planId } = request.params as { planId: string };

        try {
            const activeSubscriptions = await prisma.subscription.count({
                where: {
                    plan_id: planId,
                    status: 'ACTIVE'
                }
            });

            if (activeSubscriptions > 0) {
                return reply.code(400).send({
                    success: false,
                    error: `Cannot delete plan: ${activeSubscriptions} active subscription(s) are using it. Deactivate the plan instead.`
                });
            }

            await prisma.subscriptionPlan.delete({
                where: { id: planId }
            });

            return reply.send({ success: true, message: 'Plan deleted' });
        } catch (error: any) {
            Logger.error('Error deleting plan:', error);
            if (error.code === 'P2025') {
                return reply.code(404).send({ success: false, error: 'Plan not found' });
            }
            return reply.code(500).send({ success: false, error: 'Failed to delete plan' });
        }
    });
}
