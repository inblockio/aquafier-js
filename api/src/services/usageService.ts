import { prisma } from "../database/db";
import { calculateStorageUsage } from "../utils/stats";
import Logger from "../utils/logger";

export class UsageService {
    private static instance: UsageService;

    private constructor() { }

    public static getInstance(): UsageService {
        if (!UsageService.instance) {
            UsageService.instance = new UsageService();
        }
        return UsageService.instance;
    }

    /**
     * Increment storage usage for a user
     */
    async incrementStorage(userAddress: string, bytes: number) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    storage_usage_bytes: BigInt(bytes)
                },
                update: {
                    storage_usage_bytes: {
                        increment: BigInt(bytes)
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to increment storage for user ${userAddress}:`, error);
        }
    }

    /**
     * Decrement storage usage for a user
     */
    async decrementStorage(userAddress: string, bytes: number) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    storage_usage_bytes: BigInt(0) // Should not happen if logic is correct
                },
                update: {
                    storage_usage_bytes: {
                        decrement: BigInt(bytes)
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to decrement storage for user ${userAddress}:`, error);
        }
    }

    /**
     * Increment files count
     */
    async incrementFiles(userAddress: string, count: number = 1) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    files_count: count
                },
                update: {
                    files_count: {
                        increment: count
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to increment files count for user ${userAddress}:`, error);
        }
    }

    /**
     * Decrement files count
     */
    async decrementFiles(userAddress: string, count: number = 1) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    files_count: 0
                },
                update: {
                    files_count: {
                        decrement: count
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to decrement files count for user ${userAddress}:`, error);
        }
    }

    /**
     * Increment contracts count
     */
    async incrementContracts(userAddress: string, count: number = 1) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    contracts_count: count
                },
                update: {
                    contracts_count: {
                        increment: count
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to increment contracts count for user ${userAddress}:`, error);
        }
    }

    /**
     * Decrement contracts count
     */
    async decrementContracts(userAddress: string, count: number = 1) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    contracts_count: 0
                },
                update: {
                    contracts_count: {
                        decrement: count
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to decrement contracts count for user ${userAddress}:`, error);
        }
    }

    /**
     * Increment templates count
     */
    async incrementTemplates(userAddress: string, count: number = 1) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    templates_count: count
                },
                update: {
                    templates_count: {
                        increment: count
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to increment templates count for user ${userAddress}:`, error);
        }
    }

    /**
     * Decrement templates count
     */
    async decrementTemplates(userAddress: string, count: number = 1) {
        try {
            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    templates_count: 0
                },
                update: {
                    templates_count: {
                        decrement: count
                    }
                }
            });
        } catch (error) {
            Logger.error(`Failed to decrement templates count for user ${userAddress}:`, error);
        }
    }

    /**
     * Recalculate and reset usage stats for a user
     * This is a "healing" function that can be called if numbers get out of sync
     * or for initialization.
     */
    async recalculateUserUsage(userAddress: string) {
        try {
            Logger.info(`Recalculating usage for user ${userAddress}...`);

            // Get stats from existing expensive calculation
            // Note: calculateStorageUsage returns { totalFiles, formTypesToTrack, storageUsage }
            const stats = await calculateStorageUsage(userAddress);

            const storage_used_bytes = stats.storageUsage;
            const filesCount = stats.totalFiles;
            const contractsCount = stats.formTypesToTrack.aqua_sign || 0;
            // Assuming templates are tracked similarly or we need to add logic if not
            // For now, let's use what we have or query directly if needed.
            const templatesCount = await prisma.aquaTemplate.count({
                where: { owner: userAddress },
            });

            await prisma.userUsage.upsert({
                where: { user_address: userAddress },
                create: {
                    user_address: userAddress,
                    storage_usage_bytes: BigInt(storage_used_bytes),
                    files_count: filesCount,
                    contracts_count: contractsCount,
                    templates_count: templatesCount
                },
                update: {
                    storage_usage_bytes: BigInt(storage_used_bytes),
                    files_count: filesCount,
                    contracts_count: contractsCount,
                    templates_count: templatesCount
                }
            });

            Logger.info(`Usage recalculation for user ${userAddress} completed.`);
            return {
                storage_usage_bytes: storage_used_bytes,
                files_count: filesCount,
                contracts_count: contractsCount,
                templates_count: templatesCount
            };
        } catch (error) {
            Logger.error(`Failed to recalculate usage for user ${userAddress}:`, error);
            throw error;
        }
    }

    /**
     * Creates a historical snapshot of current usage for the active subscription period.
     * Should be called at the end of a billing cycle or before subscription updates.
     */
    async createUsageSnapshot(userAddress: string) {
        try {
            const userUsage = await prisma.userUsage.findUnique({
                where: { user_address: userAddress }
            });

            if (!userUsage) {
                Logger.warn(`No usage data found for user ${userAddress} when creating snapshot.`);
                return null;
            }

            const subscription = await prisma.subscription.findFirst({
                where: {
                    user_address: userAddress,
                    status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED'] }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (!subscription) {
                Logger.warn(`No active subscription found for user ${userAddress} when creating snapshot.`);
                return null;
            }

            // Create the snapshot record
            const snapshot = await prisma.usageRecord.create({
                data: {
                    subscription_id: subscription.id,
                    user_address: userAddress,
                    storage_used_bytes: userUsage.storage_usage_bytes,
                    files_count: userUsage.files_count,
                    contracts_count: userUsage.contracts_count,
                    templates_count: userUsage.templates_count,
                    period_start: subscription.current_period_start,
                    period_end: subscription.current_period_end,
                    recorded_at: new Date()
                }
            });

            Logger.info(`Created usage snapshot for user ${userAddress}`);
            return snapshot;

        } catch (error) {
            Logger.error(`Error creating usage snapshot for user ${userAddress}:`, error);
            throw error;
        }
    }
}

export const usageService = UsageService.getInstance();
