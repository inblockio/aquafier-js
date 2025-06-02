import { FastifyInstance } from "fastify";

export default async function indexController(fastify: FastifyInstance) {

    // Define a route
    fastify.get('/', async (request, reply) => {
        return { status: 'ok' };
    });
}