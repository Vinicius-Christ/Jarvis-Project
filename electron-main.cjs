// electron-main.cjs
// JARVIS System Suite - Desktop Application Entry Point
// Production-ready version with error handling, health checks, and security best practices

const { app, BrowserWindow, Menu, Tray, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const CONFIG = {
  SERVER_URL: process.env.JARVIS_EXTERNAL_IP || 'http://localhost:3000',
  SERVER_HEALTH_PATH: '/health',
  SERVER_START_TIMEOUT: 60000, // 60 segundos
  SERVER_HEALTH_CHECK_INTERVAL: 2000, // 2 segundos
  SERVER_HEALTH_CHECK_RETRIES: 30, // 30 * 2 = 60 segundos total
  WINDOW_WIDTH: 1280,
  WINDOW_HEIGHT: 800,
  SPLASH_DURATION: 8000, // 8 segundos
};

// Se existir um arquivo jarvis-target.txt ao lado do executável, lê o IP dele
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
} catch (e) {}

// ============================================
// STATE MANAGEMENT
// ============================================

let mainWindow = null;
let splashWindow = null;
let serverProcess = null;
let tray = null;
let isQuitting = false;
let serverHealthy = false;

// ============================================
// LOGGING
// ============================================

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;
  
  switch(type) {
    case 'error':
      console.error(`${prefix} ❌ ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️  ${message}`);
      break;
    case 'success':
      console.log(`${prefix} ✅ ${message}`);
      break;
    default:
      console.log(`${prefix} ℹ️  ${message}`);
  }
};

// ============================================
// UTILITY: HEALTH CHECK
// ============================================

const checkServerHealth = (url, retries = CONFIG.SERVER_HEALTH_CHECK_RETRIES) => {
  return new Promise((resolve, reject) => {
    const attemptConnection = (remainingRetries) => {
      if (remainingRetries === 0) {
        reject(new Error(`Server health check failed after ${CONFIG.SERVER_HEALTH_CHECK_RETRIES} attempts`));
        return;
      }

      const request = http.get(url, { timeout: 3000 }, (res) => {
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              serverHealthy = true;
              log(`Server health check passed: ${JSON.stringify(json)}`, 'success');
              resolve(json);
            } catch (e) {
              setTimeout(() => attemptConnection(remainingRetries - 1), CONFIG.SERVER_HEALTH_CHECK_INTERVAL);
            }
          });
        } else {
          setTimeout(() => attemptConnection(remainingRetries - 1), CONFIG.SERVER_HEALTH_CHECK_INTERVAL);
        }
      });

      request.on('error', (err) => {
        log(`Health check attempt failed: ${err.message}`, 'warn');
        setTimeout(() => attemptConnection(remainingRetries - 1), CONFIG.SERVER_HEALTH_CHECK_INTERVAL);
      });

      request.on('timeout', () => {
        request.destroy();
        setTimeout(() => attemptConnection(remainingRetries - 1), CONFIG.SERVER_HEALTH_CHECK_INTERVAL);
      });
    };

    attemptConnection(retries);
  });
};

// ============================================
// UTILITY: GET TRAY ICON
// ============================================

const getTrayIcon = () => {
    // Tentativa 1: Ícone da pasta dist
  const distIconPath = path.join(__dirname, 'dist', 'favicon.png');
  const fallbackIcon1Path = path.join(__dirname, 'dist', 'favicon.ico');
  if (fs.existsSync(distIconPath)) {
    try {
      log(`Using tray icon from: ${distIconPath}`, 'success');
      return distIconPath;
    } catch (e) {
      log(`Failed to load tray icon from dist: ${e.message}`, 'warn');
    }
  } else if (fs.existsSync(fallbackIcon1Path)) {
    return fallbackIcon1Path;
  }

  // Tentativa 2: Ícone da pasta assets
  const assetsIconPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(assetsIconPath)) {
    try {
      log(`Using tray icon from: ${assetsIconPath}`, 'success');
      return assetsIconPath;
    } catch (e) {
      log(`Failed to load tray icon from assets: ${e.message}`, 'warn');
    }
  }

  // Tentativa 3: Usar ícone do sistema (último recurso)
  if (process.platform === 'win32') {
    const systemIcon = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'System32', 'moricons.dll');
    log(`Using Windows system icon as fallback`, 'warn');
    return systemIcon;
  }

  if (process.platform === 'darwin') {
    log(`macOS will use default icon`, 'warn');
    return undefined; // macOS não requer ícone explícito
  }

  log(`Linux will use default icon`, 'warn');
  return undefined;
};

// ============================================
// UTILITY: START SERVER PROCESS
// ============================================

