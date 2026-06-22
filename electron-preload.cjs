// preload.cjs
// Ponte segura entre Electron (main) e React (renderer)
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setTargetIp: (ip) => ipcRenderer.invoke("set-target-ip", ip),
  getLocalHardware: () => ipcRenderer.invoke("get-local-hardware"),
  openUrl: (url) => ipcRenderer.invoke("open-url", url),
  runCommand: (cmd) => ipcRenderer.invoke("run-local-command", cmd),
  executeLocalCommand: (data) => ipcRenderer.invoke("execute-local-command", data),

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
