import { canDeleteRevision, deleteRevisionAndChildren } from '../utils/quick_revision_utils';
import { prisma } from '../database/db';
import { DeleteRevision, FetchAquaTreeRequest, SaveRevision, SaveRevisionForUser } from '../models/request_models';
import { getHost, getPort } from '../utils/api_utils';
import { createAquaTreeFromRevisions, deleteAquaTree, fetchAquatreeFoUser, FetchRevisionInfo, findAquaTreeRevision, getSignatureAquaTrees, getUserApiFileInfo, removeFilePathFromFileIndex, saveAquaTree, saveARevisionInAquaTree, validateAquaTree } from '../utils/revisions_utils';
// import { formatTimestamp } from '../utils/time_utils';
// import { AquaForms, FileIndex, Signature, WitnessEvent, Revision as RevisonDB } from 'prisma/client';
import Aquafier, { AquaTree, FileObject, getAquaTreeFileName, getGenesisHash, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import * as fs from "fs"
import path from 'path';
import { SYSTEM_WALLET_ADDRESS } from '..//models/constants';
import { getFileUploadDirectory, streamToBuffer } from '../utils/file_utils';
import { randomUUID } from 'crypto';
import { sendToUserWebsockerAMessage } from './websocketController';
import WebSocketActions from '../constants/constants';

export default async function revisionsController(fastify: FastifyInstance) {
    // fetch aqua tree from a revision hash
    fastify.post('/tree/data', async (request, reply) => {

        const { latestRevisionHash } = request.body as FetchAquaTreeRequest;
        // fetch all from latetst

        let latestHashInDb = await prisma.latest.findFirst({
            where: {
                hash: latestRevisionHash
                // user: session.address
            }
        });

        if (latestHashInDb == null) {
            return reply.code(403).send({ message: "hash does not exist in latet revision", data: [] });
        }

        // traverse from the latest to the genesis of each 
        //  console.log(`data ${JSON.stringify(latestRevisionHash, null, 4)}`)


        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []


        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'
        // if(backendurl)
        // Construct the full URL
        const url = `${protocol}://${host}`;

        // // Get the host from the request headers, with more robust fallback
        // const host = request.headers.host ||
        //     request.headers['x-forwarded-host'] ||
        //     `${getHost()}:${getPort()}`;

        // // Get the protocol with more robust detection
        // const protocol = Array.isArray(request.headers['x-forwarded-proto']) 
        //     ? request.headers['x-forwarded-proto'][0] 
        //     : (request.headers['x-forwarded-proto'] as string | undefined) ||
        //       request.protocol ||
        //       'https';  // Default to https

        // // Construct the full URL
        // const url = `${protocol}://${host}`;

        try {

            const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url)

            ////  console.log(`----> ${JSON.stringify(anAquaTree, null, 4)}`)
            let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)
            displayData.push({
                aquaTree: sortedAquaTree,
                fileObject: fileObject
            })
        } catch (e) {
            return reply.code(500).send({ success: false, message: `Error ${e}` });

        }

        return reply.code(200).send({ data: displayData })

    });

    //save revision for other user 
    fastify.post('/tree/user', async (request, reply) => {
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
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            const revisionData = request.body as SaveRevisionForUser

            if (!revisionData.revision) {
                return reply.code(400).send({ success: false, message: "revision Data is required" });
            }
            if (!revisionData.revisionHash) {
                return reply.code(400).send({ success: false, message: "revision hash is required" });
            }

            if (!revisionData.revision.revision_type) {
                return reply.code(400).send({ success: false, message: "revision type is required" });
            }

            if (!revisionData.revision.local_timestamp) {
                return reply.code(400).send({ success: false, message: "revision timestamp is required" });
            }

            if (!revisionData.revision.previous_verification_hash) {
                return reply.code(400).send({ success: false, message: "previous revision hash  is required" });
            }

            if (revisionData.address === session.address) {
                return reply.code(202).send({ success: false, message: "use /tree to save revision for a specific user /tree/user is for different address" });

            }


            const [_httpCode, _message] = await saveARevisionInAquaTree(revisionData, revisionData.address);

            // if (httpCode != 200 && httpCode !== 407) {
            //     return reply.code(httpCode).send({ success: false, message: message });
            // }


            //trigger the other party to refetch explorer files
            sendToUserWebsockerAMessage(revisionData.address, WebSocketActions.REFETCH_FILES)


            return reply.code(200).send({
                success: true,
            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: "Failed to process revisions" });
        }
    });


    // save revision for the user in the session
    fastify.post('/tree', async (request, reply) => {
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
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            const revisionData = request.body as SaveRevision

            if (!revisionData.revision) {
                return reply.code(400).send({ success: false, message: "revision Data is required" });
            }
            if (!revisionData.revisionHash) {
                return reply.code(400).send({ success: false, message: "revision hash is required" });
            }

            if (!revisionData.revision.revision_type) {
                return reply.code(400).send({ success: false, message: "revision type is required" });
            }

            if (!revisionData.revision.local_timestamp) {
                return reply.code(400).send({ success: false, message: "revision timestamp is required" });
            }

            if (!revisionData.revision.previous_verification_hash) {
                return reply.code(400).send({ success: false, message: "previous revision hash  is required" });
            }



            const [httpCode, message] = await saveARevisionInAquaTree(revisionData, session.address);

            if (httpCode != 200) {
                return reply.code(httpCode).send({ success: false, message: message });
            }


            // fetch all from latetst

            let latest = await prisma.latest.findMany({
                where: {
                    user: session.address
                }
            });

            if (latest.length == 0) {
                return reply.code(200).send({ data: [] });
            }


            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            let displayData = await fetchAquatreeFoUser(url, latest)

            return reply.code(200).send({
                success: true,
                message: "Revisions stored successfully",
                data: displayData

            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: "Failed to process revisions" });
        }
    });

    fastify.delete('/tree', async (request, reply) => {
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

        const revisionDataPar = request.body as DeleteRevision;

        if (!revisionDataPar.revisionHash) {
            return reply.code(400).send({ success: false, message: "revision hash is required" });
        }




        // Get the host from the request headers
        const host = `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        const revisionHashestoDelete: Array<string> = revisionDataPar.revisionHash.split(",")

        for (let i = 0; i < revisionHashestoDelete.length; i++) {

            let currentHash = revisionHashestoDelete[i]
            let [code, reason] = await deleteAquaTree(currentHash, session.address, url)
            if (code != 200) {

                return reply.code(code).send({ message: reason });
            }
        }

        return reply.code(200).send({ message: "revision hash is required" });

    });

    fastify.delete('/tree/revisions/:hash', async (request, reply) => {
        try {
            const nonce = request.headers['nonce']; // Headers are case-insensitive
            const { hash } = request.params as { hash: string };

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            // Retrieve session from nonce
            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(401).send({ error: 'Unauthorized: Invalid session' });
            }


            // Check if the user is allowed to delete this revision
            const canDelete = await canDeleteRevision(hash, session.address);
            if (!canDelete) {
                return reply.code(403).send({
                    success: false,
                    message: 'Forbidden: You do not have permission to delete this revision'
                });
            }

            // Perform the deletion
            const result = await deleteRevisionAndChildren(hash, session.address);

            if (result.success) {
                return reply.code(200).send({
                    success: true,
                    message: `Successfully deleted revision and its dependencies`,
                    deleted: result.deleted,
                    details: result.details
                });
            } else {
                return reply.code(500).send({
                    success: false,
                    message: 'Error occurred during deletion',
                    deleted: result.deleted,
                    details: result.details
                });
            }

        } catch (error: any) {
            console.error("Error in delete operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting revision: ${error.message}`,
                details: error
            });
        }
    });


    fastify.get('/tree/user_signatures', async (request, reply) => {

        try {

            const nonce = request.headers['nonce']; // Headers are case-insensitive

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            // Method 1: Check Origin header (used in CORS requests)
            const origin = request.headers.origin;

            // throw Error(`Orgin ${origin}`)
            // Get the host from the request headers
            const host = `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;



            let signatureAquaTrees: Array<{
                aquaTree: AquaTree,
                fileObject: FileObject[]
            }> = await getSignatureAquaTrees(session.address, url)

            return reply.code(200).send({
                success: true,
                data: signatureAquaTrees
            });

        } catch (error: any) {
            console.error("Error in delete operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting revision: ${error.message}`,
                details: error
            });
        }
    });
}
