const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('elbrother', {
  // --- Base de Datos ---
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  selectDbPath: () => ipcRenderer.invoke('select-db-path'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron: true,

  // --- Auto-Update (Velopack) ---
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdates: (info) => ipcRenderer.invoke('download-updates', info),
  applyUpdates: (info) => ipcRenderer.invoke('apply-updates', info),
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, data) => callback(data));
  },
});
