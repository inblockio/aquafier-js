import { WitnessEvent } from '@prisma/client';
import { Revision } from 'aquafier-js-sdk';
import { FastifyInstance } from 'fastify';

export default async function revisionsController(fastify: FastifyInstance) {
    fastify.post('/witness/revisions', async (request, reply) => {
        try {
            const { revisions, file_index } = request.body as {
                revisions: Record<string, any>;
                file_index: Record<string, string>;
            };

            if (!revisions || typeof revisions !== 'object') {
                return reply.code(400).send({ error: "Invalid revisions data" });
            }

            let revision: Revision = {
                previous_verification_hash: '',
                local_timestamp: '',
                revision_type: 'witness',
                witness_merkle_proof: [],
                witness_merkle_root: "",
                witness_network: "",
                witness_timestamp: 1,
                witness_sender_account_address: "",
                witness_smart_contract_address: "",
                witness_transaction_hash: ""
            }

            let witnessEvent: WitnessEvent = {
                witnessMerkleRoot: '',
                witnessTimestamp: new Date(),
                witnessNetwork: '',
                witnessSmartContractAddress: '',
                witnessTransactionHash: '',
                witnessSenderAccountAddress: ''
            }

            console.log("Received Revisions:", revisions);
            console.log("Received File Index:", file_index);

            // You can process and store the revisions here (e.g., database insert, file system storage)
            // Example: Saving to an in-memory map (just for demonstration)
            const revisionStore: Record<string, any> = {};

            for (const [revisionHash, revisionData] of Object.entries(revisions)) {
                revisionStore[revisionHash] = revisionData;
            }

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
