const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { VelopackApp, UpdateManager } = require('velopack');
const { start } = require('./server');

// Velopack initialization must be the first thing to run
VelopackApp.build().run();

let mainWindow;

// --- Configuración de Base de Datos ---
const configPath = path.join(app.getPath('userData'), 'config.json');

function getSavedDbPath() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.dbPath && fs.existsSync(path.dirname(config.dbPath))) {
        return config.dbPath;
      }
    }
  } catch (e) {
    console.error("Error reading config:", e);
  }
  // Default path in AppData
  return path.join(app.getPath('userData'), 'database', 'elbrother.db');
}

function saveDbPath(newPath) {
  try {
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    config.dbPath = newPath;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error("Error saving config:", e);
    return false;
  }
}

// Lógica de migración inicial
function runInitialMigration(targetPath) {
  const oldDbPath = path.join(__dirname, 'data', 'elbrother.db');
  
  if (!fs.existsSync(targetPath) && fs.existsSync(oldDbPath)) {
    try {
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(oldDbPath, targetPath);
      console.log('Migración exitosa desde carpeta local a:', targetPath);
    } catch (err) {
      console.error('Error en migración:', err);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: "Elbrother POS",
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// IPC Handlers for DB Management
ipcMain.handle('get-db-path', () => getSavedDbPath());

ipcMain.handle('select-db-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar Base de Datos',
    properties: ['openFile', 'createDirectory'],
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    defaultPath: getSavedDbPath()
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const newPath = result.filePaths[0];
    saveDbPath(newPath);
    return newPath;
  }
  return null;
});

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
  if (!um) return null;
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
  const dbPath = getSavedDbPath();
  
  // Ejecutar migración si es necesario
  runInitialMigration(dbPath);

  // Start the Express server
  try {
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
