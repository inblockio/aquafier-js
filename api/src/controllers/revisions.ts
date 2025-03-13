import { prisma } from '@/database/db';
import { SaveRevision } from '@/models/request_models';
import { WitnessEvent } from '@prisma/client';
import { Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';

export default async function revisionsController(fastify: FastifyInstance) {
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


            let oldFilePubKeyHash = `${session.address}_${revisionData.revision.previous_verification_hash}`
            let filePubKeyHash = `${session.address}_${revisionData.revisionHash}`

            await prisma.latest.upsert({
                data: {
                    hash: filepubkeyhash,
                    user: session.address,
                }
            });


            // Insert new revision into the database
            await prisma.revision.create({
                data: {
                    pubkey_hash: filepubkeyhash,
                    // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                    nonce: revisionData.file_nonce || "",
                    shared: [],
                    // contract: revisionData.witness_smart_contract_address
                    //     ? [{ address: revisionData.witness_smart_contract_address }]
                    //     : [],
                    previous: revisionData.previous_verification_hash || null,
                    // children: {},
                    local_timestamp: localTimestamp,
                    revision_type: revisionData.revision_type,
                    verification_leaves: revisionData.witness_merkle_proof || [],

                },
            });

            // const { revisions, file_index } = request.body as {
            //     revisions: Record<string, any>;
            //     file_index: Record<string, string>;
            // };

            // if (!revisions || typeof revisions !== 'object') {
            //     return reply.code(400).send({ error: "Invalid revisions data" });
            // }

            // let revision: Revision = {
            //     previous_verification_hash: '',
            //     local_timestamp: '',
            //     revision_type: 'witness',
            //     witness_merkle_proof: [],
            //     witness_merkle_root: "",
            //     witness_network: "",
            //     witness_timestamp: 1,
            //     witness_sender_account_address: "",
            //     witness_smart_contract_address: "",
            //     witness_transaction_hash: ""
            // }

            // let witnessEvent: WitnessEvent = {
            //     witnessMerkleRoot: '',
            //     witnessTimestamp: new Date(),
            //     witnessNetwork: '',
            //     witnessSmartContractAddress: '',
            //     witnessTransactionHash: '',
            //     witnessSenderAccountAddress: ''
            // }

            // console.log("Received Revisions:", revisions);
            // console.log("Received File Index:", file_index);

            // You can process and store the revisions here (e.g., database insert, file system storage)
            // Example: Saving to an in-memory map (just for demonstration)
            // const revisionStore: Record<string, any> = {};

            // for (const [revisionHash, revisionData] of Object.entries(revisions)) {
            //     revisionStore[revisionHash] = revisionData;
            // }

            return reply.code(201).send({
                success: true,
                message: "Revisions stored successfully",
                total_revisions: Object.keys(revisions).length,
            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: "Failed to process revisions" });
        }
    });
}
