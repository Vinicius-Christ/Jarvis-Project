import fs from 'fs';
let serverStr = fs.readFileSync('server.ts', 'utf8');
serverStr = serverStr.replace(/\(db as any\)/g, 'db');
fs.writeFileSync('server.ts', serverStr);
console.log("Replaced (db as any) in server.ts");
