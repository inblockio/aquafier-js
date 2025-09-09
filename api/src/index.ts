// Import the server
import buildServer, {mockNotifications} from './server';
import {getHost, getPort} from './utils/api_utils';
import Logger from "./utils/Logger";

const server = buildServer()

// Read host and port from environment variables
const HOST = getHost();
const PORT = getPort();


// Start the server
const start = async () => {
    try {

        await server.listen({port: PORT, host: HOST});
        Logger.info("AquaFier JS is running! \n Website: https://aqua-protocol.org/ \n Check it out here: https://aquafier.inblock.io | https://dev.inblock.io \n" + `Listening on: http://${HOST}:${PORT}`);
        // Create mock notifications for testing
        try {
            if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
                await mockNotifications();
                Logger.info("✅ Mock notifications created successfully");
            }
        } catch (error: any) {
            Logger.error("❌ Error creating mock notifications:", error);
        }
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
