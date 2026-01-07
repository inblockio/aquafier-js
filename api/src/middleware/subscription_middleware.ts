import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database/db';
import Logger from '../utils/logger';

export interface SubscriptionRequest extends FastifyRequest {
  user?: {
    address: string;
  };
  subscription?: {
    id: string;
    plan: {
      max_storage_gb: number;
      max_files: number;
      max_contracts: number;
      max_templates: number;
      features: any;
    };
    status: string;
  };
}

/**
 * Middleware to check if user's plan allows the requested action
 * Must be used after authenticate middleware
 */
export async function checkPlanLimits(
  limitType: 'files' | 'contracts' | 'templates' | 'storage',
  additionalCount: number = 1
) {
  return async (request: SubscriptionRequest, reply: FastifyReply) => {
    try {
      const userAddress = request.user?.address;

      if (!userAddress) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Get user's subscription and plan
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      let plan;

      if (!subscription) {
        // User has no subscription, use free plan
        plan = await prisma.subscriptionPlan.findUnique({
          where: { id: process.env.DEFAULT_FREE_PLAN_ID || '' },
        });

        if (!plan) {
          Logger.error('Default free plan not found');
          return reply.code(500).send({
            success: false,
            error: 'Configuration error',
          });
        }
      } else {
        plan = subscription.Plan;
      }

      // Check current usage
      let currentUsage = 0;
      let limit = 0;

      switch (limitType) {
        case 'files': {
          currentUsage = await prisma.latest.count({
            where: { user: userAddress },
          });
          limit = plan.max_files;
          break;
        }

        case 'contracts': {
          currentUsage = await prisma.contract.count({
            where: { sender: userAddress },
          });
          limit = plan.max_contracts;
          break;
        }

        case 'templates': {
          currentUsage = await prisma.aquaTemplate.count({
            where: { owner: userAddress },
          });
          limit = plan.max_templates;
          break;
        }

        case 'storage': {
          // TODO: Implement actual storage calculation
          currentUsage = 0;
          limit = plan.max_storage_gb * 1024 * 1024 * 1024; // Convert GB to bytes
          break;
        }
      }

      // Check if adding new items would exceed limit
      if (currentUsage + additionalCount > limit) {
        Logger.warn('Plan limit exceeded', {
          user_address: userAddress,
          limit_type: limitType,
          current: currentUsage,
          limit: limit,
          plan: plan.name,
        });

        return reply.code(403).send({
          success: false,
          error: 'Plan limit exceeded',
          details: {
            limit_type: limitType,
            current_usage: currentUsage,
            limit: limit,
            plan_name: plan.display_name,
            upgrade_required: true,
          },
        });
      }

      // Attach subscription info to request for use in handlers
      request.subscription = {
        id: subscription?.id || '',
        plan: {
          max_storage_gb: plan.max_storage_gb,
          max_files: plan.max_files,
          max_contracts: plan.max_contracts,
          max_templates: plan.max_templates,
          features: plan.features,
        },
        status: subscription?.status || 'FREE',
      };
    } catch (error) {
      Logger.error('Error checking plan limits:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to check plan limits',
      });
    }
  };
}

/**
 * Middleware to check if user has access to a specific feature
 */
export async function checkFeatureAccess(featureName: string) {
  return async (request: SubscriptionRequest, reply: FastifyReply) => {
    try {
      const userAddress = request.user?.address;

      if (!userAddress) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      // Get user's subscription
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
        orderBy: {
          createdAt: 'desc',
        },
      });

      let plan;

      if (!subscription) {
        plan = await prisma.subscriptionPlan.findUnique({
          where: { id: process.env.DEFAULT_FREE_PLAN_ID || '' },
        });
      } else {
        plan = subscription.Plan;
      }

      if (!plan) {
        return reply.code(500).send({
          success: false,
          error: 'Configuration error',
        });
      }

      // Check if feature is available in plan
      const features = plan.features as Record<string, boolean>;

      if (!features[featureName]) {
        Logger.warn('Feature not available in plan', {
          user_address: userAddress,
          feature: featureName,
          plan: plan.name,
        });

        return reply.code(403).send({
          success: false,
          error: 'Feature not available in your plan',
          details: {
            feature: featureName,
            plan_name: plan.display_name,
            upgrade_required: true,
          },
        });
      }

      // Attach subscription info
      request.subscription = {
        id: subscription?.id || '',
        plan: {
          max_storage_gb: plan.max_storage_gb,
          max_files: plan.max_files,
          max_contracts: plan.max_contracts,
          max_templates: plan.max_templates,
          features: plan.features,
        },
        status: subscription?.status || 'FREE',
      };
    } catch (error) {
      Logger.error('Error checking feature access:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to check feature access',
      });
    }
  };
}

/**
 * Get user's plan and subscription info
 * Doesn't block the request, just adds info to request object
 */
export async function attachSubscriptionInfo(
  request: SubscriptionRequest,
  reply: FastifyReply
) {
  try {
    const userAddress = request.user?.address;

    if (!userAddress) {
      return;
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

    if (subscription) {
      request.subscription = {
        id: subscription.id,
        plan: {
          max_storage_gb: subscription.Plan.max_storage_gb,
          max_files: subscription.Plan.max_files,
          max_contracts: subscription.Plan.max_contracts,
          max_templates: subscription.Plan.max_templates,
          features: subscription.Plan.features,
        },
        status: subscription.status,
      };
    }
  } catch (error) {
    Logger.error('Error attaching subscription info:', error);
  }
}
