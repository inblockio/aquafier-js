import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { Settings } from '@prisma/client';
import { SessionQuery, ShareRequest, SiweRequest } from '../models/request_models';
import { verifySiweMessage } from '@/utils/auth_utils';

export default async function shareController(fastify: FastifyInstance) {
    // get current session

    fastify.get('/share_data', async (request, reply) => {

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


            // 

            const { id, hash, recepient } = request.body as ShareRequest;

            let res = prisma.contract.create({
                data: {
                    hash: `${}_${hash}`;
                    latest: JsonValue | null;
                    sender: string | null;
                    receiver: recepient;
                    option: "";
                    reference_count: 0;
                }
            })


        } catch (error) {
            console.error("Error fetching session:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    fastify.post('/share_data', async (request, reply) => {


        const { hash, recipient, latest, option } = request.body as ShareRequest;

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

        if (hash == null || hash == "" || recipient == null || recipient == "") {
            return reply.code(403).send({ success: false, message: "Hash and Recipient need to specified" });
        }


        let findRevision = await prisma.revision.findFirst({
            where: {
                pubkey_hash: latest
            }
        })
        if (findRevision == null) {
            return reply.code(406).send({ success: false, message: "Nounce  is invalid" });
        }

        //insert into contract
        await prisma.contract.create({
            data: {
                hash: hash, //identifier
                receiver: recipient,
                sender: session.address,
                latest: latest,
                option: option,
                reference_count: 1
            }
        })

    });
}