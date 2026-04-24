window.CashPage = {
  async render() {
    try {
      const cash = await API.get('/api/cash/current');
      const rate = Store.get('bcvRate') || 483.87;
      if (cash.open) {
        const totals = {};
        (cash.totals || []).forEach(t => totals[t.type] = t.total);
        const openBs = (cash.session.opening_amount || 0) * rate;
        const salesBs = (totals.sale || 0) * rate;
        const creditsBs = (totals.credit_payment || 0) * rate;
        return `<div class="page-header"><h1 class="page-title">Caja Registradora</h1><div class="page-actions"><span class="badge badge-success" style="font-size:14px;padding:8px 16px">CAJA ABIERTA</span></div></div>
        <div class="kpi-grid">
          <div class="card kpi-card"><div class="kpi-label">Apertura</div><div class="kpi-value kpi-value--default" style="font-size:24px">Bs. ${openBs.toFixed(2)}</div><div style="color:var(--outline);font-size:12px;margin-top:2px">$${(cash.session.opening_amount||0).toFixed(2)}</div></div>
          <div class="card kpi-card"><div class="kpi-label">Ventas</div><div class="kpi-value" style="font-size:24px">Bs. ${salesBs.toFixed(2)}</div><div style="color:var(--outline);font-size:12px;margin-top:2px">$${(totals.sale||0).toFixed(2)}</div></div>
          <div class="card kpi-card"><div class="kpi-label">Abonos Crédito</div><div class="kpi-value kpi-value--default" style="font-size:24px">Bs. ${creditsBs.toFixed(2)}</div><div style="color:var(--outline);font-size:12px;margin-top:2px">$${(totals.credit_payment||0).toFixed(2)}</div></div>
          <div class="card kpi-card"><div class="kpi-label">Abierta desde</div><div class="kpi-value kpi-value--default" style="font-size:18px">${Format.datetime(cash.session.opened_at)}</div></div>
        </div>
        <div class="card section-gap"><div class="card-header"><span class="card-title">Movimientos</span></div>
          <div class="table-container"><table><thead><tr><th>Tipo</th><th>Monto Bs</th><th>USD</th><th>Método</th><th>Referencia</th><th>Hora</th></tr></thead>
          <tbody>${(cash.transactions||[]).map(t=>`<tr><td><span class="badge ${t.type==='sale'?'badge-success':'badge-info'}">${t.type}</span></td><td style="font-family:var(--font-mono);font-weight:700">Bs. ${(t.amount*rate).toFixed(2)}</td><td style="font-family:var(--font-mono);color:var(--outline)">$${t.amount.toFixed(2)}</td><td>${t.payment_method||'—'}</td><td style="color:var(--outline)">${t.reference||'—'}</td><td style="color:var(--outline)">${Format.time(t.created_at)}</td></tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--outline)">Sin movimientos</td></tr>'}</tbody></table></div>
        </div>
        <div class="section-gap" style="display:flex;gap:12px"><button class="btn btn-error btn-lg" onclick="CashPage.openCloseModal()"><span class="material-symbols-outlined">lock</span>Cerrar Caja</button></div>`;
      } else {
        return `<div class="page-header"><h1 class="page-title">Caja Registradora</h1></div>
        <div style="max-width:500px;margin:60px auto;text-align:center">
          <span class="material-symbols-outlined" style="font-size:80px;color:var(--outline);opacity:0.3">point_of_sale</span>
          <h2 style="margin:16px 0;font-size:20px">Caja Cerrada</h2>
          <p style="color:var(--outline);margin-bottom:24px">Abre la caja para comenzar a registrar ventas</p>
          <div class="form-group" style="margin-bottom:8px;text-align:left"><label class="form-label">Monto de Apertura (Bs.)</label><input class="form-input" type="number" step="0.01" id="open-amount" value="0" oninput="document.getElementById('open-usd-preview').textContent='≈ $'+(this.value/${rate}).toFixed(2)+' USD'"></div>
          <div style="text-align:left;margin-bottom:16px"><span id="open-usd-preview" style="color:var(--outline);font-size:12px">≈ $0.00 USD</span></div>
          <button class="btn btn-primary btn-lg btn-block" onclick="CashPage.openCash()"><span class="material-symbols-outlined">lock_open</span>Abrir Caja</button>
        </div>
        ${await this.renderHistory()}`;
      }
    } catch(e) { return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`; }
  },
  async renderHistory() {
    try {
      const sessions = await API.get('/api/cash/history');
      const rate = Store.get('bcvRate') || 483.87;
      if(!sessions.length) return '';
      return `<div class="card section-gap"><div class="card-header"><span class="card-title">Historial de Sesiones</span></div>
      <div class="table-container"><table><thead><tr><th>Cajero</th><th>Apertura Bs</th><th>Cierre Bs</th><th>Diferencia</th><th>Fecha</th></tr></thead>
      <tbody>${sessions.map(s=>`<tr><td>${s.user_name||'—'}</td><td style="font-family:var(--font-mono)">Bs. ${((s.opening_amount||0)*rate).toFixed(2)}</td><td style="font-family:var(--font-mono)">Bs. ${((s.closing_amount||0)*rate).toFixed(2)}</td><td style="font-family:var(--font-mono);color:${(s.difference||0)<0?'var(--error)':'var(--success)'}">Bs. ${((s.difference||0)*rate).toFixed(2)}</td><td style="color:var(--outline)">${Format.datetime(s.opened_at)}</td></tr>`).join('')}</tbody></table></div></div>`;
    } catch(e) { return ''; }
  },
  async openCash() {
    try {
      const amountBs = parseFloat(document.getElementById('open-amount').value) || 0;
      const rate = Store.get('bcvRate') || 483.87;
      const amountUsd = Math.round((amountBs / rate) * 100) / 100;
      await API.post('/api/cash/open', { opening_amount: amountUsd });
      Toast.success(`Caja abierta: Bs. ${amountBs.toFixed(2)}`); Sounds.play('success'); App.navigate('cash');
    } catch(e) { Toast.error(e.message); }
  },
  openCloseModal() {
    const rate = Store.get('bcvRate') || 483.87;
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">lock</span>Cerrar Caja</div>
      <div class="form-group" style="margin-bottom:8px"><label class="form-label">Monto de Cierre (Bs.)</label><input class="form-input" type="number" step="0.01" id="close-amount" placeholder="Ingrese el monto en caja" oninput="document.getElementById('close-usd-preview').textContent='≈ $'+(this.value/${rate}).toFixed(2)+' USD'"></div>
      <div style="margin-bottom:12px"><span id="close-usd-preview" style="color:var(--outline);font-size:12px">≈ $0.00 USD</span></div>
      <div class="form-group" style="margin-bottom:12px"><label class="form-label">Notas (opcional)</label><input class="form-input" id="close-notes" placeholder="Observaciones del cierre"></div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button class="btn btn-error" onclick="CashPage.closeCash()"><span class="material-symbols-outlined">lock</span>Cerrar Caja</button></div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  async closeCash() {
    const amountBs = parseFloat(document.getElementById('close-amount').value);
    if(isNaN(amountBs) || amountBs < 0) { Toast.error('Ingrese un monto válido'); return; }
    const rate = Store.get('bcvRate') || 483.87;
    const amountUsd = Math.round((amountBs / rate) * 100) / 100;
    const notes = document.getElementById('close-notes')?.value || '';
    try {
      const result = await API.post('/api/cash/close', { closing_amount: amountUsd, notes });
      App.closeModal();
      const diffBs = (result.difference * rate).toFixed(2);
      Toast.success(`Caja cerrada. Diferencia: Bs. ${diffBs} ($${result.difference.toFixed(2)})`);
      Sounds.play('success'); App.navigate('cash');
    } catch(e) { Toast.error(e.message); }
  }
};
