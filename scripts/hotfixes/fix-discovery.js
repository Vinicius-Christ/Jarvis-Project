import fs from 'fs';

let content = fs.readFileSync('electron-main.cjs', 'utf-8');

const discoverFunction = `
// ============================================
// UTILITY: DISCOVER JARVIS SERVER URL
// ============================================
const discoverJarvisServer = async () => {
  const checkIp = (url) => {
    return new Promise((resolve) => {
      const parsed = new URL(url);
      const req = http.get({
        hostname: parsed.hostname,
        port: parsed.port,
        path: CONFIG.SERVER_HEALTH_PATH,
        timeout: 1000
      }, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  };

  const candidates = [];
  
  // 1. Tenta ambiente
  if (process.env.JARVIS_EXTERNAL_IP) {
     candidates.push(process.env.JARVIS_EXTERNAL_IP);
  }

  // 2. Tenta mDNS
  candidates.push('http://jarvis.local:3000');
  
  // 3. Tenta Tailscale
  candidates.push('http://jarvis.tailscale:3000');
  
  // 4. Tenta último IP salvo
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
  } catch(e){}

  for (let c of candidates) {
    try {
      new URL(c); // Verify if valid URL
      log(\`Testing connection to: \${c}\`, 'info');
      const isHealthy = await checkIp(c);
      if (isHealthy) {
        log(\`Successfully connected to \${c}\`, 'success');
        CONFIG.SERVER_URL = c;
        
        // se o IP não tava no arquivo, salva
        if (c !== targetObj && c !== 'http://localhost:3000' && !c.includes('jarvis.local') && !c.includes('jarvis.tailscale')) {
           try {
             const outPath = app.getPath("exe") ? path.join(path.dirname(app.getPath("exe")), "jarvis-target.txt") : path.join(app.getAppPath(), "jarvis-target.txt");
             fs.writeFileSync(outPath, c);
           } catch(ex) {}
        }
        return true;
      }
    } catch(err) {
      log(\`Invalid candidate URL: \${c}\`, 'warn');
    }
  }

  // Fallback para localhost localmente
  CONFIG.SERVER_URL = 'http://localhost:3000';
  return false;
};
`;

// Insert the discover function before startServerProcess
content = content.replace('const startServerProcess = () => {', discoverFunction + '\nconst startServerProcess = () => {');

// Handle set-target-ip ipcMain handler
const handler = `
  ipcMain.handle('set-target-ip', async (event, ipStr) => {
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
  });

  ipcMain.handle('get-local-hardware',`;
content = content.replace(/ipcMain\.handle\('get-local-hardware',/, handler);


// Add to preload
let preload = fs.readFileSync('electron-preload.cjs', 'utf-8');
preload = preload.replace(/getLocalHardware:/, 'setTargetIp: (ip) => ipcRenderer.invoke("set-target-ip", ip),\n  getLocalHardware:');
fs.writeFileSync('electron-preload.cjs', preload);

const findReady = `      const isLocalhost = CONFIG.SERVER_URL.includes('localhost') || CONFIG.SERVER_URL.includes('127.0.0.1');
      if (isLocalhost) {
        await startServerProcess();
        log('Node.js server started successfully', 'success');
      } else {
        log(\`Connecting to remote JARVIS Server at \${CONFIG.SERVER_URL}\`, 'info');
        // Check health of remote server before continuing
        await checkServerHealth(CONFIG.SERVER_URL + CONFIG.SERVER_HEALTH_PATH);
      }`;

const replaceReady = `      await discoverJarvisServer();
      
      const isLocalhost = CONFIG.SERVER_URL.includes('localhost') || CONFIG.SERVER_URL.includes('127.0.0.1');
      if (isLocalhost) {
        await startServerProcess();
        log('Node.js server started successfully', 'success');
      } else {
        log(\`Using remote JARVIS Server at \${CONFIG.SERVER_URL}\`, 'info');
      }`;

content = content.replace(findReady, replaceReady);

const errorHtmlFind = `    // Show error page
    const errorHtml = \`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial; padding: 40px; background: #1a1a2e; color: #fff; }
          h1 { color: #ff6b6b; }
          p { line-height: 1.6; }
          code { background: #333; padding: 10px; display: block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>❌ Erro ao Conectar</h1>
        <p>Não foi possível conectar ao servidor.</p>
        <p><strong>Erro:</strong> \${err.message}</p>
        <p>Tente:</p>
        <code>1. Reinicie a aplicação</code>
        <code>2. Verifique se Docker está rodando</code>
        <code>3. Verifique os logs: docker compose logs</code>
        <button onclick="location.reload()">Tentar Novamente</button>
      </body>
      </html>
    \`;`;

const errorHtmlReplace = `    // Show error page
    const errorHtml = \`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial; padding: 40px; background: #1a1a2e; color: #fff; }
          h1 { color: #ff6b6b; }
          p { line-height: 1.6; }
          code { background: #333; padding: 10px; display: block; margin: 10px 0; border-radius: 4px; }
          input { padding: 10px; width: 100%; max-width: 300px; border-radius: 4px; border: none; font-size: 16px; margin-top: 10px; outline: none; }
          button { padding: 10px 20px; font-size: 16px; background: #00d4ff; border: none; border-radius: 4px; cursor: pointer; color: #1a1a2e; font-weight: bold; margin-top: 10px;}
          button:hover { background: #00a0cc; }
        </style>
      </head>
      <body>
        <h1>❌ Erro ao Conectar (Auto-Discovery Falhou)</h1>
        <p>Não foi possível encontrar a rede JARVIS automaticamente (mDNS, Tailscale ou Localhost).</p>
        <p><strong>Detalhes:</strong> \${err.message}</p>
        <hr style="border-color:#333; margin: 20px 0;" />
        <h3>Configuração Manual</h3>
        <p>Insira o IP/Host exato do servidor JARVIS (Ex: http://192.168.1.50:3000):</p>
        <input type="text" id="targetIp" placeholder="http://192.168.1.15:3000" />
        <br />
        <button onclick="saveAndRestart()">Salvar & Conectar</button>
        <p style="margin-top: 30px;">Ou tente novamente:</p>
        <button onclick="location.reload()" style="background:#444; color:#fff;">Tentar Auto-Discovery novamente</button>

        <script>
           function saveAndRestart() {
              const val = document.getElementById('targetIp').value;
              if (val && window.electronAPI && window.electronAPI.setTargetIp) {
                  window.electronAPI.setTargetIp(val).then(() => {
                     location.href = val;
                  });
              } else if (val) {
                 location.href = val;
              }
           }
        </script>
      </body>
      </html>
    \`;`;

content = content.replace(errorHtmlFind, errorHtmlReplace);

fs.writeFileSync('electron-main.cjs', content);
