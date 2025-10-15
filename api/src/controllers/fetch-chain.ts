import {authenticate} from "../middleware/auth_middleware";
import {prisma} from "../database/db";
import {fetchCompleteRevisionChain} from "../utils/quick_utils";
import {FastifyInstance} from "fastify";
import Logger from "../utils/logger";

export default async function fetchChainController(fastify: FastifyInstance) {
    // Test route for fetchCompleteRevisionChain
    fastify.get<{
        Params: {
            userAddress: string;
            latestHash: string;
        }
    }>('/fetch-chain/:userAddress/:latestHash', { preHandler: authenticate }, async (request, reply) => {
        const { userAddress, latestHash } = request.params;

        if (!userAddress || !latestHash) {
            return reply.code(400).send({ error: 'userAddress and latestHash parameters are required.' });
        }

        try {
            // Construct the base URL dynamically
            const host = request.headers.host || 'localhost:3000'; // Provide a default host
            const protocol = request.protocol || 'http';
            const url = `${protocol}://${host}`;

            Logger.info(`Testing fetchCompleteRevisionChain with: userAddress=${userAddress}, latestHash=${latestHash}, url=${url}`);

            // Call the function
            const completeTree = await fetchCompleteRevisionChain(latestHash, userAddress, url, new Set(), true, 0, true);

            // Check if the tree is empty (which might indicate the hash wasn't found initially)
            if (Object.keys(completeTree.revisions).length === 0 && Object.keys(completeTree.file_index).length === 0) {
                // You might want to check if the initial hash actually exists in the DB for a more specific message
                const initialRevisionExists = await prisma.revision.count({
                    where: { pubkey_hash: `${userAddress}_${latestHash}` }
                });
                if (initialRevisionExists === 0) {
                    return reply.code(404).send({ message: `Initial revision hash ${latestHash} not found for user ${userAddress}.`, tree: completeTree });
                } else {
                    // Hash exists, but chain building resulted in empty tree (e.g., maybe only links leading to processed hashes?)
                    return reply.code(200).send({ message: "Chain processed, resulting tree is empty (check logs for potential warnings like circular links).", tree: completeTree });
                }
            }

            // Send the successful response
            reply.code(200).send(completeTree);

        } catch (error: any) {
            request.log.error(error, `Error fetching chain for ${userAddress}_${latestHash}`);
            reply.code(500).send({ error: 'Failed to fetch complete revision chain.', details: error.message });
        }
    });

}