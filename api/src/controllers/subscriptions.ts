import { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../database/db';
import { AuthenticatedRequest, authenticate } from '../middleware/auth_middleware';
import Logger from '../utils/logger';
import { calculateStorageUsage } from '../utils/stats';

export default async function subscriptionsController(fastify: FastifyInstance) {

  // ============================================================================
  // SUBSCRIPTION PLANS ENDPOINTS
  // ============================================================================

  /**
   * GET /subscriptions/plans
   * Get all active subscription plans (public)
   */
  fastify.get('/subscriptions/plans', async (request, reply) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: {
          is_active: true,
          is_public: true,
        },
        orderBy: {
          sort_order: 'asc',
        },
        select: {
          id: true,
          name: true,
          display_name: true,
          description: true,
          price_monthly_usd: true,
          price_yearly_usd: true,
          crypto_monthly_price_usd: true,
          crypto_yearly_price_usd: true,
          max_storage_gb: true,
          max_files: true,
          max_contracts: true,
          max_templates: true,
          features: true,
          sort_order: true,
        },
      });

      return reply.code(200).send({
        success: true,
        data: plans,
      });
    } catch (error) {
      Logger.error('Error fetching subscription plans:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch subscription plans',
      });
    }
  });

  /**
   * GET /subscriptions/plan/:planId
   * Get a specific plan details
   */
  fastify.get('/subscriptions/plan/:planId', async (request, reply) => {
    try {
      const { planId } = request.params as { planId: string };

      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return reply.code(404).send({
          success: false,
          error: 'Plan not found',
        });
      }

      return reply.code(200).send({
        success: true,
        data: plan,
      });
    } catch (error) {
      Logger.error('Error fetching plan:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch plan',
      });
    }
  });

  // ============================================================================
  // USER SUBSCRIPTION ENDPOINTS
  // ============================================================================

  /**
   * GET /subscriptions/current
   * Get current user's active subscription
   */
  fastify.get(
    '/subscriptions/current',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const subscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            status: {
              in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
            },
          },
          include: {
            Plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (!subscription) {
          // User has no subscription, return free plan info
          const freePlan = await prisma.subscriptionPlan.findUnique({
            where: { id: process.env.DEFAULT_FREE_PLAN_ID || '' },
          });

          return reply.code(200).send({
            success: true,
            data: {
              subscription: null,
              plan: freePlan,
              is_free_tier: true,
            },
          });
        }

        return reply.code(200).send({
          success: true,
          data: {
            subscription,
            plan: subscription.Plan,
            is_free_tier: false,
          },
        });
      } catch (error) {
        Logger.error('Error fetching user subscription:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch subscription',
        });
      }
    }
  );

  /**
   * POST /subscriptions/create
   * Create a new subscription for the user
   */
  fastify.post(
    '/subscriptions/create',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { plan_id, payment_method, billing_period } = request.body as {
          plan_id: string;
          payment_method: 'STRIPE' | 'CRYPTO';
          billing_period: 'MONTHLY' | 'YEARLY';
        };

        // Validate plan exists
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: plan_id },
        });

        if (!plan) {
          return reply.code(404).send({
            success: false,
            error: 'Plan not found',
          });
        }

        // Check if user already has an active subscription
        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            status: {
              in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
            },
          },
        });

        if (existingSubscription) {
          return reply.code(400).send({
            success: false,
            error: 'User already has an active subscription. Please cancel it first or use upgrade/downgrade endpoint.',
          });
        }

        // Calculate period dates
        const now = new Date();
        const trialDays = parseInt(process.env.TRIAL_PERIOD_DAYS || '14');
        const trial_end = new Date(now);
        trial_end.setDate(trial_end.getDate() + trialDays);

        const period_end = new Date(trial_end);
        if (billing_period === 'YEARLY') {
          period_end.setFullYear(period_end.getFullYear() + 1);
        } else {
          period_end.setMonth(period_end.getMonth() + 1);
        }

        // Create subscription in TRIALING or INCOMPLETE status
        const subscription = await prisma.subscription.create({
          data: {
            user_address: userAddress,
            plan_id: plan_id,
            status: plan.price_monthly_usd.toNumber() === 0 ? 'ACTIVE' : 'TRIALING',
            payment_method: payment_method,
            billing_period: billing_period,
            current_period_start: now,
            current_period_end: period_end,
            trial_start: plan.price_monthly_usd.toNumber() === 0 ? null : now,
            trial_end: plan.price_monthly_usd.toNumber() === 0 ? null : trial_end,
          },
          include: {
            Plan: true,
          },
        });

        Logger.info(`Created subscription for user ${userAddress}`, {
          subscription_id: subscription.id,
          plan_name: plan.name,
        });

        return reply.code(201).send({
          success: true,
          data: subscription,
          message: 'Subscription created successfully',
        });
      } catch (error) {
        Logger.error('Error creating subscription:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to create subscription',
        });
      }
    }
  );

  /**
   * PUT /subscriptions/cancel
   * Cancel user's subscription (at period end)
   */
  fastify.put(
    '/subscriptions/cancel',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { immediate } = request.body as { immediate?: boolean };

        const subscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            status: {
              in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
            },
          },
        });

        if (!subscription) {
          return reply.code(404).send({
            success: false,
            error: 'No active subscription found',
          });
        }

        // Update subscription
        const updatedSubscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            cancel_at_period_end: !immediate,
            canceled_at: new Date(),
            status: immediate ? 'CANCELED' : subscription.status,
          },
          include: {
            Plan: true,
          },
        });

        Logger.info(`Subscription canceled for user ${userAddress}`, {
          subscription_id: subscription.id,
          immediate: immediate,
        });

        return reply.code(200).send({
          success: true,
          data: updatedSubscription,
          message: immediate
            ? 'Subscription canceled immediately'
            : 'Subscription will be canceled at the end of the billing period',
        });
      } catch (error) {
        Logger.error('Error canceling subscription:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to cancel subscription',
        });
      }
    }
  );

  /**
   * PUT /subscriptions/change-plan
   * Upgrade or downgrade user's subscription plan
   */
  fastify.put(
    '/subscriptions/change-plan',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { new_plan_id } = request.body as { new_plan_id: string };

        // Validate new plan exists
        const newPlan = await prisma.subscriptionPlan.findUnique({
          where: { id: new_plan_id },
        });

        if (!newPlan) {
          return reply.code(404).send({
            success: false,
            error: 'New plan not found',
          });
        }

        const subscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            status: {
              in: ['ACTIVE', 'TRIALING'],
            },
          },
          include: {
            Plan: true,
          },
        });

        if (!subscription) {
          return reply.code(404).send({
            success: false,
            error: 'No active subscription found',
          });
        }

        // Update subscription plan
        const updatedSubscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            plan_id: new_plan_id,
          },
          include: {
            Plan: true,
          },
        });

        Logger.info(`Subscription plan changed for user ${userAddress}`, {
          subscription_id: subscription.id,
          old_plan: subscription.Plan.name,
          new_plan: newPlan.name,
        });

        return reply.code(200).send({
          success: true,
          data: updatedSubscription,
          message: 'Subscription plan updated successfully',
        });
      } catch (error) {
        Logger.error('Error changing subscription plan:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to change subscription plan',
        });
      }
    }
  );

  /**
   * GET /subscriptions/usage
   * Get user's current usage statistics
   */
  fastify.get(
    '/subscriptions/usage',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        // Get subscription and plan limits
        const subscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            status: {
              in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
            },
          },
          include: {
            Plan: true,
          },
        });

        const plan = subscription?.Plan || await prisma.subscriptionPlan.findUnique({
          where: { id: process.env.DEFAULT_FREE_PLAN_ID || '' },
        });

        if (!plan) {
          return reply.code(404).send({
            success: false,
            error: 'Plan not found',
          });
        }

        // Check for cached usage stats
        let userUsage = await prisma.userUsage.findUnique({
          where: { user_address: userAddress }
        });

        // If usage stats don't exist, calculate and save them (healing)
        if (!userUsage) {
          const { usageService } = await import('../services/usageService');
          const stats = await usageService.recalculateUserUsage(userAddress);
          userUsage = {
            user_address: userAddress,
            storage_usage_bytes: BigInt(stats.storage_usage_bytes),
            files_count: stats.files_count,
            contracts_count: stats.contracts_count,
            templates_count: stats.templates_count,
            updated_at: new Date()
          };
        }


        // Sync with UsageRecord for the active subscription
        let usageRecord = null;
        if (subscription) {
          usageRecord = await prisma.usageRecord.findFirst({
            where: {
              subscription_id: subscription.id,
              period_start: { lte: new Date() },
              period_end: { gte: new Date() }
            }
          });

          const usageData = {
            storage_used_bytes: userUsage.storage_usage_bytes,
            files_count: userUsage.files_count,
            contracts_count: userUsage.contracts_count,
            templates_count: userUsage.templates_count,
            updatedAt: new Date()
          };

          if (usageRecord) {
            usageRecord = await prisma.usageRecord.update({
              where: { id: usageRecord.id },
              data: usageData
            });
          } else {
            usageRecord = await prisma.usageRecord.create({
              data: {
                subscription_id: subscription.id,
                user_address: userAddress,
                period_start: subscription.current_period_start,
                period_end: subscription.current_period_end,
                ...usageData
              }
            });
          }
        }

        const filesCount = userUsage.files_count;
        const templatesCount = userUsage.templates_count;
        const storage_used_bytes = Number(userUsage.storage_usage_bytes);
        const contractsCount = userUsage.contracts_count;

        return reply.code(200).send({
          success: true,
          data: {
            usage: {
              files_count: filesCount,
              contracts_count: contractsCount,
              templates_count: templatesCount,
              storage_used_gb: storage_used_bytes / (1024 * 1024 * 1024),
            },
            limits: {
              max_files: plan.max_files,
              max_contracts: plan.max_contracts,
              max_templates: plan.max_templates,
              max_storage_gb: plan.max_storage_gb,
            },
            remaining: {
              files: plan.max_files - filesCount,
              contracts: plan.max_contracts - contractsCount,
              templates: plan.max_templates - templatesCount,
              storage_gb: plan.max_storage_gb - (storage_used_bytes / (1024 * 1024 * 1024))
            },
            percentage_used: {
              files: (filesCount / plan.max_files) * 100,
              contracts: (contractsCount / plan.max_contracts) * 100,
              templates: (templatesCount / plan.max_templates) * 100,
              storage: (storage_used_bytes / (plan.max_storage_gb * 1024 * 1024 * 1024)) * 100,
            },
          },
        });
      } catch (error) {
        Logger.error('Error fetching usage:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch usage statistics',
        });
      }
    }
  );

  /**
   * POST /subscriptions/usage/recalculate
   * Force recalculation of user's usage statistics
   */
  fastify.post(
    '/subscriptions/usage/recalculate',
    { preHandler: authenticate },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const userAddress = request.user?.address;

        if (!userAddress) {
          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
          });
        }

        const { usageService } = await import('../services/usageService');
        const stats = await usageService.recalculateUserUsage(userAddress);

        // Get subscription/plan info to calculate limits/percentages
        const subscription = await prisma.subscription.findFirst({
          where: {
            user_address: userAddress,
            status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] },
          },
          include: { Plan: true },
        });

        const plan = subscription?.Plan || await prisma.subscriptionPlan.findUnique({
          where: { id: process.env.DEFAULT_FREE_PLAN_ID || '' },
        });

        if (!plan) throw new Error('Plan not found for user');

        const filesCount = stats.files_count;
        const templatesCount = stats.templates_count;
        const storage_used_bytes = Number(stats.storage_usage_bytes);
        const contractsCount = stats.contracts_count;

        return reply.code(200).send({
          success: true,
          data: {
            usage: {
              files_count: filesCount,
              contracts_count: contractsCount,
              templates_count: templatesCount,
              storage_used_gb: storage_used_bytes / (1024 * 1024 * 1024),
            },
            limits: {
              max_files: plan.max_files,
              max_contracts: plan.max_contracts,
              max_templates: plan.max_templates,
              max_storage_gb: plan.max_storage_gb,
            },
            remaining: {
              files: plan.max_files - filesCount,
              contracts: plan.max_contracts - contractsCount,
              templates: plan.max_templates - templatesCount,
              storage_gb: plan.max_storage_gb - (storage_used_bytes / (1024 * 1024 * 1024))
            },
            percentage_used: {
              files: (filesCount / plan.max_files) * 100,
              contracts: (contractsCount / plan.max_contracts) * 100,
              templates: (templatesCount / plan.max_templates) * 100,
              storage: (storage_used_bytes / (plan.max_storage_gb * 1024 * 1024 * 1024)) * 100,
            },
          },
          message: 'Usage statistics recalculated successfully'
        });

      } catch (error) {
        Logger.error('Error recalculating usage:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to recalculate usage statistics'
        });
      }
    }
  );
}
