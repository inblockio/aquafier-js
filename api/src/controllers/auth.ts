import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../database/db';
import { SessionQuery, SiweRequest } from '../models/request_models';
import { verifySiweMessage } from '../utils/auth_utils';
import { fetchEnsName } from '../utils/api_utils';
import Logger, { EventCategory, EventOutcome, EventType } from "../utils/logger";

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


      let settingsData = await prisma.settings.findFirst({
        where: {
          user_pub_key: session.address!!
        }
      })

      if (settingsData == null) {
        let defaultData = {
          user_pub_key: session.address!!,
          cli_pub_key: "",
          cli_priv_key: "",
          alchemy_key: "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ",
          witness_network: process.env.DEFAULT_WITNESS_NETWORK ?? "sepolia",
          theme: "light",
          witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
           createdAt: new Date(),
    updatedAt: new Date(),
        }

        settingsData = defaultData

        await prisma.settings.create({
          data: defaultData
        })
      }

      return {
        success: true,
        session: {
          address: session.address,
          nonce: session.nonce,
          issued_at: session.issuedAt,
          expiration_time: session.expirationTime
        },
        user_settings: settingsData
      };
    } catch (error: any) {
      Logger.error("Error fetching session:", error);
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
    } catch (error: any) {
      Logger.error("Error deleting session:", error);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });
  // login
  fastify.post('/session', async (request, reply) => {

    const { message, signature } = request.body as SiweRequest;
const startTime = Date.now();
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
          success: false,
          logs
        });
      }

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


      // check if user exist in users
      const userData = await prisma.users.findFirst({
        where: {
          address: siweData.address,
        }
      })

      // Check if we should attempt ENS lookup
      const infuraProjectId = process.env.VITE_INFURA_PROJECT_ID;
const duration = Date.now() - startTime;
    Logger.logAuthEvent('user-login', EventOutcome.SUCCESS, siweData.address!!);

      if (userData == null) {
        let ensName = null

        if (infuraProjectId) {
          ensName = await fetchEnsName(siweData.address!!, infuraProjectId)
        }
        await prisma.users.create({
          data: {
            address: siweData.address!!,
            ens_name: ensName
          }
        });


        Logger.logEvent('User created in database', {
              category: EventCategory.DATABASE,
              type: EventType.CREATION,
              action: 'user-create',
              outcome: EventOutcome.SUCCESS,
              duration,
              metadata: {
                userId: siweData.address!!,
                table: 'users',
              }
            });

      } else {

        if (userData.ens_name == null || userData.ens_name == undefined || userData.ens_name == "") {
          if (infuraProjectId) {
            const ensName = await fetchEnsName(siweData.address!!, infuraProjectId)

            await prisma.users.update({
              where: {
                address: siweData.address,
              },
              data: {
                ens_name: ensName
              }
            });
          }
        }
      }


      let settingsData = await prisma.settings.findFirst({
        where: {
          user_pub_key: siweData.address!!
        }
      })
      console.log("process.env.DEFAULT_WITNESS_NETWORK", process.env.DEFAULT_WITNESS_NETWORK)
      if (settingsData == null) {
        let defaultData = {
          user_pub_key: siweData.address!!,
          cli_pub_key: "",
          cli_priv_key: "",
          alchemy_key: "ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ",
          witness_network: process.env.DEFAULT_WITNESS_NETWORK ?? "sepolia",
          theme: "light",
          witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
           createdAt: new Date(),
    updatedAt: new Date(),
        }

        settingsData = defaultData

        await prisma.notifications.create({
          data: {
            sender: "system",
            receiver: siweData.address!!,
            content: "Welcome to Aqua! Get started by creating your first document or uploading a file for notarization.",
            navigate_to: "",
            is_read: false,
            created_on: new Date()
          }
        })

        await prisma.settings.create({
          data: defaultData
        })
      }

      // Logging to track if it logged in
      Logger.info('User login', {
        event: {
          action: 'login',
          category: 'authentication',
          type: 'start'
        },
        user: {
          id: session.address!!,
          name: session.address!!
        },
        session: {
          id: session.nonce!!
        }
      });



       Logger.logEvent('User login successful', {
              category: EventCategory.DATABASE,
              type: EventType.CREATION,
              action: 'user-login',
              outcome: EventOutcome.SUCCESS,
              duration,
              metadata: {
                userId: siweData.address!!,
                table: 'users-login',
              }
            });

      return reply.code(201).send({
        success: true,
        logs,
        session,
        user_settings: settingsData
      });
    } catch (error: any) {
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

