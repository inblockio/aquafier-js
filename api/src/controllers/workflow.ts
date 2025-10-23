import Aquafier, { AquaTree, AquaTreeWrapper, cliGreenify, cliRedify, FileObject, LogData, LogType, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { getFileUploadDirectory, persistFile, streamToBuffer } from '../utils/file_utils';
import path from 'path';
import JSZip from "jszip";
import { randomUUID } from 'crypto';
import * as fs from "fs"
import {
    deleteAquaTree,
    deleteAquaTreeFromSystem,
    fetchAquatreeFoUser,
    getUserApiFileInfo,
    getUserApiWorkflowFileInfo,
    isWorkFlowData,
    processAquaFiles,
    processAquaMetadata,
    saveAquaTree,
    transferRevisionChainData
} from '../utils/revisions_utils';
import { getHost, getPort } from '../utils/api_utils';
import { DeleteRevision } from '../models/request_models';
import { fetchCompleteRevisionChain } from '../utils/quick_utils';
import { mergeRevisionChain } from '../utils/quick_revision_utils';
import { getGenesisHash, removeFilePathFromFileIndex, validateAquaTree } from '../utils/aqua_tree_utils';
import WebSocketActions from '../constants/constants';
import { sendToUserWebsockerAMessage } from './websocketController';
import { saveAttestationFileAndAquaTree } from '../utils/server_utils';
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




            // this can be optimized by getting all from revisions with prefix of user wallet address.
            Logger.info(`URL: ${cliRedify(url)}, Address: ${cliGreenify(session.address)}`);

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