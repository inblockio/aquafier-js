import { FastifyInstance } from "fastify";
import { checkDbConnection } from "src/database/db";
import { minioClientCompleted } from "src/utils/s3Utils";

export default async function indexController(fastify: FastifyInstance) {

    // Define a route
    fastify.get('/', async (request, reply) => {
        return { status: 'ok' };
    });

    // Define a route
    fastify.get('/app_info', async (request, reply) => {
        let isTwilioEnabled = false;
        const {
            TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN,
            TWILIO_VERIFY_SERVICE_SID,
        } = process.env;


        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
            console.warn('⚠️  Twilio Verify env vars missing – SMS/Email verification will fail');
        } else {
            isTwilioEnabled = true
        }

        return { 
            status: 'ok' ,
            isTwilioEnabled : isTwilioEnabled,
            isS3Enabled :  minioClientCompleted(),
            isDbCOnnectionOk : checkDbConnection()
        };
    });
}