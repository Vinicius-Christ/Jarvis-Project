import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.agenda.findMany().then(res => { console.log(res); process.exit(0); });
