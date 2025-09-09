import {PrismaClient} from "@prisma/client";
import Logger from "../utils/Logger";

const prisma = new PrismaClient({
    // log: ['query', 'info', 'warn', 'error']
});


async function checkDbConnection() {
  try {
    await prisma.$connect()
      Logger.info('✅ Connected to database successfully')
    
    // Optional: Test with a simple query
    const result = await prisma.$queryRaw`SELECT current_database()`
      Logger.info('Database info:', result)
    
    return true
  } catch (error) {
      Logger.error('❌ Failed to connect:', error)
    return false
  } 
}




export {
    prisma,
    checkDbConnection
}