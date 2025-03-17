


import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { SessionQuery, SiweRequest } from '../models/request_models';
import { verifySiweMessage } from '@/utils/auth_utils';

export default async function userController(fastify: FastifyInstance) {
    // get current session
    fastify.get('/explorer_fetch_user_settings', async (request, reply) => {
        const nonce = request.headers['nonce'];

         if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
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

            //todo improve me
            return {
                success: true,
                data: {
                    user_pub_key: "",
                    cli_pub_key: "",
                    cli_priv_key: "",
                    witness_network: "sepolia",
                    theme: "light",
                    witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                }
            };
        } catch (error) {
            console.error("Error fetching session:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }

    });

    fastify.post('/explorer_update_user_settings',  async (request, reply) => {

        const nonce = request.headers['nonce'];

         if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
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

            //todo improve me
            return {
                success: true,
                data: {
                    user_pub_key: "",
                    cli_pub_key: "",
                    cli_priv_key: "",
                    witness_network: "sepolia",
                    theme: "light",
                    witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                }
            };
        } catch (error) {
            console.error("Error fetching session:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

}
