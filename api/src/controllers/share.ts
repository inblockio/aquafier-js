import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { Settings } from '@prisma/client';
import { SessionQuery, ShareRequest, SiweRequest } from '../models/request_models';
import { verifySiweMessage } from '@/utils/auth_utils';
import { AquaTree, FileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { getHost, getPort } from '@/utils/api_utils';
import { createAquaTreeFromRevisions, fetchAquaTreeWithForwardRevisions, saveAquaTree } from '@/utils/revisions_utils';

export default async function shareController(fastify: FastifyInstance) {
    // get current session

    fastify.get('/share_data/:hash', async (request, reply) => {

        // Extract the hash parameter from the URL
        const { hash } = request.params as { hash: string };
        if (hash == null || hash == undefined || hash == "") {
            return reply.code(406).send({ success: false, message: "hash not found in url" });

        }
        const nonce = request.headers['nonce'];

        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        try {
            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(401).send({ success: false, message: "Session not found" });
            }

            // Check if session is expired
            if (new Date(session.expirationTime!!) < new Date()) {
                return reply.code(401).send({ success: false, message: "Session expired" });
            }

            // check in contracts table if the current user has been granted access to the tree
            let contractData = await prisma.contract.findFirst({
                where: {
                    hash: hash
                }
            })

            if (contractData == null) {
                return reply.code(500).send({ success: false, message: "The aqua tree share cntract does not exist" });

            }

            if (contractData?.receiver != "everyone" && contractData?.receiver != session.address) {
                return reply.code(401).send({ success: false, message: "The aqua tree is not shared with you" });
            }

            // user has permission hence  fetch the enire aqua tree
            // if option is latest traverse tree into the future from the latest to the latest

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            let displayData: Array<{
                aquaTree: AquaTree,
                fileObject: FileObject[]
            }> = []

            let anAquaTree: AquaTree
            let fileObject: FileObject[]
            if (contractData.option == "latest") {
                [anAquaTree, fileObject] = await fetchAquaTreeWithForwardRevisions(contractData.latest!, url)
            } else {
                [anAquaTree, fileObject] = await createAquaTreeFromRevisions(contractData.latest!, url)

            }
            let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)

            displayData.push({
                aquaTree: sortedAquaTree,
                fileObject: fileObject
            })
            // save the aqua tree 
            await saveAquaTree(sortedAquaTree, session.address)

            // return aqua tree
            return displayData


        } catch (error) {
            console.error("Error fetching session:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    fastify.post('/share_data', async (request, reply) => {


        const { hash, recipient, latest, option } = request.body as ShareRequest;

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

        if (hash == null || hash == "" || recipient == null || recipient == "") {
            return reply.code(403).send({ success: false, message: "Hash and Recipient need to specified" });
        }


        let findRevision = await prisma.revision.findFirst({
            where: {
                pubkey_hash: latest
            }
        })
        if (findRevision == null) {
            return reply.code(406).send({ success: false, message: "Nounce  is invalid" });
        }

        //validation to check owner is the one sharings
        if (findRevision.pubkey_hash.split("_")[0] == session.address) {
            return reply.code(406).send({ success: false, message: `latest ${latest}  does not belong ${session.address} ` });
        }

        //insert into contract
        await prisma.contract.create({
            data: {
                hash: hash, //identifier
                receiver: recipient,
                sender: session.address,
                latest: latest,
                option: option,
                reference_count: 1
            }
        });

    });
}