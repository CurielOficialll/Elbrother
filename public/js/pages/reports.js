window.ReportsPage = {
  async render() {
    try {
      const d = await API.get('/api/reports/dashboard');
      const rate = Store.get('bcvRate') || 483.87;
      const valuation = await API.get('/api/reports/valuation').catch(()=>({total_cost:0,total_sell:0,total_products:0,total_units:0}));
      return `<div class="page-header"><h1 class="page-title">Reportes</h1></div>
      <div class="kpi-grid section-gap">
        <div class="card kpi-card card--accent"><div class="kpi-label">Valuación Costo (Inventario)</div><div class="kpi-value" style="font-size:22px">Bs. ${(valuation.total_cost*rate).toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${valuation.total_cost.toFixed(2)} USD</p><span class="material-symbols-outlined kpi-icon">inventory</span></div>
        <div class="card kpi-card card--accent"><div class="kpi-label">Valuación Venta (Inventario)</div><div class="kpi-value" style="font-size:22px;color:var(--success)">Bs. ${(valuation.total_sell*rate).toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${valuation.total_sell.toFixed(2)} USD</p><span class="material-symbols-outlined kpi-icon">trending_up</span></div>
        <div class="card kpi-card"><div class="kpi-label">Margen Potencial</div><div class="kpi-value" style="font-size:22px">Bs. ${((valuation.total_sell-valuation.total_cost)*rate).toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${(valuation.total_sell-valuation.total_cost).toFixed(2)} USD</p><span class="material-symbols-outlined kpi-icon">savings</span></div>
        <div class="card kpi-card"><div class="kpi-label">Productos / Unidades</div><div class="kpi-value kpi-value--default" style="font-size:28px">${valuation.total_products}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">${valuation.total_units} unidades en stock</p><span class="material-symbols-outlined kpi-icon">category</span></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px" class="section-gap">
        <div class="card"><div class="kpi-label">Ventas Hoy</div><div style="font-family:var(--font-mono);font-size:24px;font-weight:700;color:var(--primary)">Bs. ${(d.sales_today.total*rate).toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${d.sales_today.total.toFixed(2)} · ${d.sales_today.count} venta(s)</p></div>
        <div class="card"><div class="kpi-label">Ventas Semana</div><div style="font-family:var(--font-mono);font-size:24px;font-weight:700">Bs. ${(d.sales_week.total*rate).toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${d.sales_week.total.toFixed(2)} · ${d.sales_week.count} ventas</p></div>
        <div class="card"><div class="kpi-label">Ventas Mes</div><div style="font-family:var(--font-mono);font-size:24px;font-weight:700">Bs. ${(d.sales_month.total*rate).toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${d.sales_month.total.toFixed(2)} · ${d.sales_month.count} ventas</p></div>
      </div>

      <div class="card section-gap" id="profit-calculator">
        <div class="card-header"><span class="card-title">Calculadora de Ganancias por Período</span></div>
        <div style="padding: 16px; border-bottom: 1px solid var(--border);">
           <div style="display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap;">
             <div class="form-group" style="margin:0; flex: 1; min-width: 150px;">
               <label>Tipo de Período</label>
               <select id="report-filter-type" class="input">
                 <option value="week">Por Semana</option>
                 <option value="month">Por Mes</option>
                 <option value="custom">Personalizado</option>
               </select>
             </div>
             <div class="form-group" id="report-filter-single" style="margin:0; flex: 2; min-width: 200px;">
               <label id="report-filter-single-label">Seleccionar Semana</label>
               <input type="week" id="report-filter-single-input" class="input">
             </div>
             <div class="form-group" id="report-filter-custom-start" style="margin:0; flex: 1; display: none; min-width: 150px;">
               <label>Desde</label>
               <input type="date" id="report-filter-start-input" class="input">
             </div>
             <div class="form-group" id="report-filter-custom-end" style="margin:0; flex: 1; display: none; min-width: 150px;">
               <label>Hasta</label>
               <input type="date" id="report-filter-end-input" class="input">
             </div>
             <button class="btn btn-primary" id="btn-calc-profit" style="margin-bottom: 4px;">Calcular</button>
           </div>
        </div>
        <div id="profit-results" style="padding: 24px; text-align: center; color: var(--outline);">
          Selecciona un período y haz clic en Calcular para ver las ganancias.
        </div>
      </div>

      <div class="card section-gap"><div class="card-header"><span class="card-title">Top Productos</span></div>
        <div class="table-container"><table><thead><tr><th>Producto</th><th>Unidades</th><th>Total Bs</th><th>Total USD</th></tr></thead>
        <tbody>${d.top_products.map(p=>`<tr><td style="font-weight:600">${p.name}</td><td style="font-family:var(--font-mono)">${p.total_qty}</td><td style="font-family:var(--font-mono);color:var(--primary);font-weight:700">Bs. ${(p.total_amount*rate).toFixed(2)}</td><td style="font-family:var(--font-mono);color:var(--outline)">$${p.total_amount.toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--outline)">Sin datos de ventas</td></tr>'}</tbody></table></div>
      </div>`;
    } catch(e) { return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`; }
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
    const btnCalc = document.getElementById('btn-calc-profit');
    const resultsContainer = document.getElementById('profit-results');

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
      if (val === 'week') {
        singleGroup.style.display = 'block';
        startGroup.style.display = 'none';
        endGroup.style.display = 'none';
        singleLabel.textContent = 'Seleccionar Semana';
        singleInput.type = 'week';
      } else if (val === 'month') {
        singleGroup.style.display = 'block';
        startGroup.style.display = 'none';
        endGroup.style.display = 'none';
        singleLabel.textContent = 'Seleccionar Mes';
        singleInput.type = 'month';
      } else {
        singleGroup.style.display = 'none';
        startGroup.style.display = 'block';
        endGroup.style.display = 'block';
      }
    });

    btnCalc.addEventListener('click', async () => {
      const type = typeSelect.value;
      let startDate, endDate;

      if (type === 'custom') {
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
        if (dow <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        
        startDate = ISOweekStart.toISOString().split('T')[0];
        
        const endD = new Date(ISOweekStart);
        endD.setDate(endD.getDate() + 6);
        endDate = endD.toISOString().split('T')[0];
      }

      if (!startDate || !endDate) return Toast.error('Selecciona las fechas requeridas');

      btnCalc.disabled = true;
      btnCalc.textContent = 'Calculando...';
      try {
        const data = await API.get(`/api/reports/custom?startDate=${startDate}&endDate=${endDate}`);
        const rate = Store.get('bcvRate') || 483.87;
        
        resultsContainer.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:16px;text-align:left;">
            <div class="card kpi-card">
              <div class="kpi-label">Total Ventas</div>
              <div class="kpi-value" style="font-size:22px">Bs. ${(data.total_sales*rate).toFixed(2)}</div>
              <p style="color:var(--outline);font-size:12px;margin-top:4px">$${data.total_sales.toFixed(2)} USD</p>
            </div>
            <div class="card kpi-card">
              <div class="kpi-label">Costo Total</div>
              <div class="kpi-value" style="font-size:22px">Bs. ${(data.total_cost*rate).toFixed(2)}</div>
              <p style="color:var(--outline);font-size:12px;margin-top:4px">$${data.total_cost.toFixed(2)} USD</p>
            </div>
            <div class="card kpi-card card--accent">
              <div class="kpi-label">Ganancia Neta</div>
              <div class="kpi-value" style="font-size:22px;color:var(--success)">Bs. ${(data.profit*rate).toFixed(2)}</div>
              <p style="color:var(--outline);font-size:12px;margin-top:4px">$${data.profit.toFixed(2)} USD</p>
            </div>
            <div class="card kpi-card">
              <div class="kpi-label">Transacciones</div>
              <div class="kpi-value" style="font-size:22px">${data.count}</div>
              <p style="color:var(--outline);font-size:12px;margin-top:4px">Ventas en este período</p>
            </div>
          </div>
        `;
      } catch(e) {
        Toast.error(e.message);
      } finally {
        btnCalc.disabled = false;
        btnCalc.textContent = 'Calcular';
      }
    });
  }
};
