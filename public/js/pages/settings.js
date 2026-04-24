window.SettingsPage = {
  async render() {
    try {
      const config = await API.get('/api/system/config');
      return `<div class="page-header"><h1 class="page-title">Configuración</h1></div>
      <div style="max-width:600px">
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
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
            <div class="kpi-value" style="font-size:28px">${config.bcv_rate||'36.50'} Bs/$</div>
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.refreshBCV()"><span class="material-symbols-outlined">refresh</span>Actualizar</button>
          </div>
        </div>
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><span class="card-title">Ubicación de Base de Datos</span></div>
          <div style="margin-bottom:12px">
            <div id="db-path-display" style="font-family:monospace;font-size:12px;color:var(--on-surface-variant);margin-bottom:8px;word-break:break-all">${window.velopack ? await window.velopack.getDbPath() : 'Modo desarrollo'}</div>
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.changeDbPath()">
              <span class="material-symbols-outlined">folder_open</span>Cambiar Ubicación
            </button>
          </div>
        </div>
        <div class="card" style="margin-bottom:16px" id="update-card">
          <div class="card-header"><span class="card-title">Actualización de Software</span></div>
          <div style="margin-bottom:12px">
            <div id="update-status" style="color:var(--on-surface-variant);margin-bottom:8px">Versión actual: v2.5.0</div>
            <div id="update-progress-container" style="display:none;margin-bottom:8px">
              <div style="height:4px;background:var(--outline-variant);border-radius:2px;overflow:hidden">
                <div id="update-progress-bar" style="width:0%;height:100%;background:var(--primary);transition:width 0.3s"></div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-check-update" onclick="SettingsPage.checkUpdate()">
              <span class="material-symbols-outlined">update</span>Buscar Actualización
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
      if(el) el.innerHTML = logs.slice(0,20).map(l=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--outline-variant)"><div><span style="font-weight:600">${l.user_name||'Sistema'}</span> <span style="color:var(--outline)">${l.action}</span> <span style="color:var(--on-surface-variant)">${l.details||''}</span></div><span style="color:var(--outline);font-size:12px">${Format.timeAgo(l.created_at)}</span></div>`).join('')||'<p style="color:var(--outline)">Sin actividad</p>';
    } catch(e) {}
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
  async checkUpdate() {
    if (!window.velopack) return Toast.error('El sistema de actualizaciones solo está disponible en la versión instalada.');
    
    const btn = document.getElementById('btn-check-update');
    const status = document.getElementById('update-status');
    
    try {
      btn.disabled = true;
      status.innerText = 'Buscando actualizaciones...';
      
      const updateInfo = await window.velopack.checkForUpdates();
      
      if (!updateInfo) {
        status.innerText = 'Tienes la versión más reciente.';
        btn.disabled = false;
        return;
      }
      
      status.innerHTML = `<span style="color:var(--primary);font-weight:600">Nueva versión disponible: ${updateInfo.TargetFullRelease.Version}</span>`;
      btn.innerHTML = '<span class="material-symbols-outlined">download</span>Descargar ahora';
      btn.disabled = false;
      btn.onclick = () => SettingsPage.downloadUpdate(updateInfo);
      
    } catch(e) {
      status.innerText = 'Error al buscar actualizaciones.';
      btn.disabled = false;
      Toast.error(e.message);
    }
  },
  async downloadUpdate(updateInfo) {
    const btn = document.getElementById('btn-check-update');
    const status = document.getElementById('update-status');
    const progressContainer = document.getElementById('update-progress-container');
    const progressBar = document.getElementById('update-progress-bar');
    
    try {
      btn.disabled = true;
      status.innerText = 'Descargando actualización...';
      progressContainer.style.display = 'block';
      progressBar.style.width = '50%'; // Velopack Node SDK doesn't always give progress easily in one call
      
      await window.velopack.downloadUpdate(updateInfo);
      
      progressBar.style.width = '100%';
      status.innerText = 'Descarga completada. Listo para instalar.';
      btn.innerHTML = '<span class="material-symbols-outlined">restart_alt</span>Reiniciar y Actualizar';
      btn.disabled = false;
      btn.onclick = () => window.velopack.applyUpdate(updateInfo);
      
    } catch(e) {
      status.innerText = 'Error al descargar la actualización.';
      btn.disabled = false;
      Toast.error(e.message);
    }
  },
  async changeDbPath() {
    if (!window.velopack) return Toast.error('Esta función solo está disponible en la versión instalada.');
    
    if (!confirm('¿Estás seguro de cambiar la ubicación de la base de datos? El programa se reiniciará para aplicar los cambios.')) return;
    
    try {
      const newPath = await window.velopack.selectDbPath();
      if (newPath) {
        Toast.success('Ubicación guardada. Reiniciando...');
        setTimeout(() => location.reload(), 1500);
      }
    } catch(e) {
      Toast.error(e.message);
    }
  }
};
