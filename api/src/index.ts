
// Import the server
import buildServer from './server';
import { getHost, getPort } from './utils/api_utils';

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
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
