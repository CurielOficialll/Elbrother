const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, update, onValue, remove, serverTimestamp } = require('firebase/database');
const os = require('os');
const osUtils = require('os-utils');
const { app, dialog, BrowserWindow } = require('electron');
const { exec } = require('child_process');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuración de Firebase (Torre Central)
const firebaseConfig = {
  projectId: "torre-central-curiel-2026",
  appId: "1:741885784555:web:9c10a2e1bb2c5c584c69ae",
  storageBucket: "torre-central-curiel-2026.firebasestorage.app",
  apiKey: "AIzaSyCqcP9jLcYkBpWkw5Wg3GGZ5vEgygUzY88",
  authDomain: "torre-central-curiel-2026.firebaseapp.com",
  messagingSenderId: "741885784555",
  databaseURL: "https://torre-central-curiel-2026-default-rtdb.firebaseio.com"
};

class TorreAgent {
  constructor() {
    this.db = null;
    this.machineId = this.generateMachineId();
    this.heartbeatInterval = null;
    this.metricsInterval = null;
    this.isInitialized = false;
    this.updateInfo = null;      // Última info de actualización disponible
    this.isDownloading = false;  // Flag para evitar descargas duplicadas
    this.remoteConfig = {};      // Config remota desde Firebase
  }

  generateMachineId() {
    const hostname = os.hostname();
    const username = os.userInfo().username;
    return `${hostname}-${username}`.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  }

  async init() {
    if (this.isInitialized) return;

    try {
      const firebaseApp = initializeApp(firebaseConfig);
      this.db = getDatabase(firebaseApp);
      this.isInitialized = true;
      
      console.log(`[Torre Central] Agente vinculado: ${this.machineId}`);
      
      this.startHeartbeat();
      this.startMetricsReporting();
      this.startSalesReport();
      this.listenForCommands();
      this.reportInitialInfo();
      this.listenForUpdates();
      this.listenForRemoteConfig();
    } catch (err) {
      console.error('[Torre Central] Error en inicialización:', err.message);
    }
  }

  // ═══════════════════════════════════════════
  //  INFO & HEARTBEAT (existente)
  // ═══════════════════════════════════════════

  async reportInitialInfo() {
    const info = {
      name: os.hostname(),
      username: os.userInfo().username,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      version: app.getVersion(),
      lastStart: serverTimestamp()
    };
    
    try {
      await update(ref(this.db, `nodes/${this.machineId}/info`), info);
    } catch (e) {}
  }

  startHeartbeat() {
    const updateStatus = () => {
      try {
        update(ref(this.db, `nodes/${this.machineId}/status`), {
          online: true,
          lastSeen: serverTimestamp()
        });
      } catch (e) {}
    };

    updateStatus();
    this.heartbeatInterval = setInterval(updateStatus, 60000);
  }

  startMetricsReporting() {
    const reportMetrics = () => {
      osUtils.cpuUsage((v) => {
        const cpu = Math.round(v * 100);
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const ram = Math.round(((totalMem - freeMem) / totalMem) * 100);

        try {
          update(ref(this.db, `nodes/${this.machineId}/metrics`), {
            cpu,
            ram,
            uptime: Math.round(os.uptime()),
            timestamp: serverTimestamp()
          });
        } catch (e) {}
      });
    };

    reportMetrics();
    this.metricsInterval = setInterval(reportMetrics, 30000);
  }

  startSalesReport() {
    const reportSales = async () => {
      try {
        const { getDb } = require('../database/connection');
        const db = getDb();
        if (!db) return;

        const row = db.prepare(`
          SELECT 
            SUM(total) as total_usd, 
            SUM(total_bs) as total_bs,
            COUNT(*) as count 
          FROM sales 
          WHERE date(created_at, 'localtime') = date('now', 'localtime')
          AND status = 'completed'
        `).get();

        if (row) {
          update(ref(this.db, `nodes/${this.machineId}/sales_summary`), {
            total_usd: row.total_usd || 0,
            total_bs: row.total_bs || 0,
            count: row.count || 0,
            lastUpdate: serverTimestamp()
          });
        }
      } catch (err) {
        console.error('[Torre Central] Error en reporte de ventas:', err.message);
      }
    };

    reportSales();
    setInterval(reportSales, 300000);
  }

  // ═══════════════════════════════════════════
  //  COMANDOS REMOTOS (existente)
  // ═══════════════════════════════════════════

  listenForCommands() {
    const { onChildAdded } = require('firebase/database');
    const commandsRef = ref(this.db, `commands/${this.machineId}`);
    
    // onChildAdded solo se dispara para comandos nuevos, evitando procesar varias veces si la conexión parpadea o hay varios en cola
    onChildAdded(commandsRef, (snapshot) => {
      const cmd = snapshot.val();
      if (cmd) {
        this.executeCommand(cmd, snapshot.key);
      }
    });
  }

