import { FastifyInstance } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { verifyMessage } from 'ethers';
import { SiweRequest } from '../models/request_models';

export default async function authController(fastify: FastifyInstance) {
  // get current session
  fastify.get('/session', async (request, reply) => {
    return { success: true };
  });
  //logout
  fastify.delete('/session', async (request, reply) => {
    return { success: true };
  });
  // login
  fastify.post('/session', async (request, reply) => {

    const { message, signature } = request.body as SiweRequest;

    let logs: string[] = [];
    logs.push(`Received SIWE message: ${message}`);
    logs.push(`Received signature: ${signature}`);

    try {
      // Extract Ethereum address from message
      const address = verifyMessage(message, signature);
      logs.push(`Verified Ethereum address: ${address}`);

      // Generate nonce (for demonstration, normally should be stored in DB)
      const nonce = Math.random().toString(36).substring(2, 15);

      // Insert session into the database
      const session = await prisma.siweSession.create({
        data: {
          address,
          nonce,
          issuedAt: new Date(),
          expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry
        },
      });

      return reply.code(201).send({
        success: true,
        logs,
        session,
      });
    } catch (error) {
      logs.push(`SIWE sign-in failed: ${error}`);
      fastify.log.error(error);

      return reply.code(400).send({
        success: false,
        logs,
        session: null,
      });
    }
  });

}
