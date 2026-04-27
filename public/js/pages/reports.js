window.ReportsPage = {
  async render() {
    try {
      const rate = Store.get('bcvRate') || 483.87;
      const valuation = await API.get('/api/reports/valuation').catch(()=>({total_cost:0,total_sell:0,total_products:0,total_units:0}));
      
      return `
      <div class="page-header">
        <h1 class="page-title">Reportes y Estadísticas</h1>
      </div>

      <div class="kpi-grid section-gap">
        <div class="card kpi-card card--accent">
          <div class="kpi-label">Valuación Costo (Inventario)</div>
          <div class="kpi-value" style="font-size:22px">Bs. ${(valuation.total_cost*rate).toFixed(2)}</div>
          <p style="color:var(--outline);font-size:12px;margin-top:4px">$${valuation.total_cost.toFixed(2)} USD</p>
          <span class="material-symbols-outlined kpi-icon">inventory</span>
        </div>
        <div class="card kpi-card card--accent">
          <div class="kpi-label">Valuación Venta (Inventario)</div>
          <div class="kpi-value" style="font-size:22px;color:var(--success)">Bs. ${(valuation.total_sell*rate).toFixed(2)}</div>
          <p style="color:var(--outline);font-size:12px;margin-top:4px">$${valuation.total_sell.toFixed(2)} USD</p>
          <span class="material-symbols-outlined kpi-icon">trending_up</span>
        </div>
        <div class="card kpi-card">
          <div class="kpi-label">Margen Potencial</div>
          <div class="kpi-value" style="font-size:22px">Bs. ${((valuation.total_sell-valuation.total_cost)*rate).toFixed(2)}</div>
          <p style="color:var(--outline);font-size:12px;margin-top:4px">$${(valuation.total_sell-valuation.total_cost).toFixed(2)} USD</p>
          <span class="material-symbols-outlined kpi-icon">savings</span>
        </div>
        <div class="card kpi-card">
          <div class="kpi-label">Productos / Unidades</div>
          <div class="kpi-value kpi-value--default" style="font-size:28px">${valuation.total_products}</div>
          <p style="color:var(--outline);font-size:12px;margin-top:4px">${valuation.total_units} unidades en stock</p>
          <span class="material-symbols-outlined kpi-icon">category</span>
        </div>
      </div>

      <div class="card section-gap" style="overflow:visible">
        <div class="card-header"><span class="card-title">Filtro de Rendimiento por Período</span></div>
        <div style="padding: 16px; border-bottom: 1px solid var(--outline-variant);">
           <div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
             <div class="form-group" style="margin:0; flex: 1; min-width: 150px;">
               <label class="form-label">Tipo de Período</label>
               <select id="report-filter-type" class="form-input">
                 <option value="today">Hoy</option>
                 <option value="week" selected>Esta Semana</option>
                 <option value="month">Este Mes</option>
                 <option value="custom">Personalizado</option>
               </select>
             </div>
             <div class="form-group" id="report-filter-single" style="margin:0; flex: 2; min-width: 200px; display:block;">
               <label id="report-filter-single-label" class="form-label">Seleccionar Semana</label>
               <input type="week" id="report-filter-single-input" class="form-input">
             </div>
             <div class="form-group" id="report-filter-custom-start" style="margin:0; flex: 1; display: none; min-width: 150px;">
               <label class="form-label">Desde</label>
               <input type="date" id="report-filter-start-input" class="form-input">
             </div>
             <div class="form-group" id="report-filter-custom-end" style="margin:0; flex: 1; display: none; min-width: 150px;">
               <label class="form-label">Hasta</label>
               <input type="date" id="report-filter-end-input" class="form-input">
             </div>
             <button class="btn btn-primary" id="btn-apply-filter" style="margin-bottom: 0;">
               <span class="material-symbols-outlined">filter_alt</span>Aplicar Filtro
             </button>
           </div>
        </div>
        <div id="dynamic-report-content" style="padding: 16px;">
          <div class="empty-state" style="padding:40px">
            <div class="kpi-value" style="font-size:16px;animation:pulse 1s infinite">Cargando datos del período...</div>
          </div>
        </div>
      </div>

      <div class="card section-gap">
        <div class="card-header">
          <span class="card-title">Historial de Movimientos (Ventas)</span>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="date" id="movements-date-from" class="form-input" style="width:auto;padding:6px 10px;font-size:12px">
            <span style="color:var(--outline)">a</span>
            <input type="date" id="movements-date-to" class="form-input" style="width:auto;padding:6px 10px;font-size:12px">
            <button class="btn btn-sm btn-primary" id="btn-load-movements"><span class="material-symbols-outlined" style="font-size:16px">search</span>Buscar</button>
          </div>
        </div>
        <div id="movements-table-container" class="table-container">
          <p style="padding:24px;text-align:center;color:var(--outline)">Selecciona un rango de fechas y presiona Buscar</p>
        </div>
      </div>`;
    } catch(e) { 
      return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`; 
    }
  },

  afterRender() {
    const typeSelect = document.getElementById('report-filter-type');
    const singleGroup = document.getElementById('report-filter-single');
    const singleLabel = document.getElementById('report-filter-single-label');
    const singleInput = document.getElementById('report-filter-single-input');
    const startGroup = document.getElementById('report-filter-custom-start');
    const endGroup = document.getElementById('report-filter-custom-end');
    const startInput = document.getElementById('report-filter-start-input');
    const endInput = document.getElementById('report-filter-end-input');
    const btnApply = document.getElementById('btn-apply-filter');

    // Default to current week
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    singleInput.value = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;

    typeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      singleGroup.style.display = (val === 'week' || val === 'month') ? 'block' : 'none';
      startGroup.style.display = (val === 'custom') ? 'block' : 'none';
      endGroup.style.display = (val === 'custom') ? 'block' : 'none';
      
      if (val === 'week') {
        singleLabel.textContent = 'Seleccionar Semana';
        singleInput.type = 'week';
      } else if (val === 'month') {
        singleLabel.textContent = 'Seleccionar Mes';
        singleInput.type = 'month';
      }
    });

    btnApply.addEventListener('click', () => this.loadPeriodData());
    
    // Initial load for reports
    this.loadPeriodData();

    // Setup Movements section
    const btnLoadMovements = document.getElementById('btn-load-movements');
    const inputDateFrom = document.getElementById('movements-date-from');
    const inputDateTo = document.getElementById('movements-date-to');
    
    // Default dates for movements (today)
    const todayStr = new Date().toISOString().split('T')[0];
    inputDateFrom.value = todayStr;
    inputDateTo.value = todayStr;

    btnLoadMovements.addEventListener('click', () => this.loadMovements());
    
    // Initial load for movements
    this.loadMovements();
  },

  async loadPeriodData() {
    const typeSelect = document.getElementById('report-filter-type');
    const singleInput = document.getElementById('report-filter-single-input');
    const startInput = document.getElementById('report-filter-start-input');
    const endInput = document.getElementById('report-filter-end-input');
    const container = document.getElementById('dynamic-report-content');
    const btn = document.getElementById('btn-apply-filter');

    const type = typeSelect.value;
    let startDate, endDate;

    if (type === 'today') {
      startDate = endDate = new Date().toISOString().split('T')[0];
    } else if (type === 'custom') {
      startDate = startInput.value;
      endDate = endInput.value;
    } else if (type === 'month') {
      if (!singleInput.value) return Toast.error('Selecciona un mes');
      startDate = singleInput.value + '-01';
      const [year, month] = singleInput.value.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${month}-${lastDay}`;
    } else if (type === 'week') {
      if (!singleInput.value) return Toast.error('Selecciona una semana');
      const [year, weekStr] = singleInput.value.split('-W');
      const w = parseInt(weekStr);
      const simple = new Date(year, 0, 1 + (w - 1) * 7);
      const dow = simple.getDay();
      const ISOweekStart = simple;
      if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      startDate = ISOweekStart.toISOString().split('T')[0];
      const endD = new Date(ISOweekStart);
      endD.setDate(endD.getDate() + 6);
      endDate = endD.toISOString().split('T')[0];
    }

    if (!startDate || !endDate) return Toast.error('Selecciona las fechas requeridas');

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">sync</span>Cargando...';
    
    try {
      const [stats, topProducts] = await Promise.all([
        API.get(`/api/reports/custom?startDate=${startDate}&endDate=${endDate}`),
        API.get(`/api/reports/top-products?startDate=${startDate}&endDate=${endDate}`)
      ]);

      const rate = Store.get('bcvRate') || 483.87;
      
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;margin-bottom:24px;">
          <div class="card" style="background:var(--surface-container-high)">
            <div class="kpi-label">Ventas Totales (Período)</div>
            <div class="kpi-value" style="font-size:24px;color:var(--primary)">Bs. ${(stats.total_sales*rate).toFixed(2)}</div>
            <p style="color:var(--outline);font-size:12px;margin-top:4px">$${stats.total_sales.toFixed(2)} USD · ${stats.count} transacciones</p>
          </div>
          <div class="card" style="background:var(--surface-container-high)">
            <div class="kpi-label">Costo Mercancía Vendida</div>
            <div class="kpi-value" style="font-size:24px">Bs. ${(stats.total_cost*rate).toFixed(2)}</div>
            <p style="color:var(--outline);font-size:12px;margin-top:4px">$${stats.total_cost.toFixed(2)} USD</p>
          </div>
          <div class="card" style="background:var(--surface-container-lowest);border:1px solid var(--success)">
            <div class="kpi-label" style="color:var(--success)">Utilidad Bruta</div>
            <div class="kpi-value" style="font-size:24px;color:var(--success)">Bs. ${(stats.profit*rate).toFixed(2)}</div>
            <p style="color:var(--outline);font-size:12px;margin-top:4px">$${stats.profit.toFixed(2)} USD</p>
          </div>
        </div>

        <div class="card" style="background:transparent;padding:0;box-shadow:none">
          <div class="card-header" style="padding-left:0"><span class="card-title">Top 10 Productos del Período</span></div>
          <div class="table-container">
            <table>
              <thead><tr><th>Producto</th><th>Vendidos</th><th>Total Bs</th><th>Total USD</th></tr></thead>
              <tbody>
                ${topProducts.map(p => `
                  <tr>
                    <td style="font-weight:600">${escapeHTML(p.name)}</td>
                    <td style="font-family:var(--font-mono)">${p.total_qty}</td>
                    <td style="font-family:var(--font-mono);color:var(--primary);font-weight:700">Bs. ${(p.total_amount*rate).toFixed(2)}</td>
                    <td style="font-family:var(--font-mono);color:var(--outline)">$${p.total_amount.toFixed(2)}</td>
                  </tr>
                `).join('') || '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--outline)">Sin ventas en este período</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } catch(e) {
      container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">filter_alt</span>Aplicar Filtro';
    }
  },

  async loadMovements() {
    const from = document.getElementById('movements-date-from').value;
    const to = document.getElementById('movements-date-to').value;
    const container = document.getElementById('movements-table-container');
    const btn = document.getElementById('btn-load-movements');

    if (!from || !to) return Toast.error('Selecciona un rango de fechas válido');

    btn.disabled = true;
    container.innerHTML = `<div style="text-align:center;padding:24px"><span class="material-symbols-outlined" style="animation:spin 1s linear infinite">sync</span><p style="color:var(--outline);margin-top:8px">Cargando movimientos...</p></div>`;

    try {
      // SQLite stores dates as 'YYYY-MM-DD HH:MM:SS' so we use the same format
      const toInclusive = `${to} 23:59:59`;
      const fromStart = `${from} 00:00:00`;
      
      const sales = await API.get(`/api/sales?from=${fromStart}&to=${toInclusive}&limit=500`);
      const rate = Store.get('bcvRate') || 483.87;

      if (!sales || sales.length === 0) {
        container.innerHTML = '<p style="padding:24px;text-align:center;color:var(--outline)">No se encontraron movimientos en este rango de fechas</p>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Recibo</th>
              <th>Fecha y Hora</th>
              <th>Vendedor</th>
              <th>Total Bs</th>
              <th>Total USD</th>
              <th>Método</th>
              <th>Estado</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${sales.map(s => `
              <tr>
                <td style="font-family:var(--font-mono);font-weight:600;color:var(--primary)">${s.sale_number}</td>
                <td style="color:var(--outline)">${Format.datetime(s.created_at)}</td>
                <td>${escapeHTML(s.user_name) || '—'}</td>
                <td style="font-family:var(--font-mono);font-weight:700">Bs. ${(s.total * rate).toFixed(2)}</td>
                <td style="font-family:var(--font-mono);color:var(--outline)">$${s.total.toFixed(2)}</td>
                <td><span class="badge badge-info">${Format.paymentMethod(s.payment_method)}</span></td>
                <td>
                  ${s.status === 'completed' ? '<span class="badge badge-success">Completada</span>' : 
                    s.status === 'credit' ? '<span class="badge badge-warning">Crédito</span>' : 
                    '<span class="badge badge-error">Anulada</span>'}
                </td>
                <td style="text-align:right">
                  <button class="btn btn-sm btn-ghost" title="Ver Ticket" onclick="window.location.hash='#/pos?receipt=${s.id}'">
                    <span class="material-symbols-outlined">receipt_long</span>
                  </button>
                  <button class="btn btn-sm btn-ghost" style="color:var(--error)" title="Eliminar Venta" onclick="ReportsPage.deleteSale(${s.id}, '${escapeHTML(s.sale_number)}')">
                    <span class="material-symbols-outlined">delete_forever</span>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`;
    } finally {
      btn.disabled = false;
    }
  },

  async deleteSale(id, saleNumber) {
    if (!confirm(`¿Eliminar la venta ${saleNumber}?\n\nSe restaurará el stock y se eliminará de la caja.`)) return;

    try {
      await API.del(`/api/sales/${id}`);
      Toast.success(`Venta ${saleNumber} eliminada y stock restaurado`);
      Sounds.play('success');
      this.loadMovements(); // Recargar la tabla
    } catch (e) {
      Toast.error(`Error al eliminar: ${e.message}`);
    }
  }
};
