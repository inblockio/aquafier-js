
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
import { setUpSystemTemplates } from './utils/api_utils';
import systemController from './controllers/system';
import webSocketController from './controllers/websocketController';
import notificationsController from './controllers/notifications';
import { prisma } from './database/db';



export async function mockNotifications(){
    // 0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f7 - This is the receiver and the sender is 'system'
    
    const receiverAddress = '0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f7';
    const systemSender = 'system';
    
    // Check if notifications already exist for this user
    const existingNotifications = await prisma.notifications.findMany({
        where: { receiver: receiverAddress }
    });
    
    if (existingNotifications.length > 0) {
        console.log(`${existingNotifications.length} notifications already exist for ${receiverAddress}`);
        return;
    }
    
    // Sample notification messages
    const notificationMessages = [
        'Welcome to Aqua Protocol v2! Get started by creating your first document.',
        'Your document "Introduction to Blockchain" has been successfully signed.',
        'New feature alert: You can now share documents with multiple users at once.',
        'Security update: We have enhanced our encryption protocols.',
        'Reminder: You have 3 unsigned documents waiting for your attention.',
        'User alex.eth has shared a document with you: "DeFi Research Paper".',
        'Your storage usage is approaching 80% of your allocated space.',
        'Maintenance notification: System updates scheduled for tomorrow at 2 AM UTC.',
        'Congratulations! Your document has been viewed 50 times.',
        'New template available: Legal Contract with Smart Contract Integration.'
    ];
    
    try {
        // Create notifications with different read statuses
        const notifications = [];
        
        for (let i = 0; i < notificationMessages.length; i++) {
            const notification = await prisma.notifications.create({
                data: {
                    sender: systemSender,
                    receiver: receiverAddress,
                    content: notificationMessages[i],
                    is_read: i < 4, // First 4 will be read, rest unread
                    created_on: new Date(Date.now() - (i * 3600000)) // Stagger creation times
                }
            });
            notifications.push(notification);
        }
        
        console.log(`Created ${notifications.length} mock notifications for ${receiverAddress}`);
    } catch (error) {
        console.error('Error creating mock notifications:', error);
    } finally {
        await prisma.$disconnect();
    }
}



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


    // reister system templates ie cheque, identity and attestation
    setUpSystemTemplates();

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
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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

    fastify.register(import('@fastify/websocket'));


    // setInterval(() => {

    //     console.log(`Ping all websockets`);
    //     broadcastToAllClients("ping all conections ")
    // }, 1000)

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
    fastify.register(chequeApiController);
    fastify.register(systemController);
    fastify.register(webSocketController);
    fastify.register(notificationsController);

    return fastify

}


export default buildServer;