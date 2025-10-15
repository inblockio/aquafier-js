import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { AdvancedMetricsResponse, DateRangeQuery, MetricsResponse } from '../models/types';

export default async function metricsController(fastify: FastifyInstance) {
    fastify.get('/metrics', async (request, reply) => {
  const nonce = request.headers['nonce']; // Headers are case-insensitive

        // Check if `nonce` is missing or empty
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce }
        });

        if (!session) {  
            return reply.code(403).send({ success: false, message: "Nounce  is invalid "+nonce  });
        }


        try {
            // Get start of today in UTC
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);

            // Get start of periods for active users
            const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            // Parallel queries for better performance
            const [
                // Core metrics
                totalUsers,
                newUsersToday,
                totalContracts,
                newContractsToday,
                totalRevisions,
                newRevisionsToday,
                totalFiles,
                newFilesToday,

                // Additional metrics
                activeUsers24h,
                activeUsers7d,
                activeUsers30d,
                totalTemplates,
                publicTemplates,
                totalSignatures,
                newSignaturesToday,
                totalWitnesses,
                newWitnessesToday,
                totalNotifications,
                unreadNotifications,
                newNotificationsToday,
            ] = await Promise.all([
                // Core metrics - Users
                prisma.users.count(),
                prisma.users.count({
                    where: { createdAt: { gte: startOfToday } },
                }),

                // Core metrics - Contracts
                prisma.contract.count(),
                prisma.contract.count({
                    where: { created_at: { gte: startOfToday } },
                }),

                // Core metrics - Revisions
                prisma.revision.count(),
                prisma.revision.count({
                    where: { createdAt: { gte: startOfToday } },
                }),

                // Core metrics - Files
                prisma.file.count(),
                prisma.file.count({
                    where: { createdAt: { gte: startOfToday } },
                }),

                // Active users
                prisma.users.count({
                    where: { updatedAt: { gte: last24Hours } },
                }),
                prisma.users.count({
                    where: { updatedAt: { gte: last7Days } },
                }),
                prisma.users.count({
                    where: { updatedAt: { gte: last30Days } },
                }),

                // Templates
                prisma.aquaTemplate.count(),
                prisma.aquaTemplate.count({
                    where: { public: true },
                }),

                // Signatures
                prisma.signature.count(),
                prisma.signature.count({
                    where: { createdAt: { gte: startOfToday } },
                }),

                // Witnesses
                prisma.witness.count(),
                prisma.witness.count({
                    where: { createdAt: { gte: startOfToday } },
                }),

                // Notifications
                prisma.notifications.count(),
                prisma.notifications.count({
                    where: { is_read: false },
                }),
                prisma.notifications.count({
                    where: { created_on: { gte: startOfToday } },
                }),
            ]);

            // Calculate growth percentages
            const calculateGrowth = (newToday: number, total: number): string => {
                if (total === 0) return '0%';
                const percentage = ((newToday / total) * 100).toFixed(2);
                return `+${percentage}%`;
            };

            // Calculate averages
            const revisionsPerContract = totalContracts > 0
                ? (totalRevisions / totalContracts).toFixed(2)
                : '0';

            const filesPerRevision = totalRevisions > 0
                ? (totalFiles / totalRevisions).toFixed(2)
                : '0';

            const contractsPerUser = totalUsers > 0
                ? (totalContracts / totalUsers).toFixed(2)
                : '0';

            const metrics: MetricsResponse = {
                users: {
                    total: totalUsers,
                    newToday: newUsersToday,
                    growth: calculateGrowth(newUsersToday, totalUsers),
                },
                contracts: {
                    total: totalContracts,
                    newToday: newContractsToday,
                    growth: calculateGrowth(newContractsToday, totalContracts),
                },
                revisions: {
                    total: totalRevisions,
                    newToday: newRevisionsToday,
                    growth: calculateGrowth(newRevisionsToday, totalRevisions),
                },
                files: {
                    total: totalFiles,
                    newToday: newFilesToday,
                    growth: calculateGrowth(newFilesToday, totalFiles),
                },
                additionalMetrics: {
                    activeUsers: {
                        last24Hours: activeUsers24h,
                        last7Days: activeUsers7d,
                        last30Days: activeUsers30d,
                    },
                    templates: {
                        total: totalTemplates,
                        publicTemplates: publicTemplates,
                    },
                    signatures: {
                        total: totalSignatures,
                        newToday: newSignaturesToday,
                    },
                    witnesses: {
                        total: totalWitnesses,
                        newToday: newWitnessesToday,
                    },
                    notifications: {
                        total: totalNotifications,
                        unread: unreadNotifications,
                        newToday: newNotificationsToday,
                    },
                    averages: {
                        revisionsPerContract,
                        filesPerRevision,
                        contractsPerUser,
                    },
                },
                timestamp: new Date().toISOString(),
            };
            return reply.code(200).send({ data: metrics })
            // res.json(metrics);
        } catch (error) {
            console.error('Error fetching metrics:', error);
            reply.code(500).send({
                error: 'Failed to fetch metrics',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }

    })



    /**
     * Example usage
     * # Get all tables for last 30 days (default)
        GET /metrics/range

        # Specific date range for all tables
        GET /metrics/range?startDate=2024-01-01&endDate=2024-12-31

        # Specific tables only
        GET /metrics/range?tables=users,contract,revision

        # Combination
        GET /metrics/range?startDate=2024-01-01&endDate=2024-12-31&tables=users,notifications,signature
     */

    fastify.get<{ Querystring: DateRangeQuery }>('/metrics/range', async (request, reply) => {


        const nonce = request.headers['nonce']; // Headers are case-insensitive

        // Check if `nonce` is missing or empty
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce }
        });

        if (!session) {  
            return reply.code(403).send({ success: false, message: "Nounce  is invalid "+nonce  });
        }

        
        try {
            const { startDate, endDate, tables } = request.query;

            // Parse dates or use defaults
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            // Validate dates
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return reply.code(400).send({
                    error: 'Invalid date format',
                    message: 'Please provide dates in ISO format (e.g., 2024-01-01 or 2024-01-01T00:00:00Z)',
                });
            }

            if (start > end) {
                return reply.code(400).send({
                    error: 'Invalid date range',
                    message: 'Start date must be before end date',
                });
            }

            // Define available tables and their timestamp fields
            const availableTables = {
                users: 'createdAt',
                contract: 'created_at',
                revision: 'createdAt',
                file: 'createdAt',
                aquaTemplate: 'createdAt',
                signature: 'createdAt',
                witness: 'createdAt',
                notifications: 'created_on',
                aquaForms: 'createdAt',
                latest: 'createdAt',
                siweSession: 'createdAt',
                verificationData: 'created_on',
                userAttestationAddresses: 'createdAt',
                aquaTemplateFields: 'createdAt',
                fileIndex: 'createdAt',
                fileName: 'createdAt',
                link: 'createdAt',
                witnessEvent: 'createdAt',
                merkleNodes: 'createdAt',
                settings: 'createdAt',
                verificationAttempt: 'createdAt',
                dNSClaimVerificationOne: 'createdAt',
            };

            // Determine which tables to query
            const requestedTables = tables
                ? tables.split(',').map(t => t.trim()).filter(t => t in availableTables)
                : Object.keys(availableTables);

            if (requestedTables.length === 0) {
                return reply.code(400).send({
                    error: 'Invalid tables',
                    message: `Valid tables are: ${Object.keys(availableTables).join(', ')}`,
                });
            }

            // Build queries for each table
            const metricsPromises = requestedTables.map(async (tableName) => {
                const timestampField = availableTables[tableName as keyof typeof availableTables];
                const model = prisma[tableName as keyof typeof prisma] as any;

                const [total, inRange] = await Promise.all([
                    model.count(),
                    model.count({
                        where: {
                            [timestampField]: {
                                gte: start,
                                lte: end,
                            },
                        },
                    }),
                ]);

                const percentage = total > 0 ? ((inRange / total) * 100).toFixed(2) : '0.00';

                return {
                    tableName,
                    total,
                    inRange,
                    percentage: `${percentage}%`,
                };
            });

            const tableMetrics = await Promise.all(metricsPromises);

            // Calculate summary
            const totalRecordsAcrossAllTables = tableMetrics.reduce((sum, m) => sum + m.total, 0);
            const totalRecordsInRange = tableMetrics.reduce((sum, m) => sum + m.inRange, 0);

            const response: AdvancedMetricsResponse = {
                dateRange: {
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
                tables: tableMetrics.sort((a, b) => b.inRange - a.inRange), // Sort by records in range
                summary: {
                    totalRecordsAcrossAllTables,
                    totalRecordsInRange,
                },
                timestamp: new Date().toISOString(),
            };

            return reply.code(200).send({ data: response });
        } catch (error) {
            console.error('Error fetching advanced metrics:', error);
            return reply.code(500).send({
                error: 'Failed to fetch metrics',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

}