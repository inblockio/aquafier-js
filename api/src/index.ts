
// Import the server
import buildServer from './server';
import { getHost, getPort } from './utils/api_utils';
import { mockNotifications } from './server';

const server = buildServer()

// Read host and port from environment variables
const HOST = getHost();
const PORT = getPort();


// Start the server
const start = async () => {
  try {

    await server.listen({ port: PORT, host: HOST });
    console.log(`\n`);
    console.log("====================================");
    console.log("🚀  AquaFier JS is running!");
    console.log("🌊  Website: https://aqua-protocol.org/");
    console.log("🌐  Check it out here: https://aquafier.inblock.io | https://dev.inblock.io");
    console.log(`📡  Listening on: http://${HOST}:${PORT}`);
    console.log("====================================");
    console.log("\n");
    
    // Create mock notifications for testing
    try {
      await mockNotifications();
      console.log("✅ Mock notifications created successfully");
    } catch (error) {
      console.error("❌ Error creating mock notifications:", error);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
