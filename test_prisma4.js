const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function test() {
  try {
    // Check the model fields
    const subjectFields = prisma.subject.fields;
    console.log("Subject fields:", subjectFields);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();