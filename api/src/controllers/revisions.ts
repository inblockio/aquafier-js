import { prisma } from '@/database/db';
import { SaveRevision } from '@/models/request_models';
import { formatTimestamp } from '@/utils/time_utils';
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


            let existData = await prisma.latest.findFirst({
                where: {
                    hash: oldFilePubKeyHash
                }
            });

            if (existData == null) {
                return reply.code(401).send({ success: false, message: "previous  hash  not found" });

            }

            let filePubKeyHash = `${session.address}_${revisionData.revisionHash}`

            
            await prisma.latest.update({
                where: {
                    hash: oldFilePubKeyHash
                },
                data: {
                    hash: filePubKeyHash
                }

            });


            const existingRevision = await prisma.revision.findUnique({
                where: {
                    pubkey_hash: filePubKeyHash
                }
            });
            
            if (existingRevision) {
                // Handle the case where the revision already exists
                // Maybe return an error or update the existing record
                return reply.code(409).send({ success: false, message: "Revision with this hash already exists" });
            }

            // Insert new revision into the database
            await prisma.revision.create({
                data: {
                    pubkey_hash: filePubKeyHash,
                    nonce: revisionData.revision.file_nonce || "",
                    shared: [],
                    // contract: revisionData.witness_smart_contract_address
                    //     ? [{ address: revisionData.witness_smart_contract_address }]
                    //     : [],
                    previous: `${session.address}_${revisionData.revision.previous_verification_hash}`,
                    // children: {},
                    local_timestamp: formatTimestamp(revisionData.revision.local_timestamp), // revisionData.revision.local_timestamp,
                    revision_type: revisionData.revision.revision_type,
                    verification_leaves: revisionData.revision.leaves || [],

                },
            });

            if (revisionData.revision.revision_type == "form") {
                let revisioValue = Object.keys(revisionData);
                for (let formItem in revisioValue) {
                    if (formItem.startsWith("form_")) {
                        await prisma.aquaForms.create({
                            data: {
                                hash: filePubKeyHash,
                                key: formItem,
                                value: revisioValue[formItem],
                                type: typeof revisioValue[formItem]
                            }
                        });
                    }
                }
            }

            if (revisionData.revision.revision_type == "signature") {
                let signature = "";
                if (typeof revisionData.revision.signature == "string") {
                    signature = revisionData.revision.signature
                } else {
                    signature = JSON.stringify(revisionData.revision.signature)
                }


                //todo consult dalmas if signature_public_key needs tobe stored
                await prisma.signature.upsert({
                    where: {
                        hash: filePubKeyHash
                    },
                    update: {
                        reference_count: {
                            increment: 1
                        }
                    },
                    create: {
                        hash: filePubKeyHash,
                        signature_digest: signature,
                        signature_wallet_address: revisionData.revision.signature.wallet_address,
                        signature_type: revisionData.revision.signature_type,
                        signature_public_key : revisionData.revision.signature_public_key,
                        reference_count: 1
                    }
                });

            }


            if (revisionData.revision.revision_type == "witness") {

                await prisma.witness.upsert({
                    where: {
                        hash: filePubKeyHash
                    },
                    update: {
                        reference_count: {
                            increment: 1
                        }
                    },
                    create: {
                        hash: filePubKeyHash,
                        Witness_merkle_root: revisionData.revision.witness_merkle_root,
                        reference_count: 1  // Starting with 1 since this is the first reference
                    }
                });

                const witnessTimestamp = new Date(revisionData.revision.witness_timestamp!);
                await prisma.witnessEvent.create({
                    data: {
                        Witness_merkle_root: revisionData.revision.witness_merkle_root!,
                        Witness_timestamp: witnessTimestamp,
                        Witness_network: revisionData.revision.witness_network,
                        Witness_smart_contract_address: revisionData.revision.witness_smart_contract_address,
                        Witness_transaction_hash: revisionData.revision.witness_transaction_hash,
                        Witness_sender_account_address: revisionData.revision.witness_sender_account_address

                    }
                });
            }



            if (revisionData.revision.revision_type == "link" || revisionData.revision.revision_type == "file") {

                return reply.code(500).send({
                    message: "not implemented",
                });
            }

            return reply.code(200).send({
                success: true,
                message: "Revisions stored successfully",

            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: "Failed to process revisions" });
        }
    });
}
