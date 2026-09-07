const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'subject_type'`;
    console.log("Column exists:", result);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();