// Import Fastify
import Fastify from 'fastify';
import * as dotenv from 'dotenv';

// Import controllers
import authController from './controllers/auth';


// Read host and port from environment variables
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

// Load environment variables
dotenv.config();

// Create a Fastify instance
const fastify = Fastify({ logger: true });

// Register controllers
fastify.register(authController);

// Start the server
const start = async () => {
  try {
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
