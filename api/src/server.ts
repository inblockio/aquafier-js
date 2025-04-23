
// Import Fastify
import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
// Install first: npm install @fastify/multipart
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import * as fs from "fs"

// Import controllers
import userController from './controllers/user';
import authController from './controllers/auth';
import indexController from './controllers/index';
import versionController from './controllers/version';
import filesController from './controllers/files';
import explorerController from './controllers/explorer';
import verifyController from './controllers/verify.js';
import { getFileUploadDirectory } from './utils/file_utils';
import revisionsController from './controllers/revisions';
import shareController from './controllers/share';
import fetchChainController from './controllers/fetch-chain';
import templatesController from './controllers/templates';


function buildServer() {
    // Load environment variables
    dotenv.config();

    // Get the equivalent of __dirname in ES modules

    // Define upload directory
    const UPLOAD_DIR = getFileUploadDirectory();  //process.env.UPLOAD_DIR ||  path.join(__dirname, '../../media/');

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // Create a Fastify instance
    const fastify = Fastify({ logger: true });


    // Register the CORS plugin
    fastify.register(cors, {
        // Configure CORS options
        origin: process.env.ALLOWED_CORS ? process.env.ALLOWED_CORS.split(',').map(origin => origin.trim()) : [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5174',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3600',
            'http://127.0.0.1:3600',
            'https://aquafier.inblock.io',
            'http://aquafier.inblock.io',
            'https://dev.inblock.io',
            'http://dev.inblock.io',
        ], // Allow your React app origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true, // Allow cookies if needed
        allowedHeaders: ['Content-Type', 'Authorization', 'nonce', 'metamask_address']
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
            fileSize: 200 * 1024 * 1024 // 200MB - Adding this here as well for early rejection
        }
    });



    // Register controllers
    fastify.register(authController);
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

    return fastify

}


export default buildServer;