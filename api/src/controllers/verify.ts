import { streamToBuffer } from "../utils/file_utils";
import Aquafier, { AquaTree, FileObject, Revision } from "aqua-js-sdk";
import { FastifyInstance } from "fastify";
import { ApiResponse, coerceIntoApiResponse, verifyProofApi } from "../utils/verify_dns_claim";
import { prisma } from "../database/db";

export default async function verifyController(fastify: FastifyInstance) {

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify', async (request, reply) => {

        try {
            const data: any = request.body

            // Type assertion and validation
            const aquaTree = data.aquaTree as AquaTree;
            const revision = data.revision as Revision;
            const revisionHash = data.revision_hash as string;
            let fileObjects: Array<FileObject> = []

            if (data.fileObjects) {
                fileObjects = data.fileObjects as Array<FileObject>
            }

            const aquafier = new Aquafier();

            let res = await aquafier.verifyAquaTreeRevision(aquaTree, revision, revisionHash, fileObjects)

            if (res.isOk()) {
                return reply.code(200).send({
                    data: res.data
                });

            } else {

                return reply.code(417).send({
                    data: res.data
                });
            }


        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({
                error: 'Error processing AquaTree',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }


    });

    fastify.post('/verify/file', async (request, reply) => {
        let aquafier = new Aquafier();

        try {
            const parts = request.parts();
            let aquaFileContent = null;
            let files = [];

            for await (const part of parts) {
                if (part.type === 'file') {
                    const buffer = await streamToBuffer(part.file);

                    if (part.fieldname === 'aqua_file') {
                        aquaFileContent = buffer.toString('utf-8');
                    } else {
                        // Store other files
                        files.push({
                            fieldname: part.fieldname,
                            filename: part.filename,
                            buffer: buffer
                        });
                    }
                }
            }

            if (!aquaFileContent) {
                return reply.code(400).send({ error: 'No Aqua Json file uploaded' });
            }

            if (files.length === 0) {
                return reply.code(400).send({ error: 'No files uploaded, please upload file next to aqua file' });
            }

            const aquaFileObjects: FileObject[] = files.map(file => ({
                fileContent: file.buffer.toString('utf-8'),
                fileName: file.filename,
                path: "./"
            }))

            const aquaTree = JSON.parse(aquaFileContent);

            let verificationResults = await aquafier.verifyAquaTree(aquaTree, aquaFileObjects)

            if (verificationResults.isOk()) {
                return reply.code(200).send({
                    results: verificationResults.data,
                    fileCount: files.length
                });
            } else {
                return reply.code(417).send({
                    results: verificationResults.data,
                    fileCount: files.length
                });
            }
        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed', details: error.message });
        }
    });

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify/tree', async (request, reply) => {

        try {
            const data: any = request.body
            // Type assertion and validation
            const aquaTree = data.aquaTree as AquaTree;

            let fileObjects: Array<FileObject> = []

            if (data.fileObjects) {
                fileObjects = data.fileObjects as Array<FileObject>
            }
            // Validate mandatory fields
            if (!aquaTree) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing aquaTree object'
                });
            }

            // Check mandatory nested fields
            if (!aquaTree.revisions || Object.keys(aquaTree.revisions).length === 0) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing or empty revisions'
                });
            }

            if (!aquaTree.file_index) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing file_index'
                });
            }

            if (!aquaTree.tree || !aquaTree.tree.hash) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing tree or tree hash'
                });
            }

            if (!aquaTree.treeMapping) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing treeMapping'
                });
            }
            const aquafier = new Aquafier();

            let res = await aquafier.verifyAquaTree(aquaTree, fileObjects)

            if (res.isOk()) {
                return reply.code(200).send({
                    data: res.data
                });

            } else {

                return reply.code(417).send({
                    data: res.data
                });
            }

        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({
                error: 'Error processing AquaTree',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.

    // Fastify endpoint implementation

    fastify.post('/verify/dns_claim', async (request: any, reply: any) => {
        try {
            const data: { domain: string, wallet: string, refresh?: boolean } = request.body as { domain: string, wallet: string, refresh?: boolean };

            // Validate input
            if (!data.domain || typeof data.domain !== 'string') {
                return reply.code(400).send({
                    error: 'Invalid input',
                    message: 'Domain is required and must be a string',
                    logs: [{
                        level: 'error',
                        message: 'Missing or invalid domain parameter',
                        details: { received: data }
                    }]
                });
            }

            if (!data.wallet || typeof data.wallet !== 'string') {
                return reply.code(400).send({
                    error: 'Invalid input',
                    message: 'Wallet is required and must be a string',
                    logs: [{
                        level: 'error',
                        message: 'Missing or invalid wallet parameter',
                        details: { received: data }
                    }]
                });
            }

            const existingVerification = await prisma.dNSClaimVerification.findFirst({
                where: {
                    wallet_address: data.wallet,
                    domain: data.domain
                }
            });

            let result: ApiResponse | null = null

            if (existingVerification) {
                if (data.refresh) {
                    result = await verifyProofApi(data.domain, 'wallet', data.wallet);
                    await prisma.dNSClaimVerification.update({
                        where: {
                            id: existingVerification.id
                        },
                        data: {
                            verification_logs: result as any,
                            verification_status: result.success ? 'verified' : 'failed',
                            is_verified: result.success,
                            is_domain_verified: result.dnssecValidated,
                            last_verified: new Date()
                        }
                    });
                } else {
                    result = coerceIntoApiResponse(existingVerification.verification_logs)
                }
            } else {
                result = await verifyProofApi(data.domain, 'wallet', data.wallet);

                await prisma.dNSClaimVerification.create({
                    data: {
                        wallet_address: data.wallet,
                        domain: data.domain,
                        verification_logs: result as any,
                        verification_status: result.success ? 'verified' : 'failed',
                        is_verified: result.success,
                        is_domain_verified: result.dnssecValidated,
                        last_verified: new Date()
                    }
                });
            }

            // Return appropriate status code based on result
            if (result.success) {
                return reply.code(200).send(result);
            } else {
                // Determine appropriate error code
                const hasRateLimitError = result.logs.some(log => log.message.includes('Rate limit'));
                const hasDnsError = result.logs.some(log => log.message.includes('DNS lookup failed'));
                const hasInvalidFormat = result.logs.some(log => log.message.includes('Invalid') || log.message.includes('Missing'));

                let statusCode = 422; // Unprocessable Entity (default for verification failures)

                if (hasRateLimitError) {
                    statusCode = 429; // Too Many Requests
                } else if (hasDnsError) {
                    statusCode = 404; // Not Found (DNS record doesn't exist)
                } else if (hasInvalidFormat) {
                    statusCode = 400; // Bad Request (invalid format)
                }

                return reply.code(statusCode).send(result);
            }

        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({
                error: 'Internal server error',
                message: 'Error processing DNS verification',
                details: error instanceof Error ? error.message : 'Unknown error',
                logs: [{
                    level: 'error',
                    message: 'Internal server error',
                    details: { error: error instanceof Error ? error.message : 'Unknown error' }
                }]
            });
        }
    });
}
