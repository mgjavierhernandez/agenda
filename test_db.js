const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT current_database()`;
    console.log('Connected to database:', result);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();