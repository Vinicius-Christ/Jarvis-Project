import fs from 'fs';

let content = fs.readFileSync('electron-main.cjs', 'utf-8');

// Replace top level target logic
content = content.replace(
`// Se existir um arquivo jarvis-target.txt ao lado do executável, lê o IP dele
try {
  let targetFile = path.join(path.dirname(app.getPath("exe")), "jarvis-target.txt");
  if (!fs.existsSync(targetFile)) {
    targetFile = path.join(app.getAppPath(), "jarvis-target.txt");
  }
  if (fs.existsSync(targetFile)) {
    let target = fs.readFileSync(targetFile, "utf8").trim();
    if (target && !target.startsWith("http")) target = "http://" + target;
    if (target) CONFIG.SERVER_URL = target;
  }
} catch (e) {}`,
`// Se existir um arquivo jarvis-target.json ao lado do executável, lê o IP dele
try {
  let targetFile = path.join(path.dirname(app.getPath("exe")), "jarvis-target.json");
  if (!fs.existsSync(targetFile)) {
    targetFile = path.join(app.getAppPath(), "jarvis-target.json");
  }
  if (fs.existsSync(targetFile)) {
    let data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
    let target = data.url;
    if (target && !target.startsWith("http")) target = "http://" + target;
    if (target) CONFIG.SERVER_URL = target;
  }
} catch (e) {}`
);

// Replace discoverJarvisServer logic
content = content.replace(
`  // 4. Tenta último IP salvo
  let targetObj = null;
  try {
    let targetFile = path.join(path.dirname(app.getPath("exe")), "jarvis-target.txt");
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(app.getAppPath(), "jarvis-target.txt");
    }
    if (fs.existsSync(targetFile)) {
      let target = fs.readFileSync(targetFile, "utf8").trim();
      if (target && !target.startsWith("http")) target = "http://" + target;
      if (target) {
        candidates.push(target);
        targetObj = target;
      }
    }
  } catch(e){}`,
`  // 4. Tenta último IP salvo
  let targetObj = null;
  try {
    let targetFile = path.join(path.dirname(app.getPath("exe")), "jarvis-target.json");
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(app.getAppPath(), "jarvis-target.json");
    }
    if (fs.existsSync(targetFile)) {
      let data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
      let target = data.url;
      if (target && !target.startsWith("http")) target = "http://" + target;
      if (target) {
        candidates.push(target);
        targetObj = target;
      }
    }
  } catch(e){}`
);

// Write logic in discoverJarvisServer
content = content.replace(
`        // se o IP não tava no arquivo, salva
        if (c !== targetObj && c !== 'http://localhost:3000' && !c.includes('jarvis.local') && !c.includes('jarvis.tailscale')) {
           try {
             const outPath = app.getPath("exe") ? path.join(path.dirname(app.getPath("exe")), "jarvis-target.txt") : path.join(app.getAppPath(), "jarvis-target.txt");
             fs.writeFileSync(outPath, c);
           } catch(ex) {}
        }`,
`        // se o IP não tava no arquivo, salva
        if (c !== targetObj && c !== 'http://localhost:3000' && !c.includes('jarvis.local') && !c.includes('jarvis.tailscale')) {
           try {
             const outPath = app.getPath("exe") ? path.join(path.dirname(app.getPath("exe")), "jarvis-target.json") : path.join(app.getAppPath(), "jarvis-target.json");
             fs.writeFileSync(outPath, JSON.stringify({ url: c }, null, 2));
           } catch(ex) {}
        }`
);

// Replace set-target-ip logic
content = content.replace(
`  ipcMain.handle('set-target-ip', async (event, ipStr) => {
    try {
      let targetFile = path.join(path.dirname(app.getPath("exe")), "jarvis-target.txt");
      let u = ipStr.trim();
      if (!u.startsWith('http')) u = 'http://' + u;
      fs.writeFileSync(targetFile, u);
      CONFIG.SERVER_URL = u;
      return true;
    } catch(e) {
      try {
         let targetFile = path.join(app.getAppPath(), "jarvis-target.txt");
         let u = ipStr.trim();
         if (!u.startsWith('http')) u = 'http://' + u;
         fs.writeFileSync(targetFile, u);
         CONFIG.SERVER_URL = u;
         return true;
      } catch(e2) {
         return false;
      }
    }
  });`,
`  ipcMain.handle('set-target-ip', async (event, ipStr) => {
    try {
      let targetFile = path.join(path.dirname(app.getPath("exe")), "jarvis-target.json");
      let u = ipStr.trim();
      if (!u.startsWith('http')) u = 'http://' + u;
      fs.writeFileSync(targetFile, JSON.stringify({ url: u }, null, 2));
      CONFIG.SERVER_URL = u;
      return true;
    } catch(e) {
      try {
         let targetFile = path.join(app.getAppPath(), "jarvis-target.json");
         let u = ipStr.trim();
         if (!u.startsWith('http')) u = 'http://' + u;
         fs.writeFileSync(targetFile, JSON.stringify({ url: u }, null, 2));
         CONFIG.SERVER_URL = u;
         return true;
      } catch(e2) {
         return false;
      }
    }
  });`
);

fs.writeFileSync('electron-main.cjs', content);
