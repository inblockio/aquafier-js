import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
    // log: ['query', 'info', 'warn', 'error']
});


async function checkDbConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Connected to database successfully')
    
    // Optional: Test with a simple query
    const result = await prisma.$queryRaw`SELECT current_database()`
    console.log('Database info:', result)
    
    return true
  } catch (error) {
    console.error('❌ Failed to connect:', error)
    return false
  } 
}




export {
    prisma,
    checkDbConnection
}