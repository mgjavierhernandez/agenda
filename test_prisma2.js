const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function test() {
  try {
    const result = await prisma.subject.findMany({
      take: 1,
      where: { institutionId: '5d5ee192-e916-4086-84a6-7a04812b9441' }
    });
    console.log("Success:", result);
  } catch (e) {
    console.error("Error:", e.message);
    console.error("Code:", e.code);
    console.error("Meta:", e.meta);
  } finally {
    await prisma.$disconnect();
  }
}
test();