import fs from "fs";

let content = fs.readFileSync("server.ts", "utf-8");

content = content.replace(/const \{ exec \} = require\("child_process"\);/g, "");
content = content.replace(/require\('path'\)\.resolve/g, "path.resolve");
content = content.replace(/require\("child_process"\)\.execSync/g, "execSync");

// Add import
if (!content.includes('import { exec, execSync }')) {
  content = content.replace('import express from "express";', 'import express from "express";\nimport { exec, execSync } from "child_process";');
}

fs.writeFileSync("server.ts", content);
