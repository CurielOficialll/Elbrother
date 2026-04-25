const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('elbrother', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  selectDbPath: () => ipcRenderer.invoke('select-db-path'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getRemoteConfig: () => ipcRenderer.invoke('get-remote-config'),
  isElectron: true
});