  async executeCommand(cmd, cmdId) {
    console.log(`[Torre Central] Ejecutando comando remoto: ${cmd.type}`);
    
    try {
      switch (cmd.type) {
        case 'SHOW_MESSAGE':
          dialog.showMessageBox({
            type: 'info',
            title: 'Mensaje de Torre Central',
            message: cmd.payload?.message || 'Sin mensaje',
            buttons: ['Entendido']
          });
          break;
        
        case 'FORCE_QUIT':
          console.log('[Torre Central] App quit command received.');
          app.quit();
          break;

        case 'RESTART_APP':
          app.relaunch();
          app.exit(0);
          break;

        case 'EXEC_SHELL':
          const command = cmd.payload?.command;
          if (command) {
            exec(command, (error, stdout, stderr) => {
              const output = error ? stderr : stdout;
              set(ref(this.db, `responses/${this.machineId}/${cmdId}`), {
                output: output || 'Comando ejecutado (sin salida)',
                error: !!error,
                timestamp: serverTimestamp()
              });
            });
          }
          break;

        case 'FORCE_UPDATE':
          // Forzar chequeo e instalación de actualización
          this.checkForUpdatesNow();
          break;
          
        default:
          console.log('Comando no reconocido:', cmd.type);
      }
    } catch (err) {
      console.error('Error ejecutando comando:', err);
    }

    // Limpiar el comando una vez procesado
    try {
      await remove(ref(this.db, `commands/${this.machineId}/${cmdId}`));
    } catch (e) {}
  }

  // ═══════════════════════════════════════════
  //  SISTEMA DE ACTUALIZACIONES (NUEVO)
  // ═══════════════════════════════════════════

  listenForUpdates() {
    onValue(ref(this.db, 'updates/latest'), (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const currentVersion = app.getVersion();
      const remoteVersion = data.version;

      if (this.isNewerVersion(remoteVersion, currentVersion)) {
        console.log(`[Torre Central] Nueva versión disponible: v${remoteVersion} (actual: v${currentVersion})`);
        
        this.updateInfo = {
          version: remoteVersion,
          url: data.urlDescarga,
          fileName: data.nombreArchivo,
          mandatory: data.obligatoria,
          notes: data.notas,
          size: data.tamanoBytes
        };

        // Si es obligatoria, iniciar descarga automáticamente
        if (data.obligatoria) {
          console.log('[Torre Central] Actualización OBLIGATORIA — iniciando descarga automática');
          this.downloadAndApplyUpdate();
        }

        // Reportar que hay actualización pendiente
        update(ref(this.db, `nodes/${this.machineId}/updateStatus`), {
          pendingVersion: remoteVersion,
          status: data.obligatoria ? 'auto_downloading' : 'available',
          timestamp: serverTimestamp()
        });
      }
    });
  }

