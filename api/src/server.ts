// Import Fastify
import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
// Install first: npm install @fastify/multipart
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import * as fs from "fs"

// Import controllers
import chequeApiController from './controllers/chequeApi';
import userController from './controllers/user';
import authController from './controllers/auth';
import oauthController from './controllers/oauth';
import indexController from './controllers/index';
import versionController from './controllers/version';
import filesController from './controllers/files';
import explorerController from './controllers/explorer';
import verifyController from './controllers/verify';
import { getFileUploadDirectory } from './utils/file_utils';
import revisionsController from './controllers/revisions';
import shareController from './controllers/share';
import fetchChainController from './controllers/fetch-chain';
import templatesController from './controllers/templates';
import { setupPaymentPlans, setUpSystemTemplates, ensureDefaultFreePlanId } from './utils/api_utils';
import systemController from './controllers/system';
import notificationsController from './controllers/notifications';
import ApiController from './controllers/api';
import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"
import { ensureDomainViewForCors } from './utils/server_utils';
import Logger from "./utils/logger";
import DNSClaimVerificationController from './controllers/dns_claim_verification';
import metricsController from './controllers/metrics';
import workflowsController from './controllers/workflow';
import enhancedWebSocketController from './controllers/websocketController2';
import adminController from './controllers/admin';
import plansController from './controllers/plans';
import subscriptionsController from './controllers/subscriptions';
import paymentsController from './controllers/payments';
import contactController from './controllers/contact';
import { prisma } from './database/db';
import logger from './utils/logger';
import { createServerIdentity } from './utils/server_attest';


async function buildServer() {
    // Load environment variables
    dotenv.config();

    // Get the equivalent of __dirname in ES modules

    // Define upload directory
    const UPLOAD_DIR = getFileUploadDirectory();  //process.env.UPLOAD_DIR ||  path.join(__dirname, '../../media/');

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }


    Sentry.init({
        dsn: "https://03e24951c77d8a1aa048982fdb0296e5@o4506135316987904.ingest.us.sentry.io/4509835109531648",
        integrations: [
            nodeProfilingIntegration(),
        ],
        // Tracing
        tracesSampleRate: 1.0, //  Capture 100% of the transactions
        // Set sampling rate for profiling - this is evaluated only once per SDK.init call
        profileSessionSampleRate: 1.0,
        // Trace lifecycle automatically enables profiling during active traces
        profileLifecycle: 'trace',

        // Send structured logs to Sentry
        enableLogs: true,

        // Setting this option to true will send default PII data to Sentry.
        // For example, automatic IP address collection on events
        sendDefaultPii: true,
    });

    // Create a Fastify instance
    const fastify = Fastify({
        logger: true,
        bodyLimit: 50 * 1024 * 1024 /* 50MB */,
        requestTimeout: 120000 /* 2 minutes */,
    });

    Sentry.setupFastifyErrorHandler(fastify);

    // reister system templates ie cheque, identity and attestation
    await setUpSystemTemplates();

    // Setup payment plans
    await setupPaymentPlans()

    // Ensure DEFAULT_FREE_PLAN_ID is set (resolves from DB if missing from .env)
    await ensureDefaultFreePlanId()

    await createServerIdentity()


    let corsAllowedOrigins = process.env.ALLOWED_CORS ? [process.env.ALLOWED_CORS.split(',').map(origin => origin.trim()), ...ensureDomainViewForCors(process.env.FRONTEND_URL)] : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
        'http://localhost:3600',
        'http://127.0.0.1:3600',
        'https://aquafier.inblock.io',
        'http://aquafier.inblock.io',
        'https://dev.inblock.io',
        'http://dev.inblock.io',
        'https://aquafier.zeps.dev',
        'http://aquafier.zeps.dev',
        ...ensureDomainViewForCors(process.env.FRONTEND_URL),
    ]; // Allow your React app origins

    // Logger.info("Allowed CORS origins: ", JSON.stringify(corsAllowedOrigins, null, 2));


    // Remove duplicates using Set
    corsAllowedOrigins = [...new Set(corsAllowedOrigins.flat())];

    // Logger.info("Without duplicates Allowed CORS origins: ", JSON.stringify(corsAllowedOrigins, null, 2));

    // Register the CORS plugin
    fastify.register(cors, {
        // Configure CORS options
        origin: corsAllowedOrigins, // Allow specific origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        credentials: true, // Allow cookies if needed
        allowedHeaders: ['Content-Type', 'Authorization', 'nonce', 'metamask_address', 'baggage', 'sentry-trace', 'x-sentry-trace', 'x-request-id', 'x-correlation-id', 'traceparent', 'tracestate'],
    });

    // Static handler
    fastify.register(fastifyStatic, {
        root: UPLOAD_DIR,
        prefix: '/uploads/' // This will be the URL prefix to access files
    });

    // Make sure you have the formbody parser plugin installed and registered
    fastify.register(import('@fastify/formbody'));

    // Register the plugin
    fastify.register(fastifyMultipart, {
        limits: {
            files: 100,
            fields: 100,
            fieldNameSize: 200 * 1024 * 1024,// 200MB
            parts: 500, // files + fields
            fileSize: 200 * 1024 * 1024 // 200MB - Adding this here as well for early rejection
        }
    });

    fastify.register(import('@fastify/websocket'));

    // Register controllers
    fastify.register(authController);
    fastify.register(oauthController);
    fastify.register(userController);
    fastify.register(indexController);
    fastify.register(versionController);
    fastify.register(filesController);
    fastify.register(explorerController);
    fastify.register(verifyController);
    fastify.register(revisionsController);
    fastify.register(shareController);
    fastify.register(fetchChainController);
    fastify.register(templatesController);
    fastify.register(chequeApiController);
    fastify.register(systemController);
    fastify.register(enhancedWebSocketController);
    fastify.register(notificationsController);
    fastify.register(ApiController);
    fastify.register(DNSClaimVerificationController);
    fastify.register(metricsController);
    fastify.register(workflowsController);
    fastify.register(adminController);
    fastify.register(plansController);
    fastify.register(subscriptionsController);
    fastify.register(paymentsController);
    fastify.register(contactController);

    // Hook to add wallet address to labels when user is authenticated
    fastify.addHook("onRequest", async function (request, reply) {
        const nonce = request.headers['nonce'];

        if (typeof nonce === 'string' && nonce.trim() !== '') {
            try {
                const session = await prisma.siweSession.findUnique({
                    where: { nonce }
                });

                if (session && session.address) {
                    // Add wallet address to request for logging purposes
                    (request as any).walletAddress = session.address;

                    // Log the authenticated request with wallet address
                    logger.info('Request received', {
                        labels: {
                            wallet_address: session.address,
                            url: request.url,
                            method: request.method
                        }
                    });
                } else {
                    logger.info('Unauthenticated request received', {
                        labels: {
                            url: request.url,
                            method: request.method
                        }
                    });
                }
            } catch (error: any) {
                logger.debug('Failed to look up session for nonce', { error: error.message });
                logger.info('Unauthenticated request received', {
                    labels: {
                        url: request.url,
                        method: request.method
                    }
                });
            }
        } else {
            // No nonce provided - log as unauthenticated
            logger.info('Unauthenticated request received', {
                labels: {
                    url: request.url,
                    method: request.method
                }
            });
        }
    });

    return fastify

}


export default buildServer;