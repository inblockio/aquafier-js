import { FastifyInstance } from "fastify";
import { prisma } from "../database/db";

interface GetDNSClaimParams {
    wallet_address: string;
}

export default async function DNSClaimVerificationController(fastify: FastifyInstance) {

    fastify.get<{ Params: GetDNSClaimParams }>('/api/dns_claim_verification/:wallet_address', async (request, reply) => {
        try {
            const { wallet_address } = request.params;

            // Get DNS claim verification data for the wallet address
            const dnsClaimVerification = await prisma.dNSClaimVerificationOne.findMany({
                where: {
                    wallet_address: wallet_address
                },
                orderBy: {
                    last_verified: 'desc'
                }
            });

            if (!dnsClaimVerification || dnsClaimVerification.length === 0) {
                return reply.status(404).send({
                    error: 'No DNS claim verification found for this wallet address'
                });
            }

            return reply.send({
                success: true,
                data: dnsClaimVerification
            });

        } catch (error: any) {
            fastify.log.error('Error fetching DNS claim verification:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });

    fastify.post<{ Body: { wallet_address: string; domain?: string } }>('/api/dns_claim_verification', async (request, reply) => {
        try {
            const { wallet_address, domain } = request.body;

            if (!wallet_address) {
                return reply.status(400).send({
                    error: 'wallet_address is required'
                });
            }

            // Create a dummy DNS claim verification entry
            const dummyVerificationLogs = {
                domain: domain || 'example.com',
                dns_records: [
                    {
                        type: 'TXT',
                        name: '_aqua-verification',
                        value: `aqua-verify=${wallet_address}`,
                        verified: true,
                        timestamp: new Date().toISOString()
                    }
                ],
                verification_steps: [
                    'DNS record lookup initiated',
                    'TXT record found',
                    'Wallet address verified',
                    'Domain ownership confirmed'
                ],
                verification_time: new Date().toISOString()
            };

            const newDnsClaimVerification = await prisma.dNSClaimVerificationOne.create({
                data: {
                    wallet_address: wallet_address,
                    verification_logs: dummyVerificationLogs,
                    verification_status: 'verified',
                    is_verified: true,
                    is_domain_verified: true,
                    last_verified: new Date()
                }
            });

            return reply.status(201).send({
                success: true,
                message: 'DNS claim verification created successfully',
                data: newDnsClaimVerification
            });

        } catch (error: any) {
            fastify.log.error('Error creating DNS claim verification:', error);
            return reply.status(500).send({
                error: 'Internal server error'
            });
        }
    });
}