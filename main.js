// ═══════════════════════════════════════════════════════════
//  ⚠️  VELOPACK INIT — DEBE SER LA PRIMERA LÍNEA DEL ARCHIVO
//  Maneja hooks de instalación/desinstalación del OS
// ═══════════════════════════════════════════════════════════
const { VelopackApp, UpdateManager } = require('velopack');
VelopackApp.build().run();

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { start } = require('./server');

let mainWindow;

// ═══════════════════════════════════════════
//  AUTO-UPDATE — Configuración Híbrida
//  Intenta Velopack primero, luego fallback via GitHub API
// ═══════════════════════════════════════════
const UPDATE_URL = 'https://github.com/CurielOficialll/Elbrother';
const GITHUB_API_RELEASES = 'https://api.github.com/repos/CurielOficialll/Elbrother/releases/latest';
let _velopackAvailable = false;

function getUpdateManager() {
  try {
    const um = new UpdateManager(UPDATE_URL);
    _velopackAvailable = true;
    return um;
  } catch (e) {
    console.log('[UPDATE] Velopack no disponible:', e.message);
    _velopackAvailable = false;
    return null;
  }
}

// --- Fallback: comparar versiones semver ---
function compareVersions(current, remote) {
  const parseVer = (v) => v.replace(/^v/, '').split('.').map(Number);
  const c = parseVer(current);
  const r = parseVer(remote);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (c[i] || 0)) return 1;  // remote es mayor
    if ((r[i] || 0) < (c[i] || 0)) return -1; // current es mayor
  }
  return 0; // iguales
}

