import { canDeleteRevision, deleteRevisionAndChildren } from '../utils/quick_revision_utils';
import { prisma } from '../database/db';
import { DeleteRevision, FetchAquaTreeRequest, SaveRevision, SaveRevisionForUser } from '../models/request_models';
import { getHost, getPort } from '../utils/api_utils';
import {  deleteAquaTree, fetchAquatreeFoUser, getSignatureAquaTrees, getUserApiFileInfo, saveARevisionInAquaTree } from '../utils/revisions_utils';
import { AquaTree, FileObject, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { sendToUserWebsockerAMessage } from './websocketController';
import WebSocketActions from '../constants/constants';
import { createAquaTreeFromRevisions } from '../utils/revisions_operations_utils';

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

     

        try {

            const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url)

            let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)
            // console.log("Attestation: ", JSON.stringify(sortedAquaTree, null, 4))
            // try{
            //     const revisionHashes = Object.keys(sortedAquaTree.revisions)
            //     const firstRevision = sortedAquaTree.revisions[revisionHashes[0]]
            //     console.log("First revision: ", JSON.stringify(firstRevision, null, 4))
            //     if(firstRevision.revision_type == "form" && firstRevision.forms_identity_claim_id){
            //         const claimerWalletAddress = firstRevision.forms_claim_wallet_address
            //         // Websocket message to the claimer
            //         sendToUserWebsockerAMessage(claimerWalletAddress, WebSocketActions.REFETCH_FILES)
            //     }
                
            // }
            // catch(e){
            //     console.log(`Error ${e}`);
            // }
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

            if(!revisionData.orginAddress){
                 return reply.code(400).send({ success: false, message: "origin address not defined" });
            }

            //  if(revisionData.orginAddress == revisionData.address    ){
            //      return reply.code(400).send({ success: false, message: "origin address cannot be the same as address " });
            // }

            //   if(revisionData.orginAddress == session.address    ){
            //      return reply.code(400).send({ success: false, message: "origin address cannot be the same as session address " });
            // }



// Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const [_httpCode, _message] = await saveARevisionInAquaTree(revisionData, revisionData.address, url);

            // if (httpCode != 200 && httpCode !== 407) {
            //     return reply.code(httpCode).send({ success: false, message: message });
            // }


            //trigger the other party to refetch explorer files
            sendToUserWebsockerAMessage(revisionData.address, WebSocketActions.REFETCH_FILES)


            return reply.code(200).send({
                success: true,
            });

        } catch (error : any) {
            request.log.error(error);
            return reply.code(500).send({ error: `Failed to process revisions other user ${error}` });
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


            if(!revisionData.orginAddress){
                 return reply.code(400).send({ success: false, message: "origin address not defined.." });
            }

// Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const [httpCode, message] = await saveARevisionInAquaTree(revisionData, session.address, url);

            if (httpCode != 200) {
                return reply.code(httpCode).send({ success: false, message: message });
            }


            // fetch all from latetst

            // let latest = await prisma.latest.findMany({
            //     where: {
            //         user: session.address
            //     }
            // });

            // if (latest.length == 0) {
            //     return reply.code(200).send({ data: [] });
            // }



            // let displayData = await fetchAquatreeFoUser(url, latest)

           let displayData = await getUserApiFileInfo(url,session.address )

            return reply.code(200).send({
                success: true,
                message: "Revisions stored successfully",
                data: displayData

            });

        } catch (error : any) {
            request.log.error(error);
            return reply.code(500).send({ error: `Failed to process revisions ${error}` });
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
        // const host = `${getHost()}:${getPort()}`;

        // // Get the protocol (http or https)
        // const protocol = 'https'

        // // Construct the full URL
        // const url = `${protocol}://${host}`;

        
 // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

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

;

 // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

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
