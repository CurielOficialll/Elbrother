const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('velopack', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: (updateInfo) => ipcRenderer.invoke('download-update', updateInfo),
  applyUpdate: (updateInfo) => ipcRenderer.invoke('apply-update', updateInfo),
  isElectron: true
});
