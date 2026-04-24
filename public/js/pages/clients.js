window.ClientsPage = {
  async render() {
    try {
      const clients = await API.get('/api/clients');
      const rate = Store.get('bcvRate') || 483.87;
      return `<div class="page-header"><h1 class="page-title">Clientes</h1><div class="page-actions"><button class="btn btn-primary" onclick="ClientsPage.openAdd()"><span class="material-symbols-outlined">person_add</span>Nuevo Cliente</button></div></div>
      <div class="pos-search" style="margin-bottom:16px"><span class="material-symbols-outlined">search</span><input type="text" placeholder="Buscar por nombre o cédula..." oninput="ClientsPage.search(this.value)"></div>
      <div class="table-container"><table><thead><tr><th>Nombre</th><th>Cédula</th><th>Teléfono</th><th>Deuda Bs</th><th>Deuda USD</th><th>Límite</th><th>Acciones</th></tr></thead>
      <tbody id="clients-tbody">${clients.map(c=>`<tr>
        <td style="font-weight:600">${c.name}</td>
        <td style="font-family:var(--font-mono)">${c.cedula||'—'}</td>
        <td>${c.phone||'—'}</td>
        <td style="font-family:var(--font-mono);color:${c.total_debt>0?'var(--error)':'var(--success)'};font-weight:700">Bs. ${((c.total_debt||0)*rate).toFixed(2)}</td>
        <td style="font-family:var(--font-mono);color:var(--outline)">$${(c.total_debt||0).toFixed(2)}</td>
        <td style="font-family:var(--font-mono)">$${(c.credit_limit||0).toFixed(2)}</td>
        <td style="display:flex;gap:4px"><button class="btn btn-sm btn-ghost" onclick="ClientsPage.viewDetail(${c.id})" title="Ver"><span class="material-symbols-outlined" style="font-size:18px">visibility</span></button><button class="btn btn-sm btn-ghost" onclick="ClientsPage.openEdit(${c.id})" title="Editar"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button><button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="ClientsPage.deleteClient(${c.id},'${c.name.replace(/'/g,"\\&#39;")}')" title="Eliminar"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
      </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--outline)">No hay clientes registrados</td></tr>'}</tbody></table></div>`;
    } catch(e) { return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`; }
  },
  async search(term) {
    const clients = await API.get(`/api/clients?search=${encodeURIComponent(term)}`);
    const rate = Store.get('bcvRate') || 483.87;
    const tbody = document.getElementById('clients-tbody');
    if(!tbody) return;
    tbody.innerHTML = clients.map(c=>`<tr>
      <td style="font-weight:600">${c.name}</td>
      <td style="font-family:var(--font-mono)">${c.cedula||'—'}</td>
      <td>${c.phone||'—'}</td>
      <td style="font-family:var(--font-mono);color:${c.total_debt>0?'var(--error)':'var(--success)'};font-weight:700">Bs. ${((c.total_debt||0)*rate).toFixed(2)}</td>
      <td style="font-family:var(--font-mono);color:var(--outline)">$${(c.total_debt||0).toFixed(2)}</td>
      <td style="font-family:var(--font-mono)">$${(c.credit_limit||0).toFixed(2)}</td>
      <td style="display:flex;gap:4px"><button class="btn btn-sm btn-ghost" onclick="ClientsPage.viewDetail(${c.id})"><span class="material-symbols-outlined" style="font-size:18px">visibility</span></button><button class="btn btn-sm btn-ghost" onclick="ClientsPage.openEdit(${c.id})"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button><button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="ClientsPage.deleteClient(${c.id},'${c.name.replace(/'/g,"\\&#39;")}')"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
    </tr>`).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--outline)">Sin resultados</td></tr>';
  },
  openAdd() {
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">person_add</span>Nuevo Cliente</div>
      <form onsubmit="ClientsPage.save(event)">
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Nombre</label><input class="form-input" id="c-name" required></div>
        <div class="form-row" style="margin-bottom:12px"><div class="form-group"><label class="form-label">Cédula</label><input class="form-input" id="c-cedula" placeholder="V-12345678"></div><div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" id="c-phone" placeholder="0414-1234567"></div></div>
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Límite de Crédito (USD)</label><input class="form-input" type="number" step="0.01" id="c-limit" value="50"></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
      </form>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  async openEdit(id) {
    const c = await API.get(`/api/clients/${id}`);
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">edit</span>Editar: ${c.name}</div>
      <form onsubmit="ClientsPage.update(event,${id})">
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Nombre</label><input class="form-input" id="c-name" value="${c.name}" required></div>
        <div class="form-row" style="margin-bottom:12px"><div class="form-group"><label class="form-label">Cédula</label><input class="form-input" id="c-cedula" value="${c.cedula||''}"></div><div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" id="c-phone" value="${c.phone||''}"></div></div>
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Límite de Crédito (USD)</label><input class="form-input" type="number" step="0.01" id="c-limit" value="${c.credit_limit}"></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Actualizar</button></div>
      </form>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  async save(e) {
    e.preventDefault();
    try {
      await API.post('/api/clients', { name:document.getElementById('c-name').value, cedula:document.getElementById('c-cedula').value, phone:document.getElementById('c-phone').value, credit_limit:parseFloat(document.getElementById('c-limit').value) });
      App.closeModal(); Toast.success('Cliente creado'); App.navigate('clients');
    } catch(e) { Toast.error(e.message); }
  },
  async update(e, id) {
    e.preventDefault();
    try {
      await API.put(`/api/clients/${id}`, { name:document.getElementById('c-name').value, cedula:document.getElementById('c-cedula').value, phone:document.getElementById('c-phone').value, credit_limit:parseFloat(document.getElementById('c-limit').value) });
      App.closeModal(); Toast.success('Cliente actualizado'); App.navigate('clients');
    } catch(e) { Toast.error(e.message); }
  },
  async deleteClient(id, name) {
    if(!confirm(`¿Eliminar al cliente "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await API.del(`/api/clients/${id}`);
      Toast.success(`Cliente "${name}" eliminado`);
      App.navigate('clients');
    } catch(e) { Toast.error(e.message); }
  },
  async viewDetail(id) {
    try {
      const c = await API.get(`/api/clients/${id}`);
      const rate = Store.get('bcvRate') || 483.87;
      document.getElementById('modal-body').innerHTML = `
        <div class="modal-title"><span class="material-symbols-outlined">person</span>${c.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div class="card"><div class="kpi-label">Deuda Actual</div><div style="font-family:var(--font-mono);font-size:24px;color:${c.total_debt>0?'var(--error)':'var(--success)'}">Bs. ${((c.total_debt||0)*rate).toFixed(2)}</div><div style="color:var(--outline);font-size:12px">$${(c.total_debt||0).toFixed(2)}</div></div>
          <div class="card"><div class="kpi-label">Límite Crédito</div><div style="font-family:var(--font-mono);font-size:24px">$${c.credit_limit.toFixed(2)}</div></div>
        </div>
        <div style="margin-bottom:12px"><strong style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:var(--outline)">Cédula:</strong> ${c.cedula||'—'} | <strong style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:var(--outline)">Tel:</strong> ${c.phone||'—'}</div>
        ${c.total_debt>0?`<div style="border-top:1px solid var(--outline-variant);padding-top:12px;margin-top:12px"><div class="form-label">Registrar Abono</div><div style="display:flex;gap:8px;margin-top:6px;align-items:center"><input class="form-input" type="number" step="0.01" id="abono-amount" placeholder="Monto en Bs." style="flex:1" oninput="document.getElementById('abono-usd-preview').textContent='≈ $'+(this.value/(${rate})).toFixed(2)+' USD'"><span id="abono-usd-preview" style="color:var(--outline);font-size:12px;min-width:90px">≈ $0.00 USD</span><button class="btn btn-success" onclick="ClientsPage.addPayment(${id},${rate})">Abonar</button></div></div>`:''}
        <div class="modal-actions"><button class="btn btn-ghost" onclick="App.closeModal()">Cerrar</button></div>`;
      document.getElementById('modal-overlay').classList.remove('hidden');
    } catch(e) { Toast.error(e.message); }
  },
  async addPayment(id, rate) {
    const amountBs = parseFloat(document.getElementById('abono-amount').value);
    if(!amountBs || amountBs<=0) { Toast.error('Ingrese un monto válido en Bs.'); return; }
    const amountUsd = Math.round((amountBs / (rate || Store.get('bcvRate') || 483.87)) * 100) / 100;
    try {
      await API.post(`/api/clients/${id}/payment`, { amount: amountUsd });
      Toast.success(`Abono registrado: Bs. ${amountBs.toFixed(2)} ($${amountUsd.toFixed(2)})`);
      this.viewDetail(id);
    } catch(e) { Toast.error(e.message); }
  }
};
