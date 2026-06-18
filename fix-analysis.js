import fs from 'fs';

// 1. Fix server.ts
let serverStr = fs.readFileSync('server.ts', 'utf8');

// A) Remove top-level createViteServer
serverStr = serverStr.replace(/import\s*\{\s*createServer\s+as\s+createViteServer\s*\}\s*from\s*"vite";\n?/g, '');

// Fix line 2289 to have dynamic import instead
// Original: const vite = await createViteServer({
serverStr = serverStr.replace(
  /const vite = await createViteServer\(\s*\{/g, 
  'const { createServer } = await import("vite");\n    const vite = await createServer({'
);

// B) require("util") inside ESM
serverStr = serverStr.replace(
  /const execPromise = require\("util"\)\.promisify\(require\("child_process"\)\.exec\);/g,
  'const { promisify } = await import("util");\n      const execPromise = promisify(require("child_process").exec);'
);
// Wait, require is not allowed in ESM server.ts, let's just use import from child_process
serverStr = serverStr.replace(
  /const execPromise = require\("util"\).*;/g,
  'const { promisify } = await import("util");\n      const { exec: execNode } = await import("child_process");\n      const execPromise = promisify(execNode);'
);

// C) Remove personal info in db initialization
serverStr = serverStr.replace(/Vinícius prefere/g, 'Usuário prefere');
serverStr = serverStr.replace(/Aniversário do senhor/g, 'Aniversário do usuário');
serverStr = serverStr.replace(/Vinícius/g, 'Usuário');

// D) Fix obsidian-update regex to be greedy but stop at end
// Original: const updateRegex = /```obsidian-update\s*\npath:\s*([^\n]+)\ncontent:\s*\n([\s\S]*?)```/g;
serverStr = serverStr.replace(
  /const updateRegex = \/```obsidian-update\\s\*\\npath:\\s\*\(\[\^\\n\]\+\)\\ncontent:\\s\*\\n\(\[\\s\\S\]\*\?\)```\/g;/,
  'const updateRegex = /```obsidian-update\\s*\\npath:\\s*([^\\n]+)\\ncontent:\\s*\\n([\\s\\S]*?)(?:```|$)/g;' // Non-greedy until ``` or end
);

// E) WebSocket named vs default
serverStr = serverStr.replace(
  /import \{ WebSocket \} from "ws";/,
  'import WebSocket from "ws";'
);

// F) Fix `db as any` by adding it to db definition and using interface?
serverStr = serverStr.replace(
  /let db = \{/,
  'let db: any = {\n  chromaMemories: [] as any[],\n  githubRepo: "",\n  githubToken: "",'
);

fs.writeFileSync('server.ts', serverStr);
console.log("Updated server.ts");

// 2. Fix electron-main.cjs
let electronStr = fs.readFileSync('electron-main.cjs', 'utf8');

// A) run-local-command strict mapping
const safeHandler = `
  ipcMain.handle('run-local-command', async (event, command) => {
    const allowedCommands: Record<string, string> = {
      'calc': 'calc',
      'notepad': 'notepad',
      'ipconfig': 'ipconfig',
      'systeminfo': 'systeminfo'
    };
    const key = command.toLowerCase().trim();
    if (!allowedCommands[key]) {
      return { error: 'Comando bloqueado por segurança (RCE protection). Adicione na whitelist exata se precisar.', stderr: '' };
    }
    const safeCmd = allowedCommands[key];

    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(safeCmd, (error, stdout, stderr) => {
        if (error) {
          resolve({ error: error.message, stderr });
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  });
`;

electronStr = electronStr.replace(
  /ipcMain\.handle\('run-local-command'[\s\S]*?\}\);\s*\}\);/m,
  safeHandler.trim() + '\n};'
);

// B) sandbox false -> true
electronStr = electronStr.replace(
  /sandbox:\s*false/g,
  'sandbox: true'
);

fs.writeFileSync('electron-main.cjs', electronStr);
console.log("Updated electron-main.cjs");

// 3. Fix package.json
let pkgStr = fs.readFileSync('package.json', 'utf8');
let pkg = JSON.parse(pkgStr);

// Move from dependencies to devDependencies
const toMove = ['vite', '@vitejs/plugin-react', '@tailwindcss/vite', 'lucide-react', 'recharts'];
toMove.forEach(dep => {
  if (pkg.dependencies && pkg.dependencies[dep]) {
    pkg.devDependencies[dep] = pkg.dependencies[dep];
    delete pkg.dependencies[dep];
  }
});

// Update asar to true
if (pkg.build && pkg.build.asar === false) {
  pkg.build.asar = true;
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("Updated package.json");

// 4. Fix vite.config.ts - Remove VitePWA
let viteConf = fs.readFileSync('vite.config.ts', 'utf8');
viteConf = viteConf.replace(/import\s*\{\s*VitePWA\s*\}\s*from\s*['"]vite-plugin-pwa['"];?/g, '');
viteConf = viteConf.replace(/VitePWA\(\{[^]*?\}\),?/, '');
fs.writeFileSync('vite.config.ts', viteConf);
console.log("Updated vite.config.ts");
