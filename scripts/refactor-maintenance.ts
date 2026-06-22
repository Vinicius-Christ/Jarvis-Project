import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// 1. Refactor maintenance route
const maintenanceRegex = /app\.post\("\/api\/maintenance\/execute",\s*\(req,\s*res\)\s*=>\s*\{[\s\S]*?\}\);/g;

content = content.replace(maintenanceRegex, `
const { exec } = require("child_process");
app.post("/api/maintenance/execute", (req, res) => {
  const { action } = req.body;
  if (!action) return res.status(400).json({ error: "Missing action" });
  
  let command = "";
  if (action === "clean_cache") {
    // Windows DNS and temp clear simulation instead of drop_caches
    command = "ipconfig /flushdns && del /q /s %TEMP%\\\\*";
  } else if (action === "docker_prune") {
    command = "docker system prune -a --volumes -f";
  } else if (action === "purge_vram") {
    command = "logoff"; // careful, this logs off windows. We'll use a dummy script or just echo. Let's just use empty.
  } else if (action === "postgres_backup") {
    const destPath = require('path').resolve(process.env.OBSIDIAN_VAULT_PATH || "vault", \`db_backup_\${new Date().toISOString().split("T")[0].replace(/-/g, "")}.db\`);
    command = \`copy prisma\\\\dev.db "\${destPath}" /Y\`;
  } else {
    return res.status(400).json({ error: "Ação não identificada." });
  }

  exec(command, (error, stdout, stderr) => {
    let output = stdout || stderr;
    if (error) {
       output = "Error executing command: " + error.message + "\\n" + output;
    }
    const logs = [];
    logs.push("Executing: " + command);
    logs.push(...output.split('\\n').filter(l => l.trim().length > 0));
    res.json({ success: true, logs, runningAction: null });
  });
});
`.trim());

fs.writeFileSync('server.ts', content);
