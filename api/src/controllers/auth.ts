import { FastifyInstance } from 'fastify';
import { SiweMessage } from 'siwe';

export default async function authController(fastify: FastifyInstance) {
    fastify.post('/auth/siwe', async (request, reply) => {
        try {
          const { message, signature } = request.body as { message: string; signature: string };
    
          const siweMessage = new SiweMessage(message);
          const verification = await siweMessage.verify({ signature });
    
          if (!verification.success) {
            return reply.status(400).send({ error: 'Invalid SIWE signature' });
          }
    
          return { success: true, address: verification.data.address };
        } catch (error) {
          return reply.status(400).send({ error: 'Invalid SIWE request' });
        }
      });
}
