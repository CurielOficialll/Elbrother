window.SettingsPage = {
  async render() {
    try {
      const config = await API.get('/api/system/config');
      const currentVersion = window.elbrother ? await window.elbrother.getAppVersion() : 'dev';
      return `<div class="page-header"><h1 class="page-title">Configuración</h1></div>
      <div style="max-width:600px">

        <div class="card" style="margin-bottom:16px; border-top: 2px solid var(--primary)">
          <div class="card-header"><span class="card-title"><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px;color:var(--primary)">system_update</span>Actualizaciones</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--on-surface)">Versión actual: <span style="color:var(--primary);font-family:var(--font-mono)">v${currentVersion}</span></div>
              <div id="update-status-text" style="font-size:12px;color:var(--outline);margin-top:4px">Listo para verificar</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.checkUpdates()" id="check-update-btn">
              <span class="material-symbols-outlined">refresh</span>Buscar Actualizaciones
            </button>
          </div>
          <div id="update-result" class="hidden" style="margin-top:12px;padding:12px;background:var(--surface-highest);border-radius:var(--radius);border:1px solid var(--outline-variant)"></div>
        </div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">Sistema</span></div>
          <div class="form-group" style="margin-bottom:12px"><label class="form-label">Nombre del Negocio</label><input class="form-input" id="cfg-name" value="${config.business_name||'Elbrother'}"></div>
          <div class="form-row" style="margin-bottom:12px">
            <div class="form-group"><label class="form-label">IVA (%)</label><input class="form-input" type="number" step="0.01" id="cfg-tax" value="${(parseFloat(config.tax_rate||0.16)*100).toFixed(0)}"></div>
            <div class="form-group"><label class="form-label">Moneda</label><input class="form-input" id="cfg-currency" value="${config.currency||'USD'}"></div>
          </div>
          <button class="btn btn-primary" onclick="SettingsPage.saveConfig()"><span class="material-symbols-outlined">save</span>Guardar</button>
        </div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">Tasa BCV</span></div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <input type="number" step="0.0001" id="cfg-bcv" class="form-input" style="font-size:24px; width: 150px; font-weight: bold; color: var(--primary);" value="${config.bcv_rate||'36.50'}">
            <span style="font-size:24px; font-weight:bold; color: var(--primary);">Bs/$</span>
          </div>
          <div style="display:flex; gap: 8px;">
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.refreshBCV()" title="Actualizar desde el Banco Central">
              <span class="material-symbols-outlined">refresh</span>Actualizar Auto
            </button>
            <button class="btn btn-primary btn-sm" onclick="SettingsPage.saveManualBCV()" title="Guardar valor ingresado manualmente">
              <span class="material-symbols-outlined">save</span>Guardar Manual
            </button>
          </div>
        </div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">Ubicación de Base de Datos</span></div>
          <div style="margin-bottom:12px">
            <div id="db-path-display" style="font-family:monospace;font-size:12px;color:var(--on-surface-variant);margin-bottom:8px;word-break:break-all">${window.elbrother ? await window.elbrother.getDbPath() : 'Modo desarrollo'}</div>
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.changeDbPath()">
              <span class="material-symbols-outlined">folder_open</span>Cambiar Ubicación
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">Actividad Reciente</span></div>
          <div id="activity-log">Cargando...</div>
        </div>
      </div>`;
    } catch(e) { return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`; }
  },
  async afterRender() {
    try {
      const logs = await API.get('/api/system/activity-log');
      const el = document.getElementById('activity-log');
      if(el) el.innerHTML = logs.slice(0,5).map(l=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--outline-variant)"><div><span style="font-weight:600">${l.user_name||'Sistema'}</span> <span style="color:var(--outline)">${l.action}</span> <span style="color:var(--on-surface-variant)">${l.details||''}</span></div><span style="color:var(--outline);font-size:12px">${Format.timeAgo(l.created_at)}</span></div>`).join('')||'<p style="color:var(--outline)">Sin actividad</p>';
    } catch(e) {}
  },

  // ═══════════════════════════════════════════
  //  AUTO-UPDATE — Buscar manualmente
  // ═══════════════════════════════════════════
  async checkUpdates() {
    if (!window.elbrother || !window.elbrother.checkForUpdates) {
      Toast.info('Auto-update solo disponible en la versión instalada');
      return;
    }

    const btn = document.getElementById('check-update-btn');
    const statusText = document.getElementById('update-status-text');
    const resultDiv = document.getElementById('update-result');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span>Buscando...';
    }
    if (statusText) statusText.textContent = 'Verificando con el servidor...';

    try {
      const update = await window.elbrother.checkForUpdates();
      if (update) {
        const isGH = update.isGitHubFallback;
        const version = isGH ? update.version : update.targetFullRelease?.version;
        if (statusText) statusText.textContent = '¡Actualización encontrada!';
        if (resultDiv) {
          resultDiv.classList.remove('hidden');
          resultDiv.innerHTML = `
            <div style="display:flex;align-items:center;gap:12px">
              <span class="material-symbols-outlined" style="font-size:40px;color:var(--success)">upgrade</span>
              <div style="flex:1">
                <div style="font-weight:700;font-size:16px;color:var(--success)">v${version} disponible</div>
                <div style="font-size:12px;color:var(--outline);margin-top:4px">Descarga e instala la actualización desde aquí</div>
              </div>
              <button class="btn btn-success btn-sm" onclick="SettingsPage.installUpdate()" id="settings-update-btn">
                <span class="material-symbols-outlined">download</span>Descargar
              </button>
            </div>
            <div class="hidden" id="settings-update-progress" style="margin-top:12px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:12px;color:var(--on-surface-variant)" id="settings-update-status">Descargando...</span>
                <span style="font-size:12px;font-weight:700;color:var(--primary);margin-left:auto" id="settings-update-pct">0%</span>
              </div>
              <div style="width:100%;height:6px;background:var(--surface-highest);border-radius:3px;overflow:hidden">
                <div id="settings-update-bar" style="height:100%;width:0%;background:var(--primary);border-radius:3px;transition:width 0.3s ease"></div>
              </div>
            </div>
          `;
          SettingsPage._updateInfo = update;
        }
      } else {
        if (statusText) statusText.textContent = '✓ Estás en la última versión';
        if (resultDiv) {
          resultDiv.classList.remove('hidden');
          resultDiv.innerHTML = '<div style="text-align:center;color:var(--success);padding:8px"><span class="material-symbols-outlined" style="vertical-align:middle">check_circle</span> No hay actualizaciones disponibles</div>';
        }
      }
    } catch (e) {
      if (statusText) statusText.textContent = 'Error al verificar';
      Toast.error('Error al buscar actualizaciones: ' + e.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">refresh</span>Buscar Actualizaciones';
      }
    }
  },

  async installUpdate() {
    if (!SettingsPage._updateInfo) return;

    const btn = document.getElementById('settings-update-btn');
    const progressWrap = document.getElementById('settings-update-progress');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span>Descargando...';
    }
    if (progressWrap) progressWrap.classList.remove('hidden');

    // Escuchar progreso de descarga
    const progressHandler = (progress) => {
      const bar = document.getElementById('settings-update-bar');
      const pct = document.getElementById('settings-update-pct');
      const status = document.getElementById('settings-update-status');
      if (bar) bar.style.width = `${progress}%`;
      if (pct) pct.textContent = `${progress}%`;
      if (status && progress >= 100) status.textContent = '¡Descarga completada!';
    };
    if (window.elbrother.onUpdateProgress) {
      window.elbrother.onUpdateProgress(progressHandler);
    }

    try {
      const success = await window.elbrother.downloadUpdates(SettingsPage._updateInfo);
      if (success) {
        // Descarga exitosa: mostrar botón de instalar
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">restart_alt</span>Instalar y Reiniciar';
          btn.onclick = async () => {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span>Instalando...';
            Toast.info('Instalando actualización... La app se cerrará para aplicar los cambios.');
            await window.elbrother.applyUpdates(SettingsPage._updateInfo);
          };
        }
        Toast.success('Descarga completada. Haz clic en "Instalar y Reiniciar" para aplicar.');
      } else {
        Toast.error('Error al descargar la actualización');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">download</span>Reintentar';
        }
      }
    } catch (e) {
      Toast.error('Error: ' + e.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">download</span>Reintentar';
      }
    }
  },

  async saveConfig() {
    try {
      const taxInput = document.getElementById('cfg-tax').value;
      const taxRateNum = (parseFloat(taxInput) || 0) / 100;
      const taxRateVal = String(taxRateNum);
      
      await API.put('/api/system/config', { 
        business_name: document.getElementById('cfg-name').value, 
        tax_rate: taxRateVal, 
        currency: document.getElementById('cfg-currency').value 
      });
      
      Store.set('taxRate', taxRateNum);
      Toast.success('Configuración guardada');
    } catch(e) { Toast.error(e.message); }
  },
  async refreshBCV() {
    try {
      const result = await API.post('/api/system/bcv/refresh');
      Toast.success(`Tasa actualizada: ${result.rate} Bs/$`);
      Store.set('bcvRate', result.rate);
      App.navigate('settings');
    } catch(e) { Toast.error(e.message); }
  },
  async saveManualBCV() {
    try {
      const bcvInput = document.getElementById('cfg-bcv').value;
      const bcvRateNum = parseFloat(bcvInput);
      if (!bcvRateNum || bcvRateNum <= 0) throw new Error('Tasa inválida');
      
      const result = await API.post('/api/system/bcv/manual', { rate: bcvRateNum });
      Toast.success(`Tasa manual guardada: ${result.rate} Bs/$`);
      Store.set('bcvRate', result.rate);
      
      const headerBcv = document.getElementById('bcv-rate-value');
      if (headerBcv) headerBcv.textContent = Number(result.rate).toFixed(2);
      
      App.navigate('settings');
    } catch(e) { Toast.error(e.message); }
  },

  async changeDbPath() {
    if (!window.elbrother) return Toast.error('Esta función solo está disponible en la versión instalada.');
    
    if (!confirm('¿Estás seguro de cambiar la ubicación de la base de datos? El programa se reiniciará para aplicar los cambios.')) return;
    
    try {
      const newPath = await window.elbrother.selectDbPath();
      if (newPath) {
        Toast.success('Ubicación guardada. Reiniciando...');
        setTimeout(() => location.reload(), 1500);
      }
    } catch(e) {
      Toast.error(e.message);
    }
  }
};
