const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('elbrother', {
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  selectDbPath: () => ipcRenderer.invoke('select-db-path'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron: true
});
