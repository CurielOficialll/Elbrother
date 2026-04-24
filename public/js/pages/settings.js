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
      const taxRateVal = String(parseFloat(document.getElementById('cfg-tax').value)/100);
      await API.put('/api/system/config', { business_name: document.getElementById('cfg-name').value, tax_rate: taxRateVal, currency: document.getElementById('cfg-currency').value });
      Store.set('taxRate', parseFloat(taxRateVal));
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
  }
};
