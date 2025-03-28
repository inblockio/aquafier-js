import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { SessionQuery, SiweRequest } from '../models/request_models';
import { verifySiweMessage } from '../utils/auth_utils';

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
      // const address = verifyMessage(message, signature);
      const siweData = await verifySiweMessage(message, signature);
      // logs.push(`Verified Ethereum address: ${address}`);

      if (siweData === undefined || !siweData.isValid) {
        logs.push("Invalid sign in message")
        logs.push(siweData.error)
        return reply.code(400).send({
          success: true,
          logs
        });
      }

      // Generate nonce (for demonstration, normally should be stored in DB)
      const nonce = Math.random().toString(36).substring(2, 15);

      // Insert session into the database
      const session = await prisma.siweSession.create({
        data: {
          address: siweData.address!!,
          nonce: siweData.nonce!!,
          issuedAt: new Date(),
          // expirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour expiry
          expirationTime: siweData.expirationTime
        },
      });

      const user = await prisma.user.upsert({
        where: {
          user: siweData.address,
        },
        update: {}, // Optional: what to update if the user exists
        create: {
          user: siweData.address!! // What to create if the user doesn't exist
        }
      });



      let settingsData = await prisma.settings.findFirst({
        where: {
          user_pub_key: siweData.address!!
        }
      })

      if (settingsData == null) {
        let defaultData = {
          user_pub_key: siweData.address!!,
          cli_pub_key: "",
          cli_priv_key: "",
          Witness_network: "sepolia",
          theme: "light",
          Witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
        }
        await prisma.settings.create({
          data: defaultData
        })
      }



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
