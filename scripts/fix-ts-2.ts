import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// Fix exec
content = content.replace(/import \{ exec \} from "child_process";/g, '');

// Fix db inside loadDB
content = content.replace(/db = \{ \.\.\.db, \.\.\.parsed \};/g, 'jarvisState = { ...jarvisState, ...parsed };');

// Fix Property type does not exist
// Let's replace the whole router post finance add
const replaceRegex = /const newItem = \{\n\s*id: jarvisState\.finances\.length \+ 1,\n\s*value: isNaN\(parsedValue\) \? 0 : parsedValue,\n\s*category,\n\s*description,\n\s*date: date \|\| new Date\(\)\.toISOString\(\)\.split\("T"\)\[0\]\n\s*};\n\s*try \{\n\s*await prisma\.finance\.create\(\{/g;
content = content.replace(replaceRegex, `
const newItem = { id: jarvisState.finances.length + 1, value: isNaN(parsedValue) ? 0 : parsedValue, category, description, type: type || 'Despesa', date: date || new Date().toISOString().split("T")[0] };
try { await prisma.finance.create({
`);

fs.writeFileSync('server.ts', content);

let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(/<HardwareProcessingMonitor setActiveTab=\{setActiveTab\} setSettingsTab=\{setSettingsTab\} \/>/g, '<HardwareProcessingMonitor hardwareStats={{cpu: "Servidor Jarvis"}} setActiveTab={setActiveTab} setSettingsTab={setSettingsTab} />');
fs.writeFileSync('src/App.tsx', app);
