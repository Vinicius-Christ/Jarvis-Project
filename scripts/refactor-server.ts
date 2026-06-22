import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// 1. Rename db to jarvisState and remove saveDB
content = content.replace(/let db: DbSchema = \{/g, 'let jarvisState: any = {');
content = content.replace(/function saveDB\(\) \{[\s\S]*?\n\}/g, '// Prisma handles persist');
content = content.replace(/saveDB\(\);?/g, '');
content = content.replace(/db\./g, 'jarvisState.');

// 2. Refactor /api/db to query from prisma dynamically
const apiDbRegex = /app\.get\("\/api\/db",\s*\(_req,\s*res\)\s*=>\s*\{[\s\S]*?\}\);/g;
content = content.replace(apiDbRegex, `
app.get("/api/db", async (_req, res) => {
  jarvisState.finances = await prisma.finance.findMany();
  jarvisState.agenda = await prisma.agenda.findMany();
  jarvisState.conversations = await prisma.conversation.findMany();
  const haState = await prisma.homeAssistantState.findFirst();
  if (haState) {
    jarvisState.homeAssistant.ip = haState.ip;
    jarvisState.homeAssistant.token = haState.token;
    jarvisState.homeAssistant.ambientPreset = haState.ambientPreset;
    jarvisState.homeAssistant.wsStatus = haState.wsStatus;
    if (haState.lights) jarvisState.homeAssistant.lights = JSON.parse(haState.lights);
    if (haState.ac) jarvisState.homeAssistant.ac = JSON.parse(haState.ac);
    if (haState.devices) jarvisState.homeAssistant.devices = JSON.parse(haState.devices);
    if (haState.hiddenDevices) jarvisState.homeAssistant.hiddenDevices = JSON.parse(haState.hiddenDevices);
    if (haState.modesConfig) jarvisState.homeAssistant.modesConfig = JSON.parse(haState.modesConfig);
  }
  res.json(jarvisState);
});
`.trim());

// 3. Remove push usages for finances, agenda, conversations, replacing with await prisma... create
content = content.replace(/jarvisState\.finances\.push\(newItem\);/g, `
  try {
    await prisma.finance.create({
      data: {
        value: newItem.value,
        category: newItem.category,
        description: newItem.description,
        type: newItem.type,
        date: new Date(newItem.date)
      }
    });
  } catch (err) {}
`);

content = content.replace(/jarvisState\.agenda\.push\(newItem\);/g, `
  try {
    await prisma.agenda.create({
      data: {
        title: newItem.title,
        datetime: new Date(newItem.datetime),
        category: newItem.category,
        notes: newItem.notes || ""
      }
    });
  } catch (err) {}
`);

content = content.replace(/jarvisState\.conversations\.push\(\{ sender: "User", text: displayText, time: new Date\(\)\.toISOString\(\) \}\);/g, `
  try {
    await prisma.conversation.create({ data: { sender: "User", text: displayText } });
  } catch (e) {}
`);
content = content.replace(/jarvisState\.conversations\.push\(\{ sender: "JARVIS", text: replyText, time: new Date\(\)\.toISOString\(\) \}\);/g, `
  try {
    await prisma.conversation.create({ data: { sender: "JARVIS", text: replyText } });
  } catch (e) {}
`);

// Arrays clearing
content = content.replace(/jarvisState\.finances = \[\];/g, 'await prisma.finance.deleteMany();');
content = content.replace(/jarvisState\.agenda = \[\];/g, 'await prisma.agenda.deleteMany();');
content = content.replace(/jarvisState\.conversations = \[\];/g, 'await prisma.conversation.deleteMany();');

// 4. Update the ask route (MCP logic)
content = content.replace(/const transactions = jarvisState\.finances;/g, 'const transactions = await prisma.finance.findMany();');
content = content.replace(/if \(jarvisState\.finances && jarvisState\.finances\.length > 0\)/g, 'const financesList = await prisma.finance.findMany(); if (financesList.length > 0)');
content = content.replace(/jarvisState\.finances\.map/g, 'financesList.map');
content = content.replace(/jarvisState\.finances\.reduce/g, 'financesList.reduce');
content = content.replace(/!jarvisState\.finances \|\| jarvisState\.finances\.length === 0/g, 'financesList.length === 0');

content = content.replace(/const agendaItems = jarvisState\.agenda;/g, 'const agendaItems = await prisma.agenda.findMany();');
content = content.replace(/if \(jarvisState\.agenda && jarvisState\.agenda\.length > 0\)/g, 'const agendaList = await prisma.agenda.findMany(); if (agendaList.length > 0)');
content = content.replace(/jarvisState\.agenda\.map/g, 'agendaList.map');
content = content.replace(/!jarvisState\.agenda \|\| jarvisState\.agenda\.length === 0/g, 'agendaList.length === 0');

fs.writeFileSync('server.ts', content);
