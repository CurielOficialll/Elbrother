window.ClientsPage = {
  async render() {
    try {
      const clients = await API.get('/api/clients');
      const rate = Store.get('bcvRate') || 483.87;
      return `<div class="page-header"><h1 class="page-title">Clientes</h1><div class="page-actions"><button class="btn btn-primary" onclick="ClientsPage.openAdd()"><span class="material-symbols-outlined">person_add</span>Nuevo Cliente</button></div></div>
      <div class="pos-search" style="margin-bottom:16px"><span class="material-symbols-outlined">search</span><input type="text" placeholder="Buscar por nombre o cédula..." oninput="ClientsPage.search(this.value)"></div>
      <div class="table-container"><table><thead><tr><th>Nombre</th><th>Cédula</th><th>Teléfono</th><th>Deuda Bs</th><th>Deuda USD</th><th>Acciones</th></tr></thead>
      <tbody id="clients-tbody">${clients.map(c=>`<tr>
        <td style="font-weight:600">${escapeHTML(c.name)}</td>
        <td style="font-family:var(--font-mono)">${escapeHTML(c.cedula)||'—'}</td>
        <td>${escapeHTML(c.phone)||'—'}</td>
        <td style="font-family:var(--font-mono);color:${c.total_debt>0?'var(--error)':'var(--success)'};font-weight:700">Bs. ${((c.total_debt||0)*rate).toFixed(2)}</td>
        <td style="font-family:var(--font-mono);color:var(--outline)">$${(c.total_debt||0).toFixed(2)}</td>
        <td style="display:flex;gap:4px"><button class="btn btn-sm btn-ghost" onclick="ClientsPage.viewDetail(${c.id})" title="Ver"><span class="material-symbols-outlined" style="font-size:18px">visibility</span></button><button class="btn btn-sm btn-ghost" onclick="ClientsPage.openEdit(${c.id})" title="Editar"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button><button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="ClientsPage.deleteClient(${c.id},'${escapeHTML(c.name).replace(/'/g,"\\&#39;")}')" title="Eliminar"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
      </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--outline)">No hay clientes registrados</td></tr>'}</tbody></table></div>`;
    } catch(e) { return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`; }
  },
  async search(term) {
    const clients = await API.get(`/api/clients?search=${encodeURIComponent(term)}`);
    const rate = Store.get('bcvRate') || 483.87;
    const tbody = document.getElementById('clients-tbody');
    if(!tbody) return;
    tbody.innerHTML = clients.map(c=>`<tr>
      <td style="font-weight:600">${escapeHTML(c.name)}</td>
      <td style="font-family:var(--font-mono)">${escapeHTML(c.cedula)||'—'}</td>
      <td>${escapeHTML(c.phone)||'—'}</td>
      <td style="font-family:var(--font-mono);color:${c.total_debt>0?'var(--error)':'var(--success)'};font-weight:700">Bs. ${((c.total_debt||0)*rate).toFixed(2)}</td>
      <td style="font-family:var(--font-mono);color:var(--outline)">$${(c.total_debt||0).toFixed(2)}</td>
      <td style="display:flex;gap:4px"><button class="btn btn-sm btn-ghost" onclick="ClientsPage.viewDetail(${c.id})"><span class="material-symbols-outlined" style="font-size:18px">visibility</span></button><button class="btn btn-sm btn-ghost" onclick="ClientsPage.openEdit(${c.id})"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button><button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="ClientsPage.deleteClient(${c.id},'${escapeHTML(c.name).replace(/'/g,"\\&#39;")}')"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
    </tr>`).join('')||'<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--outline)">Sin resultados</td></tr>';
  },
  openAdd() {
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">person_add</span>Nuevo Cliente</div>
      <form onsubmit="ClientsPage.save(event)">
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Nombre</label><input class="form-input" id="c-name" required></div>
        <div class="form-row" style="margin-bottom:12px"><div class="form-group"><label class="form-label">Cédula</label><input class="form-input" id="c-cedula" placeholder="V-12345678"></div><div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" id="c-phone" placeholder="0414-1234567"></div></div>
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
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Actualizar</button></div>
      </form>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  async save(e) {
    e.preventDefault();
    try {
      await API.post('/api/clients', { name:document.getElementById('c-name').value, cedula:document.getElementById('c-cedula').value, phone:document.getElementById('c-phone').value });
      App.closeModal(); Toast.success('Cliente creado'); App.navigate('clients');
    } catch(e) { Toast.error(e.message); }
  },
  async update(e, id) {
    e.preventDefault();
    try {
      await API.put(`/api/clients/${id}`, { name:document.getElementById('c-name').value, cedula:document.getElementById('c-cedula').value, phone:document.getElementById('c-phone').value });
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
      
      // Combinar compras (credits) y abonos (payments) para la línea de tiempo
      const timeline = [
        ...c.credits.map(cr => ({ type: 'purchase', date: cr.created_at, amount: cr.amount, sale: cr.sale_number, id: cr.id })),
        ...c.payments.map(p => ({ type: 'payment', date: p.created_at, amount: p.amount, sale: p.sale_number, id: p.id, method: p.payment_method }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      document.getElementById('modal-body').innerHTML = `
        <div class="modal-title" style="display:flex;justify-content:space-between;align-items:center">
          <span><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:8px">person</span>${c.name}</span>
          ${c.phone ? `<button class="btn btn-sm btn-success" onclick="window.open('https://wa.me/${c.phone.replace(/[^0-9]/g,'')}?text=Hola%20${encodeURIComponent(c.name)},%20te%20saludamos%20de%20Elbrother%20POS.%20Te%20recordamos%20que%20posees%20un%20saldo%20pendiente%20de%20Bs.%20${((c.total_debt||0)*rate).toFixed(2)}%20($${(c.total_debt||0).toFixed(2)}).%20%C2%A1Feliz%20d%C3%ADa!')" title="Enviar cobro por WhatsApp">
            <span class="material-symbols-outlined" style="font-size:18px">send</span> Cobro WA
          </button>` : ''}
        </div>
        
        <div style="display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:16px">
          <div class="card" style="border-top: 3px solid ${c.total_debt>0?'var(--error)':'var(--success)'}">
            <div class="kpi-label">Deuda Actual</div>
            <div style="font-family:var(--font-mono);font-size:24px;color:${c.total_debt>0?'var(--error)':'var(--success)'};font-weight:700">Bs. ${((c.total_debt||0)*rate).toFixed(2)}</div>
            <div style="color:var(--outline);font-size:12px">$${(c.total_debt||0).toFixed(2)}</div>
          </div>
        </div>

        <div style="margin-bottom:16px;font-size:13px;background:var(--surface-container-low);padding:8px;border-radius:var(--radius)">
          <span style="color:var(--outline)">Cédula:</span> <strong>${c.cedula||'—'}</strong> | 
          <span style="color:var(--outline)">Tel:</span> <strong>${c.phone||'—'}</strong>
        </div>

        ${c.total_debt > 0 ? `
        <div style="margin-bottom:20px;padding:12px;background:var(--surface-highest);border-radius:var(--radius);border:1px solid var(--outline-variant)">
          <div class="form-label" style="margin-bottom:8px">Registrar Abono</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input class="form-input" type="number" step="0.01" id="abono-amount" placeholder="Monto en Bs." style="flex:1" oninput="document.getElementById('abono-usd-preview').textContent='≈ $'+(this.value/(${rate})).toFixed(2)">
            <span id="abono-usd-preview" style="color:var(--outline);font-size:12px;min-width:70px">≈ $0.00</span>
            <button class="btn btn-success" onclick="ClientsPage.addPayment(${id},${rate})">Abonar</button>
          </div>
        </div>` : ''}

        <div class="timeline-container">
          <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em">Historial de Movimientos</div>
          <div style="max-height:300px;overflow-y:auto;padding-right:4px">
            ${timeline.map(item => `
              <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--outline-variant);align-items:flex-start">
                <div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${item.type==='purchase'?'var(--error-container)':'var(--success-container)'};color:${item.type==='purchase'?'var(--error)':'var(--success)'}">
                  <span class="material-symbols-outlined" style="font-size:20px">${item.type==='purchase'?'shopping_cart':'payments'}</span>
                </div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:600;font-size:14px">${item.type==='purchase'?'Compra a Crédito':'Abono Recibido'}</span>
                    <span style="font-family:var(--font-mono);font-weight:700;color:${item.type==='purchase'?'var(--error)':'var(--success)'}">
                      ${item.type==='purchase'?'+':'-'} Bs. ${(item.amount*rate).toFixed(2)}
                    </span>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;font-size:12px;color:var(--outline)">
                    <span>${item.sale ? `Venta #${item.sale}` : (item.method ? `Vía ${item.method}` : '')}</span>
                    <span>${Format.timeAgo(item.date)}</span>
                  </div>
                </div>
              </div>
            `).join('') || '<p style="text-align:center;color:var(--outline);padding:20px">Sin movimientos registrados</p>'}
          </div>
        </div>

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
