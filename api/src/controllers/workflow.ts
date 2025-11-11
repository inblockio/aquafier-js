import { AquaTree, FileObject } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import {
    getUserApiWorkflowFileInfo,
    isWorkFlowData} from '../utils/revisions_utils';
import { getHost, getPort } from '../utils/api_utils';
import Logger from "../utils/logger";
import { systemTemplateHashes } from '../models/constants';


/**
 * Registers Explorer-related HTTP routes on the provided Fastify instance.
 *
 * This controller attaches endpoints for importing, uploading, listing, deleting,
 * transferring, and merging AquaTree revisions and their associated files. Routes
 * include nonce-based authentication, multipart handling, ZIP and file processing,
 * interaction with the Prisma database, filesystem persistence, Aquafier operations,
 * and optional WebSocket notifications when cross-user events occur.
 *
 * Side effects:
 * - Persists records to the database (revisions, files, indices, names, etc.).
 * - Writes uploaded files to disk.
 * - May send WebSocket messages to notify other users.
 * - Calls external utilities to validate/process AquaTree data and fetch remote chains.
 *
 * HTTP behavior highlights:
 * - Returns 401/403 for missing or invalid nonce headers.
 * - Validates multipart/form-data and enforces file size limits (20MB or 200MB depending on endpoint).
 * - Uses appropriate HTTP status codes for validation, success, and error conditions.
 */
export default async function workflowsController(fastify: FastifyInstance) {




    // get file using file hash with pagination
    fastify.get('/workflows', async (request, reply) => {
        // file content from db
        // return as a blob

        try {

            // Read `nonce` from headers
            const nonce = request.headers['nonce']; // Headers are case-insensitive

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(403).send({ success: false, message: "Nonce is invalid" });
            }

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https';

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const paginatedData = await getUserApiWorkflowFileInfo(url, session.address)
            const data: Array<{
                aquaTree: AquaTree,
                fileObject: FileObject[]
            }> = [];

            for (const file of paginatedData.data) {
                const { workFlow, isWorkFlow } = isWorkFlowData(file.aquaTree!, systemTemplateHashes)
                Logger.info("Workflow check on workflow endpoint isWorkFlow = " + isWorkFlow + " name " + workFlow)
                if (isWorkFlow) {
                    data.push({
                        aquaTree: file.aquaTree!,
                        fileObject: file.fileObject
                    })
                }

            }

            return reply.code(200).send({
                success: true,
                message: 'Workflows retrieved successfully',
                data: data,
            });
        } catch (error) {
            Logger.error('Error fetching workflows:', error);
            return reply.code(500).send({
                success: false,
                message: 'Failed to retrieve workflows'
            });
        }
    });

}