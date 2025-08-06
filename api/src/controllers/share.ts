import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { Settings } from '@prisma/client';
import { SessionQuery, ShareRequest, SiweRequest } from '../models/request_models';
// import { verifySiweMessage } from '../utils/auth_utils';
import { AquaTree, FileObject, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties } from 'aqua-js-sdk';
import { getHost, getPort } from '../utils/api_utils';
import {  fetchAquaTreeWithForwardRevisions, saveAquaTree } from '../utils/revisions_utils';
import { SYSTEM_WALLET_ADDRESS } from '../models/constants';
import { sendToUserWebsockerAMessage } from './websocketController';
import WebSocketActions from '../constants/constants';
import { createAquaTreeFromRevisions } from '../utils/revisions_operations_utils';

export default async function shareController(fastify: FastifyInstance) {

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
                return reply.code(412).send({ success: false, message: "The aqua tree share contract does not exist" });

            }

            if (contractData?.receiver?.toLowerCase() != SYSTEM_WALLET_ADDRESS && contractData?.receiver?.trim().toLocaleLowerCase() != session.address.trim().toLowerCase()) {
                return reply.code(401).send({ success: false, message: "The aqua tree is not shared with you receiver == "+contractData?.receiver +"=="+session.address });
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
            let revision_pubkey_hash = `${contractData.sender}_${contractData.latest}`
            //  console.log(`revision_pubkey_hash == > ${revision_pubkey_hash}`);

            if (contractData.option == "latest") {
                let [_anAquaTree, _fileObject] = await fetchAquaTreeWithForwardRevisions(revision_pubkey_hash, url)

                let orderRevisionPrpoerties = reorderAquaTreeRevisionsProperties(_anAquaTree)
                let sortedAquaTree = OrderRevisionInAquaTree(orderRevisionPrpoerties)

                anAquaTree = sortedAquaTree
                fileObject = _fileObject

            } else {
                let [_anAquaTree, _fileObject] = await createAquaTreeFromRevisions(revision_pubkey_hash, url)
                let orderRevisionPrpoerties = reorderAquaTreeRevisionsProperties(_anAquaTree)
                let sortedAquaTree = OrderRevisionInAquaTree(orderRevisionPrpoerties)

                anAquaTree = sortedAquaTree
                fileObject = _fileObject

            }
            // let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)

            //  console.log(`Aqua tree ${JSON.stringify(sortedAquaTree)}`);

            displayData.push({
                aquaTree: anAquaTree,
                fileObject: fileObject
            })

            // return aqua tree
            // return displayData
            return reply.code(200).send({
                success: true, data: {
                    displayData: displayData,
                    contractData: contractData
                }
            });

        } catch (error) {
            console.error("Error fetching session:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    fastify.post('/share_data', async (request, reply) => {


        const { hash, recipient, latest, option, genesis_hash, file_name } = request.body as ShareRequest;

        // Read `nonce` from headers
        const nonce = request.headers['nonce']; // Headers are case-insensitive

        // Check if `nonce` is missing or empty
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce: nonce }
        });

        if (session == null) {
            return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
        }

        if (recipient == null || recipient == "") {
            return reply.code(403).send({ success: false, message: "Recipient need to specified" });
        }


        let findRevision = await prisma.revision.findFirst({
            where: {
                pubkey_hash: `${session.address}_${latest}`
            }
        })
        if (findRevision == null) {
            return reply.code(406).send({ success: false, message: "revision with hash  is invalid" });
        }

        //validation to check owner is the one sharings
        if (findRevision.pubkey_hash.split("_")[0] != session.address) {
            return reply.code(406).send({ success: false, message: `latest ${latest}  does not belong ${session.address} ` });
        }

        //insert into contract
        await prisma.contract.create({
            data: {
                hash: hash, //identifier
                genesis_hash: genesis_hash,
                receiver: recipient,
                sender: session.address,
                latest: latest,
                option: option,
                reference_count: 1,
                file_name: file_name
            }
        });

        // Create notification for recipient about the shared document
        await prisma.notifications.create({
            data: {
                sender: session.address,
                receiver: recipient,
                content: `A new document has been shared with you by ${session.address}`,
                navigate_to: `/app/shared-contracts`,
                is_read: false,
                created_on: new Date()
            }
        });

        //trigger the other party to refetch explorer files
        sendToUserWebsockerAMessage(recipient, WebSocketActions.REFETCH_SHARE_CONTRACTS)

        return reply.code(200).send({ success: true, message: "share contract created successfully." });

    });



    fastify.put('/contracts/:hash', async (request, reply) => {
        // Extract the hash parameter from the URL
        const { hash } = request.params as { hash: string };
        const { recipient, latest, option } = request.body as ShareRequest;
        if (hash == null || hash == undefined || hash == "") {
            return reply.code(406).send({ success: false, message: "hash not found in url" });
        }
        const nonce = request.headers['nonce'];

        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        try {
            const session = await prisma.siweSession.findUnique({
                where: { nonce: nonce }
            });

            if (session == null) {
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            // Check if `hash` is missing or empty
            if (hash == null || hash == "") {
                return reply.code(403).send({ success: false, message: "Hash need to specified" });
            }

            // Update the contract
            await prisma.contract.update({
                where: {
                    hash: hash
                },
                data: {
                    latest: latest,
                    option: option,
                    receiver: recipient
                }
            });

            // Notify the recipient of the contract update
            await prisma.notifications.create({
                data: {
                    sender: session.address,
                    receiver: recipient,
                    content: `A shared document contract has been updated by ${session.address}`,
                    navigate_to:"",
                    is_read: false,
                    created_on: new Date()
                }
            });

            // Trigger the other party to refetch explorer files
            sendToUserWebsockerAMessage(recipient, WebSocketActions.REFETCH_SHARE_CONTRACTS);

            return reply.code(200).send({ success: true, message: "Share contract updated successfully." });
        } catch (error) {
            console.error("Error updating contract:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    fastify.get('/contracts/:genesis_hash', async (request, reply) => {
        const { genesis_hash } = request.params as { genesis_hash: string };
        // Add authorization
        const nonce = request.headers['nonce'];
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }
        const session = await prisma.siweSession.findUnique({
            where: { nonce: nonce }
        });
        if (session == null) {
            return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
        }
        // Get all contracts with the specified genesis hash
        const contracts = await prisma.contract.findMany({
            where: {
                genesis_hash: genesis_hash,
                sender: {
                    equals: session?.address,
                    mode: 'insensitive'
                }
            }
        });
        return reply.code(200).send({ success: true, contracts });
    })


    fastify.delete('/contracts/:hash', async (request, reply) => {

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
                where: { nonce: nonce }
            });

            if (session == null) {
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            // Check if `hash` is missing or empty
            if (hash == null || hash == "") {
                return reply.code(403).send({ success: false, message: "Hash need to specified" });
            }
            // Query the contract first, if contract.sender === session.address
            const contract = await prisma.contract.findFirst({
                where: {
                    hash: hash
                }
            });
            if (contract == null) {
                return reply.code(404).send({ success: false, message: "Contract not found" });
            }
            if (contract.sender !== session.address) {
                return reply.code(403).send({ success: false, message: "Unauthorized: You are not the owner of this contract" });
            }

            // Delete the contract
            await prisma.contract.delete({
                where: {
                    hash: hash
                }
            });

            return reply.code(200).send({ success: true, message: "Share contract deleted successfully." });
        } catch (error) {
            console.error("Error deleting contract:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Create an endpoint for filtering contracts, ie filter by sender, receiver, hash, etc
    fastify.get('/contracts', async (request, reply) => {
        const { sender, receiver, hash, genesis_hash, ...otherParams } = request.query as { 
            sender?: string, 
            receiver?: string, 
            hash?: string, 
            genesis_hash?: string,
            [key: string]: string | undefined 
        };

        // Check if at least one search parameter is provided
        if (!sender && !receiver && !hash && !genesis_hash && Object.keys(otherParams).length === 0) {
            return reply.code(400).send({ success: false, message: "Missing required parameters" });
        }

        const nonce = request.headers['nonce'];

        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce: nonce }
        });

        if (session == null) {
            return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
        }

        // Build dynamic where clause based on provided parameters
        let whereClause: any = {};
        
        if (sender && receiver) {
            whereClause = {
                OR: [
                    { sender: { equals: sender, mode: 'insensitive' } },
                    { receiver: { equals: receiver, mode: 'insensitive' } }
                ]
            };
        } else if (sender) {
            whereClause.sender = {
                equals: sender,
                mode: 'insensitive'
            };
        } else if (receiver) {
            whereClause.receiver = {
                equals: receiver,
                mode: 'insensitive'
            };
        }
        
        if (hash) {
            whereClause.hash = hash;
        }
        
        if (genesis_hash) {
            whereClause.genesis_hash = {
                contains: genesis_hash,
                mode: 'insensitive'
            };
        }
        
        // Handle any additional search parameters dynamically
        for (const [key, value] of Object.entries(otherParams)) {
            if (value !== undefined) {
                // For string fields that should be case insensitive
                if (['latest'].includes(key)) {
                    whereClause[key] = {
                        equals: value,
                        mode: 'insensitive'
                    };
                } else {
                    whereClause[key] = value;
                }
            }
        }

        // console.log('Query parameters:', JSON.stringify(whereClause, null, 2));
        
        // Enable query logging for this specific query
        // const contracts = await prisma.$transaction(async (tx) => {
        //     // Log the query being executed
        //     const result = await tx.contract.findMany({
        //         where: whereClause
        //     });
        //     return result;
        // }, {
        //     timeout: 10000,
        //     // This enables logging for this transaction
        //     log: ['query']
        // });

        const contracts = await prisma.$transaction(async (tx) => {
            const result = await tx.contract.findMany({
                where: whereClause
            });
            return result;
        }, {
            timeout: 10000
        });
        
        // console.log('Found contracts:', contracts.length);
        return reply.code(200).send({ success: true, contracts });
    });

    // Original, DO NOT DELETE
    // fastify.get('/contracts', async (request, reply) => {
    //     const { sender, receiver, hash } = request.query as { sender?: string, receiver?: string, hash?: string };

    //     if (!sender && !receiver && !hash) {
    //         return reply.code(400).send({ success: false, message: "Missing required parameters" });
    //     }

    //     const nonce = request.headers['nonce'];

    //     if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
    //         return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
    //     }

    //     const session = await prisma.siweSession.findUnique({
    //         where: { nonce: nonce }
    //     });

    //     if (session == null) {
    //         return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
    //     }

    //     const contracts = await prisma.contract.findMany({
    //         where: {
    //             sender: {
    //                 equals: sender,
    //                 mode: 'insensitive'
    //             },
    //             receiver: {
    //                 equals: receiver,
    //                 mode: 'insensitive'
    //             },
    //             hash: hash
    //         }
    //     });
    //     return reply.code(200).send({ success: true, contracts });
    // });


}