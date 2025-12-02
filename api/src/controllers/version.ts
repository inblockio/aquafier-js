import { FastifyInstance } from "fastify";
import logger from "../utils/logger";
import CustomLogger from "../utils/logger_test";
// import logger from "../utils/logger";

export default async function versionController(fastify: FastifyInstance) {


    fastify.get("/version", async (request, reply) => {
        // Read environment variables or use default values
        const frontend = process.env.FRONTEND_VERSION || "3.2.0";
        const backend = process.env.BACKEND_VERSION || "3.2.0";
        const aquifier = process.env.AQUIFIER_VERSION || "3.2.0";
        const protocol = process.env.PROTOCOL_VERSION || "3.2.0";

        CustomLogger.info("Received request", {
            "labels": {
                "nonce": request.headers['nonce'],
                "url": request.url,
                "wallet_address": "0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f7"
            }
        })

        return reply.send({
            backend,
            frontend,
            aquifier,
            protocol,
        });
    });



}