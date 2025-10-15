// Import the server
import buildServer from './server';
import {getHost, getPort} from './utils/api_utils';
import Logger from "./utils/logger";

const server = buildServer()

// Read host and port from environment variables
const HOST = getHost();
const PORT = getPort();


// Start the server
const start = async () => {
    try {

        await server.listen({port: PORT, host: HOST});
        Logger.info("Server started", {
            host: HOST,
            port: PORT,
            website: "https://aqua-protocol.org/",
            dashboards: ["https://aquafier.inblock.io", "https://dev.inblock.io"]
        });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
