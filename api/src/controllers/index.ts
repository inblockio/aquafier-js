import {FastifyInstance} from "fastify";
import {checkDbConnection} from "../database/db";
import {minioClientCompleted} from "../utils/s3Utils";
import Logger from "../utils/Logger";

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
            Logger.warn('⚠️  Twilio Verify env vars missing – SMS/Email verification will fail');
        } else {
            isTwilioEnabled = true
        }

        let dbStatus = await checkDbConnection();
        
        return { 
            status: 'ok' ,
            isTwilioEnabled : isTwilioEnabled,
            isS3Enabled :  minioClientCompleted(),
            isDbConnectionOk : dbStatus
        };
    });
}