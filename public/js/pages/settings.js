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
            <div id="db-path-display" style="font-family:monospace;font-size:12px;color:var(--on-surface-variant);margin-bottom:8px;word-break:break-all">${window.elbrother ? await window.elbrother.getDbPath() : 'Modo desarrollo'}</div>
            <button class="btn btn-outline btn-sm" onclick="SettingsPage.changeDbPath()">
              <span class="material-symbols-outlined">folder_open</span>Cambiar Ubicación
            </button>
          </div>
        </div>

        <div class="card" style="margin-bottom:16px; border: 1px solid var(--error-container)">
          <div class="card-header"><span class="card-title" style="color:var(--error)">Mantenimiento Crítico</span></div>
          <div style="margin-bottom:12px">
            <p style="font-size:12px; color:var(--on-surface-variant); margin-bottom:12px">
              Esta opción eliminará <b>TODAS</b> las ventas, movimientos y sesiones de caja (pruebas). 
              Los productos, categorías y precios se mantendrán, pero el stock volverá a 0.
            </p>
            <button class="btn btn-outline" style="color:var(--error); border-color:var(--error)" onclick="SettingsPage.resetProduction()">
              <span class="material-symbols-outlined">delete_forever</span>Limpiar Datos de Prueba
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
  },
  async resetProduction() {
    if (!confirm('¡ATENCIÓN! Se eliminarán todas las ventas y movimientos de prueba. El stock volverá a 0. ¿Deseas continuar?')) return;
    if (!confirm('¿Estás COMPLETAMENTE seguro? Esta acción no se puede deshacer.')) return;
    
    try {
      await API.post('/api/system/reset-production');
      Toast.success('Sistema reseteado para producción');
      setTimeout(() => location.reload(), 1500);
    } catch(e) { Toast.error(e.message); }
  }
};
