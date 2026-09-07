const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function test() {
  try {
    // Check the model fields
    const subjectModel = prisma.subject;
    console.log("Subject model fields:", Object.keys(subjectModel));
    // Check the dmmf
    const dmmf = prisma._dmmf;
    const subjectModelDef = dmmf.datamodel.models.find(m => m.name === 'Subject');
    if (subjectModelDef) {
      const field = subjectModelDef.fields.find(f => f.name === 'subjectType');
      console.log("subjectType field:", field);
    }
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();