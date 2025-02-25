// Import Fastify
import Fastify from 'fastify';

// Create a Fastify instance
const fastify = Fastify({ logger: true });

// Define a route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log(`Server running at http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