  /**
   * Compara dos versiones semver. Retorna true si remoteVersion > currentVersion
   */
  isNewerVersion(remote, current) {
    try {
      const r = remote.split('.').map(Number);
      const c = current.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((r[i] || 0) > (c[i] || 0)) return true;
        if ((r[i] || 0) < (c[i] || 0)) return false;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Obtener info de actualización disponible (para IPC desde el frontend)
   */
  getUpdateInfo() {
    return this.updateInfo;
  }

  /**
   * Fuerza chequeo inmediato de actualizaciones
   */
  async checkForUpdatesNow() {
    if (!this.updateInfo) return null;
    if (!this.isDownloading) {
      await this.downloadAndApplyUpdate();
    }
    return this.updateInfo;
  }

  /**
   * Descarga el instalador desde Firebase Storage y lo ejecuta silenciosamente
   */
  async downloadAndApplyUpdate() {
    if (this.isDownloading || !this.updateInfo) return;
    this.isDownloading = true;

    const { url, version, fileName } = this.updateInfo;
    const tempDir = app.getPath('temp');
    const downloadPath = path.join(tempDir, fileName || `ElbrotherPOS-Setup-${version}.exe`);

    console.log(`[Torre Central] Descargando actualización v${version}...`);
    console.log(`[Torre Central] Destino: ${downloadPath}`);

    // Reportar estado
    await this.reportUpdateStatus('downloading', version);

    try {
      // Descargar archivo
      await this.downloadFile(url, downloadPath);

      console.log(`[Torre Central] Descarga completada: ${downloadPath}`);
      await this.reportUpdateStatus('downloaded', version);

      // Verificar que el archivo existe y tiene tamaño razonable
      const stats = fs.statSync(downloadPath);
      if (stats.size < 1000000) { // Menor a 1MB = algo salió mal
        throw new Error(`Archivo descargado muy pequeño: ${stats.size} bytes`);
      }

      console.log(`[Torre Central] Archivo verificado: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
      await this.reportUpdateStatus('installing', version);

      // Mostrar aviso al usuario
      const window = BrowserWindow.getAllWindows()[0];
      if (window) {
        dialog.showMessageBox(window, {
          type: 'info',
          title: 'Actualización de Elbrother POS',
          message: `Se instalará la versión ${version}.\nLa aplicación se reiniciará automáticamente.`,
          buttons: ['Entendido']
        }).then(() => {
          // Ejecutar el instalador NSIS en modo silencioso
          this.executeInstaller(downloadPath, version);
        });
      } else {
        this.executeInstaller(downloadPath, version);
      }

    } catch (err) {
      console.error('[Torre Central] Error en actualización:', err.message);
      this.isDownloading = false;
      await this.reportUpdateStatus('error', version, err.message);
    }
  }

  /**
   * Ejecuta el instalador NSIS con flags silenciosos
   */
  executeInstaller(installerPath, version) {
    // NSIS oneClick con /S para silent install
    // El instalador NSIS cierra la app vieja automáticamente y la relanza
    const cmd = `"${installerPath}" /S`;
    
    console.log(`[Torre Central] Ejecutando instalador: ${cmd}`);

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('[Torre Central] Error al ejecutar instalador:', error.message);
        this.reportUpdateStatus('install_error', version, error.message);
        this.isDownloading = false;
      }
      // Si el instalador se ejecutó correctamente, la app se cerrará y reabrirá
      // con la nueva versión. Al reiniciar, reportará la nueva versión en reportInitialInfo()
    });
  }

  /**
   * Descarga un archivo desde una URL a una ruta local
   */
  downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, (response) => {
        // Seguir redirects (Firebase Storage devuelve 302)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlinkSync(destPath);
          return this.downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`HTTP ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
        let downloadedBytes = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            // Reportar progreso cada 10%
            if (percent % 10 === 0) {
              update(ref(this.db, `nodes/${this.machineId}/updateStatus`), {
                progress: percent,
                downloadedMB: (downloadedBytes / 1024 / 1024).toFixed(1),
                totalMB: (totalBytes / 1024 / 1024).toFixed(1)
              }).catch(() => {});
            }
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(resolve);
        });
      });

      request.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        reject(err);
      });

      // Timeout de 10 minutos para archivos grandes
      request.setTimeout(600000, () => {
        request.destroy();
        file.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        reject(new Error('Timeout de descarga'));
      });
    });
  }

  async reportUpdateStatus(status, version, error = null) {
    try {
      const data = {
        status,
        version,
        timestamp: serverTimestamp()
      };
      if (error) data.error = error;

      await update(ref(this.db, `nodes/${this.machineId}/updateStatus`), data);
    } catch (e) {}
  }

  // ═══════════════════════════════════════════
  //  CONFIGURACIÓN REMOTA (NUEVO)
  // ═══════════════════════════════════════════

  listenForRemoteConfig() {
    onValue(ref(this.db, 'config'), (snapshot) => {
      const config = snapshot.val();
      if (!config) return;

      console.log('[Torre Central] Configuración remota recibida:', JSON.stringify(config));
      this.remoteConfig = config;

      // Sincronizar con SQLite local
      try {
        const { getDb } = require('../database/connection');
        const db = getDb();
        if (!db) return;

        // Mapeo de campos Firebase → SQLite system_config
        const mapping = {
          'nombreEmpresa': 'business_name',
          'moneda': 'currency',
          'monedaSecundaria': 'currency_secondary',
          'tasaIVA': 'tax_rate'
        };

        for (const [firebaseKey, sqliteKey] of Object.entries(mapping)) {
          if (config[firebaseKey] !== undefined) {
            let value = config[firebaseKey];
            
            // Convertir IVA de porcentaje a decimal (16 → 0.16)
            if (firebaseKey === 'tasaIVA') {
              value = (parseFloat(value) / 100).toString();
            } else {
              value = String(value);
            }

            db.prepare(
              "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))"
            ).run(sqliteKey, value);
          }
        }

        console.log('[Torre Central] Configuración local actualizada desde Firebase');

        // Notificar al frontend via Socket.IO si está disponible
        try {
          const io = require('../../server').io;
          if (io) io.emit('config:updated', config);
        } catch (e) {}

      } catch (err) {
        console.error('[Torre Central] Error sincronizando config:', err.message);
      }
    });
  }

  /**
   * Obtener configuración remota actual (para IPC)
   */
  getRemoteConfig() {
    return this.remoteConfig;
  }
}

module.exports = new TorreAgent();
