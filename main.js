const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { VelopackApp, UpdateManager } = require('velopack');
const { start } = require('./server');

// Velopack initialization must be the first thing to run
VelopackApp.build().run();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: "Elbrother POS",
    icon: path.join(__dirname, 'public', 'favicon.ico'), // Asegúrate de que exista o quita esta línea
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // En producción, podrías querer quitar la barra de menú
  // mainWindow.setMenu(null);

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// IPC Handlers for Velopack Updates
const updateUrl = "https://github.com/CurielOficialll/Elbrother";
let um = null;

if (app.isPackaged) {
  try {
    um = new UpdateManager(updateUrl);
  } catch (e) {
    console.error("Velopack could not be initialized:", e);
  }
}

ipcMain.handle('check-for-updates', async () => {
  if (!um) return null; // No updates in dev mode
  try {
    const updateInfo = await um.checkForUpdatesAsync();
    return updateInfo;
  } catch (err) {
    console.error('Error checking for updates:', err);
    throw err;
  }
});

ipcMain.handle('download-update', async (event, updateInfo) => {
  if (!um) return false;
  try {
    await um.downloadUpdatesAsync(updateInfo);
    return true;
  } catch (err) {
    console.error('Error downloading update:', err);
    throw err;
  }
});

ipcMain.handle('apply-update', async (event, updateInfo) => {
  if (!um) return;
  try {
    await um.applyUpdatesAndRestart(updateInfo);
  } catch (err) {
    console.error('Error applying update:', err);
    throw err;
  }
});

app.whenReady().then(async () => {
  // Start the Express server
  try {
    const dbPath = path.join(app.getPath('userData'), 'database', 'elbrother.db');
    await start({ dbPath });
    createWindow();
  } catch (err) {
    console.error('Failed to start server:', err);
    app.quit();
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
