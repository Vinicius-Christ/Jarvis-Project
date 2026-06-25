import { prisma } from './src/server/database.js';

async function main() {
  const agenda = await prisma.agenda.findMany();
  console.log("DB AGENDA:", JSON.stringify(agenda, null, 2));
  
  const config = await prisma.appConfig.findUnique({ where: { key: "global_state" } });
  if (config) {
     const parsed = JSON.parse(config.value);
     console.log("APPCONFIG AGENDA:", JSON.stringify(parsed.agenda, null, 2));
  }
}
main().finally(() => prisma.$disconnect());
