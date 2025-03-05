import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { verifyMessage } from 'ethers';
import { SessionQuery, SiweRequest } from '../models/request_models';

export default async function authController(fastify: FastifyInstance) {
  // get current session
  fastify.get('/session', async (request: FastifyRequest<{ Querystring: SessionQuery }>, reply) => {
    const nonce = request.query.nonce ?? "";

    if (!nonce) {
      return { success: false, message: "Nonce is required" };
    }

    try {


      const session = await prisma.siweSession.findUnique({
        where: { nonce }
      });

      if (!session) {
        return reply.code(404).send({ success: false, message: "Session not found" });
      }

      // Check if session is expired
      if (new Date(session.expirationTime!!) < new Date()) {
        return reply.code(401).send({ success: false, message: "Session expired" });
      }

      return {
        success: true,
        session: {
          address: session.address,
          nonce: session.nonce,
          issued_at: session.issuedAt,
          expiration_time: session.expirationTime
        }
      };
    } catch (error) {
      console.error("Error fetching session:", error);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });
  //logout
  fastify.delete('/session', async (request: FastifyRequest<{ Querystring: SessionQuery }>, reply) => {
    const nonce = request.query.nonce ?? "";

    if (!nonce) {
      return reply.code(400).send({ success: false, message: "Nonce is required" });
    }

    try {
      await prisma.siweSession.delete({
        where: { nonce }
      });

      return { success: true, message: "Session deleted successfully" };
    } catch (error) {
      console.error("Error deleting session:", error);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
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

      const user = await prisma.user.upsert({
        where: {
          user: address,
        },
        update: {}, // Optional: what to update if the user exists
        create: {
          user: address // What to create if the user doesn't exist
        }
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