const startServerProcess = () => {
  return new Promise((resolve, reject) => {
    log('Starting Node.js server process...', 'info');

    try {
      serverProcess = spawn('node', ['dist/server.cjs'], {
        cwd: app.getAppPath(),
        stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout/stderr
        shell: false, // ✅ SEGURANÇA: Não usar shell
        timeout: CONFIG.SERVER_START_TIMEOUT
      });

      // Capture stdout
      serverProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          log(`[Server] ${message}`, 'info');
        }
      });

      // Capture stderr
      serverProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
          log(`[Server] ${message}`, 'error');
        }
      });

      // Handle process errors
      serverProcess.on('error', (err) => {
        log(`Failed to start server process: ${err.message}`, 'error');
        reject(err);
      });

      // Handle process exit
      serverProcess.on('exit', (code, signal) => {
        if (!isQuitting) {
          log(`Server process exited with code ${code} and signal ${signal}`, 'warn');
          serverHealthy = false;
          
          // Notificar usuário se servidor morreu inesperadamente
          if (mainWindow && !isQuitting) {
            mainWindow.webContents.send('server-crashed', { code, signal });
          }
        }
      });

      // Aguardar server estar pronto
      checkServerHealth(CONFIG.SERVER_URL + CONFIG.SERVER_HEALTH_PATH)
        .then((health) => {
          log('Server is healthy and ready', 'success');
          resolve(serverProcess);
        })
        .catch((err) => {
          log(`Server health check failed: ${err.message}`, 'error');
          if (serverProcess) {
            serverProcess.kill();
          }
          reject(err);
        });

    } catch (err) {
      log(`Exception starting server: ${err.message}`, 'error');
      reject(err);
    }
  });
};

// ============================================
// UTILITY: CREATE SPLASH SCREEN
// ============================================

const createSplashScreen = () => {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    center: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: radial-gradient(circle, #1a1a2e, #0f0f1e);
          font-family: 'Segoe UI', sans-serif;
          color: #00d4ff;
        }
        .container {
          text-align: center;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        }
        .title {
          font-size: 24px;
          font-weight: 300;
          margin-bottom: 30px;
          letter-spacing: 2px;
        }
        .loading {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00d4ff;
          animation: bounce 1.4s infinite;
        }
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">◆</div>
        <div class="title">JARVIS</div>
        <div class="loading">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
};

// ============================================
// CREATE MAIN WINDOW
// ============================================

const createWindow = async () => {
  log('Creating main application window...', 'info');

  mainWindow = new BrowserWindow({
    width: CONFIG.WINDOW_WIDTH,
    height: CONFIG.WINDOW_HEIGHT,
    center: true,
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    title: 'JARVIS Core Suite v5.0',
    icon: path.join(__dirname, 'dist', 'favicon.png'),
    show: false, // Don't show until ready-to-show
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Must be false to allow preload to work properly in certain scenarios, or keep true if preload handles it
      preload: path.join(__dirname, 'electron-preload.cjs') // IPC preload script
    }
  });

  // Handle ready-to-show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    log('Main window is ready', 'success');
  });

  // Try to load the app
  try {
    await mainWindow.loadURL(CONFIG.SERVER_URL);
    log('Loaded application URL', 'success');
  } catch (err) {
    log(`Failed to load URL: ${err.message}`, 'error');
    
    // Show error page
    const errorHtml = `
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
        <p><strong>Erro:</strong> ${err.message}</p>
        <p>Tente:</p>
        <code>1. Reinicie a aplicação</code>
        <code>2. Verifique se Docker está rodando</code>
        <code>3. Verifique os logs: docker compose logs</code>
        <button onclick="location.reload()">Tentar Novamente</button>
      </body>
      </html>
    `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window close (minimize to tray instead)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (process.platform === 'win32') {
        mainWindow.setSkipTaskbar(true);
      }
    }
  });

  // Handle render process crash
  mainWindow.webContents.on('crashed', () => {
    log('Render process crashed', 'error');
    dialog.showErrorBox('Erro', 'A aplicação encontrou um erro. Reiniciando...');
    if (!isQuitting) {
      mainWindow.reload();
    }
  });

  // Handle unresponsive
  mainWindow.webContents.on('unresponsive', () => {
    log('Render process became unresponsive', 'warn');
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Aguardar', 'Sair'],
      message: 'A aplicação não está respondendo',
      detail: 'Deseja aguardar ou sair?'
    });
    
    if (choice === 1) {
      isQuitting = true;
      app.quit();
    }
  });

  // Handle responsive again
  mainWindow.webContents.on('responsive', () => {
    log('Render process became responsive', 'success');
  });
};

// ============================================
// CREATE TRAY ICON & MENU
// ============================================

