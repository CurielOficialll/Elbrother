const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('velopack', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (updateInfo) => ipcRenderer.invoke('download-update', updateInfo),
  applyUpdate: (updateInfo) => ipcRenderer.invoke('apply-update', updateInfo),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  selectDbPath: () => ipcRenderer.invoke('select-db-path'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron: true
});