// --- Fallback: verificar updates via GitHub API ---
async function checkUpdatesViaGitHub() {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/CurielOficialll/Elbrother/releases/latest',
      headers: { 'User-Agent': 'Elbrother-POS-Updater' }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const remoteVersion = (release.tag_name || '').replace(/^v/, '');
          const currentVersion = app.getVersion();
          if (remoteVersion && compareVersions(currentVersion, remoteVersion) > 0) {
            const setupAsset = release.assets?.find(a => a.name === 'elbrother-win-Setup.exe');
            const portableAsset = release.assets?.find(a => a.name === 'elbrother-win-Portable.zip');
            const asset = setupAsset || portableAsset;
            resolve({
              version: remoteVersion,
              currentVersion,
              htmlUrl: release.html_url,
              downloadUrl: asset?.browser_download_url || release.html_url,
              assetName: asset?.name || 'release',
              assetSize: asset?.size || 0,
              isGitHubFallback: true
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// --- Fallback: descargar archivo desde URL con redirecciones y progreso ---
let _downloadedInstallerPath = null;

function downloadFileWithProgress(url, destPath, totalSize) {
  const https = require('https');
  const http = require('http');
  return new Promise((resolve, reject) => {
    const makeRequest = (requestUrl) => {
      const client = requestUrl.startsWith('https') ? https : http;
      client.get(requestUrl, { headers: { 'User-Agent': 'Elbrother-POS-Updater' } }, (res) => {
        // Manejar redirecciones (GitHub usa 302)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`[UPDATE-GH] Redirigiendo a: ${res.headers.location.substring(0, 80)}...`);
          makeRequest(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const fileSize = parseInt(res.headers['content-length'] || totalSize || 0, 10);
        const file = fs.createWriteStream(destPath);
        let downloaded = 0;
        let lastProgress = 0;

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          file.write(chunk);
          if (fileSize > 0) {
            const progress = Math.round((downloaded / fileSize) * 100);
            if (progress !== lastProgress) {
              lastProgress = progress;
              mainWindow?.webContents.send('update-progress', progress);
            }
          }
        });

        res.on('end', () => {
          file.end();
          mainWindow?.webContents.send('update-progress', 100);
          console.log(`[UPDATE-GH] Descarga completada: ${destPath}`);
          resolve(destPath);
        });

        res.on('error', (e) => {
          file.end();
          fs.unlinkSync(destPath);
          reject(e);
        });
      }).on('error', reject);
    };
    makeRequest(url);
  });
}

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

// ═══════════════════════════════════════════
//  IPC HANDLERS — Base de Datos
// ═══════════════════════════════════════════
ipcMain.handle('get-db-path', () => getSavedDbPath());
ipcMain.handle('get-app-version', () => app.getVersion());

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

// ═══════════════════════════════════════════
//  IPC HANDLERS — Auto-Update (Híbrido: Velopack + GitHub Fallback)
// ═══════════════════════════════════════════

ipcMain.handle('check-for-updates', async () => {
  // 1) Intentar Velopack primero
  const um = getUpdateManager();
  if (um) {
    try {
      const update = await um.checkForUpdatesAsync();
      if (update) {
        console.log(`[UPDATE-VP] Nueva versión disponible: ${update.targetFullRelease.version}`);
        return update;
      }
      console.log('[UPDATE-VP] La app está actualizada');
    } catch (e) {
      console.error('[UPDATE-VP] Error al verificar:', e.message);
    }
  }

  // 2) Fallback: consultar GitHub API directamente
  try {
    console.log('[UPDATE-GH] Verificando via GitHub API...');
    const ghUpdate = await checkUpdatesViaGitHub();
    if (ghUpdate) {
      console.log(`[UPDATE-GH] Nueva versión disponible: v${ghUpdate.version}`);
      return ghUpdate;
    }
    console.log('[UPDATE-GH] La app está actualizada');
    return null;
  } catch (e) {
    console.error('[UPDATE-GH] Error al verificar:', e.message);
    return null;
  }
});

ipcMain.handle('download-updates', async (event, updateInfo) => {
  // GitHub fallback: descargar el instalador internamente
  if (updateInfo?.isGitHubFallback) {
    try {
      const os = require('os');
      const tempDir = path.join(os.tmpdir(), 'elbrother-updates');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const destPath = path.join(tempDir, updateInfo.assetName || 'elbrother-win-Setup.exe');
      // Limpiar descarga anterior si existe
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);

      console.log(`[UPDATE-GH] Descargando ${updateInfo.downloadUrl}`);
      console.log(`[UPDATE-GH] Destino: ${destPath}`);
      await downloadFileWithProgress(updateInfo.downloadUrl, destPath, updateInfo.assetSize);
      _downloadedInstallerPath = destPath;
      return true;
    } catch (e) {
      console.error('[UPDATE-GH] Error al descargar:', e.message);
      return false;
    }
  }

  // Velopack flow
  const um = getUpdateManager();
  if (!um) return false;
  try {
    console.log('[UPDATE-VP] Descargando actualización...');
    await um.downloadUpdates(updateInfo, (progress) => {
      mainWindow?.webContents.send('update-progress', progress);
    });
    console.log('[UPDATE-VP] Descarga completada');
    return true;
  } catch (e) {
    console.error('[UPDATE-VP] Error al descargar:', e.message);
    return false;
  }
});

ipcMain.handle('apply-updates', async (event, updateInfo) => {
  // GitHub fallback: ejecutar el instalador descargado y cerrar la app
  if (updateInfo?.isGitHubFallback) {
    if (!_downloadedInstallerPath || !fs.existsSync(_downloadedInstallerPath)) {
      console.error('[UPDATE-GH] No se encontró el instalador descargado');
      return false;
    }
    try {
      console.log(`[UPDATE-GH] Ejecutando instalador: ${_downloadedInstallerPath}`);
      const { spawn } = require('child_process');
      // Ejecutar el instalador de forma desacoplada del proceso actual
      const child = spawn(_downloadedInstallerPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      // Cerrar la app después de un breve delay
      setTimeout(() => {
        app.quit();
      }, 1000);
      return true;
    } catch (e) {
      console.error('[UPDATE-GH] Error al ejecutar instalador:', e.message);
      return false;
    }
  }

  // Velopack flow
  const um = getUpdateManager();
  if (!um) return false;
  try {
    console.log('[UPDATE-VP] Aplicando actualización y reiniciando...');
    await um.applyUpdatesAndRestart(updateInfo);
    return true;
  } catch (e) {
    console.error('[UPDATE-VP] Error al aplicar:', e.message);
    return false;
  }
});

// Exponer si Velopack está realmente activo
ipcMain.handle('is-velopack-available', () => _velopackAvailable);

// ═══════════════════════════════════════════
//  ARRANQUE DE LA APP
// ═══════════════════════════════════════════
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
    dialog.showErrorBox(
      'Error de Inicio',
      `No se pudo iniciar el servidor interno:\n\n${err.message}\n\nEl programa se cerrará.`
    );
    app.quit();
  }

  // ═══════════════════════════════════════════
  //  AUTO-CHECK — Verificar updates 15s después del arranque
  //  Usa sistema híbrido (Velopack + GitHub fallback)
  // ═══════════════════════════════════════════
  setTimeout(async () => {
    try {
      // Intentar Velopack
      const um = getUpdateManager();
      if (um) {
        const update = await um.checkForUpdatesAsync();
        if (update) {
          console.log(`[UPDATE-VP] Auto-check: v${update.targetFullRelease.version} disponible`);
          mainWindow?.webContents.send('update-available', {
            version: update.targetFullRelease.version,
            updateInfo: update
          });
          return;
        }
      }
      // Fallback GitHub
      const ghUpdate = await checkUpdatesViaGitHub();
      if (ghUpdate) {
        console.log(`[UPDATE-GH] Auto-check: v${ghUpdate.version} disponible`);
        mainWindow?.webContents.send('update-available', {
          version: ghUpdate.version,
          updateInfo: ghUpdate
        });
      }
    } catch (e) {
      console.log('[UPDATE] Auto-check falló (ignorado):', e.message);
    }
  }, 15000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
