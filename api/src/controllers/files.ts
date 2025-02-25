import { FastifyInstance } from 'fastify';
import { SiweMessage } from 'siwe';

export default async function authController(fastify: FastifyInstance) {
    // get file using file hash
    fastify.get('/files/:fileHash', async (request, reply) => {
        const { fileHash } = request.params as { fileHash: string };
        console.log(`Received fileHash: ${fileHash}`);
        return { success: true };
    });

}