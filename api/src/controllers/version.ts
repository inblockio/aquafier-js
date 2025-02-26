import { FastifyInstance } from "fastify";

export default async function versionController(fastify: FastifyInstance) {


    fastify.get("/version", async (request, reply) => {
        // Read environment variables or use default values
        const frontend = process.env.FRONTEND_VERSION || "3.2.0";
        const backend = process.env.BACKEND_VERSION || "3.2.0";
        const aquifier = process.env.AQUIFIER_VERSION || "3.2.0";
        const protocol = process.env.PROTOCOL_VERSION || "3.2.0";

        return reply.send({
            backend,
            frontend,
            aquifier,
            protocol,
        });
    });



}