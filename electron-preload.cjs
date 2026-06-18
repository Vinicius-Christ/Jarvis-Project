// preload.cjs
// Ponte segura entre Electron (main) e React (renderer)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getLocalHardware: () => ipcRenderer.invoke("get-local-hardware"),
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  runCommand: (cmd) => ipcRenderer.invoke("run-local-command", cmd),

  // Docker commands
  dockerCommand: (command) => ipcRenderer.invoke('docker-command', command),
  
  // Server status
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  
  // Listen for events from main
  onServerCrashed: (callback) => 
    ipcRenderer.on('server-crashed', (event, data) => callback(data)),
  
  onDockerStatus: (callback) => 
    ipcRenderer.on('docker-status', (event, data) => callback(data)),
  
  // Logging
  log: (message, type = 'info') => 
    ipcRenderer.send('log', { message, type })
});
