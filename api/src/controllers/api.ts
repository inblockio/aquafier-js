import { FastifyInstance } from "fastify";
import { twilioClient } from "../api/twilio";
import { prisma } from "../database/db";

export default async function ApiController(fastify: FastifyInstance) {


    fastify.post("/verify_code", async (request, reply) => {

        const nonce = request.headers['nonce']; // Headers are case-insensitive

        // Check if `nonce` is missing or empty
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce }
        });

        if (!session) {
            return reply.code(403).send({ success: false, message: "Nonce is invalid" });
        }

        const revisionDataPar = request.body as {
            email_or_phone_number: string,
            code: string
        };

        if (!revisionDataPar.email_or_phone_number || revisionDataPar.email_or_phone_number.length == 0) {
            return reply.code(400).send({ success: false, message: "input is required" });
        }

        if (!revisionDataPar.code || revisionDataPar.code.length == 0) {
            return reply.code(400).send({ success: false, message: "verification code is required" });
        }

        const {
            TWILIO_VERIFY_SERVICE_SID,
        } = process.env;

        if (!TWILIO_VERIFY_SERVICE_SID) {
            return reply.code(500).send({ success: false, message: "twilio env variable not set" });
        }
        try {


            await twilioClient.verify.v2
                .services(TWILIO_VERIFY_SERVICE_SID)
                .verificationChecks.create({ to: revisionDataPar.email_or_phone_number, code: revisionDataPar.code });

        } catch (err: any) {
            console.error('🛑  Twilio Verify initiation failed', err.message);
            return reply.code(500).send({ ok: false, error: `Twilio Failed ${err.message}` });
        }

        return reply.code(200).send({ success: true, message: "verification code sent" });

    });


    
    fastify.post("/send_code", async (request, reply) => {


        const nonce = request.headers['nonce']; // Headers are case-insensitive

        // Check if `nonce` is missing or empty
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce }
        });

        if (!session) {
            return reply.code(403).send({ success: false, message: "Nonce is invalid" });
        }

        const revisionDataPar = request.body as {
            email_or_phone_number: string,
            name: string
        };

        if (!revisionDataPar.email_or_phone_number || revisionDataPar.email_or_phone_number.length == 0) {
            return reply.code(400).send({ success: false, message: "input is required" });
        }

        if (!revisionDataPar.email_or_phone_number || revisionDataPar.name.length == 0) {
            return reply.code(400).send({ success: false, message: "input type is required" });
        }


        let channel = 'sms'
        if (revisionDataPar.name == "email" || revisionDataPar.name.includes('email')) {
            channel = 'email'
        }


        const {
            TWILIO_VERIFY_SERVICE_SID,
        } = process.env;

        if (!TWILIO_VERIFY_SERVICE_SID) {
            return reply.code(500).send({ success: false, message: "twilio env variable not set" });
        }
        try {
            await twilioClient.verify.v2
                .services(TWILIO_VERIFY_SERVICE_SID)
                .verifications.create({ to: revisionDataPar.email_or_phone_number, channel });
        } catch (err: any) {
            console.error('🛑  Twilio Verify initiation failed', err.message);
            return reply.code(500).send({ ok: false, error: `Twilio Failed ${err.message}` });
        }

        return reply.code(200).send({ success: true, message: "verification code sent" });

    });



}
