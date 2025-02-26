// Import Fastify
import Fastify from 'fastify';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';

// Import controllers
import authController from './controllers/auth';
import indexController from './controllers/index';
import versionController from './controllers/version';


// Read host and port from environment variables
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3600;

// Load environment variables
dotenv.config();

// Create a Fastify instance
const fastify = Fastify({ logger: true });

// Register controllers
fastify.register(authController);
fastify.register(indexController);
fastify.register(versionController);

// Start the server
const start = async () => {
  try {
    // Register the CORS plugin
    await fastify.register(cors, {
      // Configure CORS options
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Allow your React app origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true, // Allow cookies if needed
      allowedHeaders: ['Content-Type', 'Authorization']
    });

    // Make sure you have the formbody parser plugin installed and registered
    fastify.register(require('@fastify/formbody'));

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n`);
    console.log("====================================");
    console.log("🚀  AquaFier JS is running!");
    console.log("🌊  Website: https://aqua-protocol.org/");
    console.log(`📡  Listening on: http://${HOST}:${PORT}`);
    console.log("====================================");
    console.log("\n");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
