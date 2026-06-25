const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const convs = await prisma.conversation.findMany({
    orderBy: { id: 'desc' },
    take: 10
  });
  console.log("Last 10 conversations:", convs);
  
  const agenda = await prisma.agenda.findMany({
    orderBy: { id: 'desc' },
    take: 5
  });
  console.log("Last 5 agenda items:", agenda);
}

main().catch(console.error).finally(() => prisma.$disconnect());