const createTray = () => {
  log('Creating system tray...', 'info');

  try {
    const iconPath = getTrayIcon();
    
    if (iconPath) {
      tray = new Tray(iconPath);
    } else {
      // Criar espaço reservado no tray mesmo sem ícone
      tray = new Tray(path.join(__dirname, 'dist', 'favicon.png'));
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'JARVIS Core Suite v5.0',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Exibir',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            if (process.platform === 'win32') {
              mainWindow.setSkipTaskbar(false);
            }
            mainWindow.focus();
          }
        }
      },
      {
        label: `Status: ${serverHealthy ? '✅ Online' : '⚠️  Offline'}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Pausar Containers',
        click: () => {
          log('Pause requested from tray', 'info');
          if (mainWindow) {
            mainWindow.webContents.send('docker-command', { action: 'pause' });
          }
        }
      },
      {
        label: 'Retomar Containers',
        click: () => {
          log('Resume requested from tray', 'info');
          if (mainWindow) {
            mainWindow.webContents.send('docker-command', { action: 'resume' });
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Sair',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('JARVIS - Sistema Assistente Local');
    tray.setContextMenu(contextMenu);

    // Double-click to show window
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        if (process.platform === 'win32') {
          mainWindow.setSkipTaskbar(false);
        }
        mainWindow.focus();
      }
    });

    log('System tray created successfully', 'success');

  } catch (err) {
    log(`Failed to create tray: ${err.message}`, 'error');
    // Não falha fatalmente - app continua sem tray
  }
};

// ============================================
// IPC HANDLERS (Electron ↔ React Communication)
// ============================================

const setupIpcHandlers = () => {
  // Handler: Get server status
  ipcMain.handle('get-server-status', () => {
    return {
      healthy: serverHealthy,
      url: CONFIG.SERVER_URL
    };
  });

  // Handler: Execute docker command (com validação)
  ipcMain.handle('docker-command', (event, command) => {
    const allowedCommands = ['pause', 'resume', 'restart'];
    
    if (!allowedCommands.includes(command)) {
      return { error: 'Invalid command' };
    }

    log(`Docker command requested: ${command}`, 'info');
    // Aqui você implementaria a chamada real do docker
    // Sem shell injection risk
    const { spawnSync } = require('child_process');
    spawnSync('docker', ['compose', command], {
      cwd: app.getAppPath()
    });
    
    return { success: true, command };
  });

  ipcMain.handle('get-local-hardware', async () => {
    // Executa e retorna hardware state offline do windows
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec('wmic cpu get loadpercentage /value', (error, stdout) => {
        let cpuUsage = 0;
        if (!error && stdout) {
          const match = stdout.match(/LoadPercentage=(\d+)/);
          if (match) cpuUsage = parseInt(match[1]);
        }
        resolve({
           cpu: cpuUsage,
           os: process.platform,
           appContext: "electron"
        });
      });
    });
  });

  ipcMain.handle('open-url', async (event, url) => {
    const { shell } = require('electron');
    return await shell.openExternal(url);
  });

  ipcMain.handle('run-local-command', async (event, command) => {
    // Whitelist for safety to prevent RCE
    const allowedPrefixes = ['start ', 'explorer', 'calc', 'notepad', 'ping', 'ipconfig', 'systeminfo'];
    const isAllowed = allowedPrefixes.some(prefix => command.toLowerCase().startsWith(prefix));
    
    if (!isAllowed) {
      return { error: 'Comando bloqueado por segurança (RCE protection). Adicione na whitelist se precisar.', stderr: '' };
    }

    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve({ error: error.message, stderr });
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  });
};

// ============================================
// APP LIFECYCLE
// ============================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('ready', async () => {
    log('═══════════════════════════════════════════════════', 'info');
    log('     JARVIS Core Suite v5.0 - Starting...', 'info');
    log('═══════════════════════════════════════════════════', 'info');

    try {
      createSplashScreen();
      
      const isLocalhost = CONFIG.SERVER_URL.includes('localhost') || CONFIG.SERVER_URL.includes('127.0.0.1');
      if (isLocalhost) {
        await startServerProcess();
        log('Node.js server started successfully', 'success');
      } else {
        log(`Connecting to remote JARVIS Server at ${CONFIG.SERVER_URL}`, 'info');
        // Check health of remote server before continuing
        await checkServerHealth(CONFIG.SERVER_URL + CONFIG.SERVER_HEALTH_PATH);
      }
      
      await createWindow();
      log('Main window created', 'success');
      createTray();
      setupIpcHandlers();
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
      }, CONFIG.SPLASH_DURATION);
    } catch (err) {
      log(`Fatal error during startup: ${err.message}`, 'error');
      dialog.showErrorBox('Erro Crítico', `Falha ao iniciar JARVIS:\n\n${err.message}`);
      process.exit(1);
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      if (isQuitting) {
        app.quit();
      }
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('quit', () => {
    log('═══════════════════════════════════════════════════', 'info');
    log('     JARVIS shutting down gracefully...', 'info');
    log('═══════════════════════════════════════════════════', 'info');

    if (serverProcess && !serverProcess.killed) {
      log('Terminating Node.js server process...', 'info');
      serverProcess.kill('SIGTERM');

      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          log('Force killing server process', 'warn');
          serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }

    log('JARVIS shutdown complete', 'success');
  });

  process.on('uncaughtException', (err) => {
    log(`Uncaught exception: ${err.message}`, 'error');
    log(`Stack: ${err.stack}`, 'error');
    dialog.showErrorBox('Erro Não Tratado', err.message);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'error');
  });
}

module.exports = { app };
