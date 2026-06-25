import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const convs = await prisma.conversation.findMany({
    orderBy: { id: 'desc' },
    take: 10
  });
  console.log("Last 10 conversations:", convs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
