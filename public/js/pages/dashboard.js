window.DashboardPage = {
  async render() {
    try {
      const d = await API.get('/api/reports/dashboard');
      const rate = d.bcv_rate || Store.get('bcvRate');
      const todayBs = d.sales_today.total * rate;
      const weekBs = d.sales_week.total * rate;
      const monthBs = d.sales_month.total * rate;
      const debtBs = d.active_debts.total * rate;
      const pctChange = d.sales_today.pct_change;
      return `
      <div class="page-header"><h1 class="page-title">Dashboard</h1><div class="page-actions"><span style="color:var(--outline);font-size:13px">${Format.datetime(new Date().toISOString())}</span></div></div>
      <div class="kpi-grid">
        <div class="card kpi-card">
          <div class="kpi-label">Ventas Hoy</div>
          <div class="kpi-value">Bs. ${todayBs.toFixed(2)}</div>
          <div style="color:var(--outline);font-family:var(--font-mono);font-size:13px;margin-top:2px">$${d.sales_today.total.toFixed(2)} USD</div>
          <div class="kpi-change ${pctChange<0?'kpi-change--down':''}"><span class="material-symbols-outlined" style="font-size:14px">${pctChange>=0?'trending_up':'trending_down'}</span>${pctChange}% vs ayer</div>
          <span class="material-symbols-outlined kpi-icon">payments</span>
        </div>
        <div class="card kpi-card">
          <div class="kpi-label">Transacciones Hoy</div>
          <div class="kpi-value kpi-value--default" style="font-size:48px">${d.sales_today.count}</div>
          <div class="kpi-change">operaciones</div>
          <span class="material-symbols-outlined kpi-icon">receipt</span>
        </div>
        <div class="card kpi-card">
          <div class="kpi-label">Tasa BCV</div>
          <div class="kpi-value">${Format.bcvRate(rate)}</div>
          <div style="color:var(--outline);font-size:12px;margin-top:4px">Bs por 1 USD</div>
          <span class="material-symbols-outlined kpi-icon">currency_exchange</span>
        </div>
        <div class="card kpi-card ${d.low_stock>0?'card--error':''}">
          <div class="kpi-label">Stock Bajo</div>
          <div class="kpi-value ${d.low_stock>0?'kpi-value--error':'kpi-value--default'}">${d.low_stock}</div>
          <div class="kpi-change" style="color:${d.low_stock>0?'var(--error)':'var(--success)'}">productos</div>
          <span class="material-symbols-outlined kpi-icon">warning</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" class="section-gap">
        <div class="card">
          <div class="card-header"><span class="card-title">Últimas Ventas</span><a href="#/reports" class="btn btn-sm btn-ghost">Ver todas</a></div>
          <div class="table-container">
            <table>
              <thead><tr><th>#</th><th>Total Bs</th><th>USD</th><th>Método</th><th>Hora</th></tr></thead>
              <tbody>${d.recent_sales.map(s=>`<tr><td style="font-family:var(--font-mono);color:var(--primary)">${s.sale_number}</td><td style="font-family:var(--font-mono);font-weight:700">Bs. ${(s.total*rate).toFixed(2)}</td><td style="font-family:var(--font-mono);color:var(--outline)">$${s.total.toFixed(2)}</td><td><span class="badge badge-info">${Format.paymentMethod(s.payment_method)}</span></td><td style="color:var(--outline)">${Format.timeAgo(s.created_at)}</td></tr>`).join('')||'<tr><td colspan="5" style="text-align:center;color:var(--outline);padding:24px">Sin ventas hoy</td></tr>'}</tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Stock Bajo</span><a href="#/inventory" class="btn btn-sm btn-ghost">Ver inventario</a></div>
          <div class="table-container">
            <table>
              <thead><tr><th>Producto</th><th>Stock</th><th>Mínimo</th></tr></thead>
              <tbody>${d.low_stock_products.map(p=>`<tr><td>${p.name}</td><td style="color:var(--error);font-weight:700">${p.stock}</td><td style="color:var(--outline)">${p.min_stock}</td></tr>`).join('')||'<tr><td colspan="3" style="text-align:center;color:var(--success);padding:24px">✓ Todo en orden</td></tr>'}</tbody>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px" class="section-gap">
        <div class="card"><div class="kpi-label">Ventas Semana</div><div class="kpi-value kpi-value--default" style="font-size:22px">Bs. ${weekBs.toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${d.sales_week.total.toFixed(2)} · ${d.sales_week.count} ventas</p></div>
        <div class="card"><div class="kpi-label">Ventas Mes</div><div class="kpi-value kpi-value--default" style="font-size:22px">Bs. ${monthBs.toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${d.sales_month.total.toFixed(2)} · ${d.sales_month.count} ventas</p></div>
        <div class="card"><div class="kpi-label">Deudas Activas</div><div class="kpi-value ${d.active_debts.total>0?'kpi-value--error':'kpi-value--default'}" style="font-size:22px">Bs. ${debtBs.toFixed(2)}</div><p style="color:var(--outline);font-size:12px;margin-top:4px">$${d.active_debts.total.toFixed(2)} · ${d.active_debts.count} créditos</p></div>
      </div>`;
    } catch(err) {
      return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Error cargando dashboard: ${err.message}</p></div>`;
    }
  }
};
