window.InventoryPage = {
  async render() {
    try {
      const [products, categories] = await Promise.all([API.get('/api/products'), API.get('/api/categories')]);
      const rate = Store.get('bcvRate') || 483.87;
      return `<div class="page-header"><h1 class="page-title">Inventario</h1><div class="page-actions"><button class="btn btn-primary" onclick="InventoryPage.openAdd()"><span class="material-symbols-outlined">add</span>Nuevo Producto</button></div></div>
      <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div class="pos-search" style="flex:1;min-width:200px"><span class="material-symbols-outlined">search</span><input type="text" id="inv-search" placeholder="Buscar por nombre o código..." oninput="InventoryPage.filter()"></div>
        <select class="form-input" id="inv-cat-filter" style="width:200px" onchange="InventoryPage.filter()"><option value="">Todas las categorías</option>${categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--outline);cursor:pointer"><input type="checkbox" id="inv-low-filter" onchange="InventoryPage.filter()"> Solo stock bajo</label>
      </div>
      <div class="table-container" id="inv-table">
        <table><thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Costo Bs</th><th>Precio Bs</th><th>Ref USD</th><th>Stock</th><th>Acciones</th></tr></thead>
        <tbody id="inv-tbody">${this.renderRows(products, rate)}</tbody></table>
      </div>`;
    } catch(e) { return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`; }
  },
  renderRows(products, rate) {
    if(!rate) rate = Store.get('bcvRate') || 483.87;
    if(!products.length) return '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--outline)">No hay productos</td></tr>';
    return products.map(p=>`<tr>
      <td style="font-family:var(--font-mono);color:var(--outline)">${p.barcode||'—'}</td>
      <td style="font-weight:600">${p.name}</td>
      <td><span class="badge badge-info">${p.category_name||'Sin categoría'}</span></td>
      <td style="font-family:var(--font-mono)">Bs. ${(p.cost_price*rate).toFixed(2)}</td>
      <td style="font-family:var(--font-mono);color:var(--primary);font-weight:700">Bs. ${(p.sell_price*rate).toFixed(2)}</td>
      <td style="font-family:var(--font-mono);color:var(--outline)">$${p.sell_price.toFixed(2)}</td>
      <td><span class="badge ${p.stock<=p.min_stock?'badge-error':'badge-success'}">${p.stock} ${p.unit||''}</span></td>
      <td style="display:flex;gap:4px"><button class="btn btn-sm btn-ghost" onclick="InventoryPage.openEdit(${p.id})" title="Editar"><span class="material-symbols-outlined" style="font-size:18px">edit</span></button><button class="btn btn-sm btn-ghost" onclick="InventoryPage.deleteProduct(${p.id},'${p.name.replace(/'/g,"\\&#39;")}')" title="Eliminar" style="color:var(--error)"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></td>
    </tr>`).join('');
  },
  async filter() {
    const search = document.getElementById('inv-search')?.value || '';
    const cat = document.getElementById('inv-cat-filter')?.value || '';
    const low = document.getElementById('inv-low-filter')?.checked;
    const params = new URLSearchParams();
    if(search) params.set('search', search);
    if(cat) params.set('category', cat);
    if(low) params.set('low_stock', 'true');
    const products = await API.get(`/api/products?${params}`);
    document.getElementById('inv-tbody').innerHTML = this.renderRows(products);
  },
  openAdd() {
    const rate = Store.get('bcvRate') || 483.87;
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">add_circle</span>Nuevo Producto</div>
      <form onsubmit="InventoryPage.save(event)">
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Código de Barras</label><input class="form-input" id="p-barcode" placeholder="Opcional"></div>
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Nombre</label><input class="form-input" id="p-name" required></div>
        <p style="color:var(--outline);font-size:11px;margin-bottom:8px">Ingrese los precios en Bolívares · Tasa BCV: ${rate.toFixed(2)} Bs/$</p>
        <div class="form-row" style="margin-bottom:4px">
          <div class="form-group"><label class="form-label">Costo (Bs.)</label><input class="form-input" type="number" step="0.01" id="p-cost-bs" value="0" oninput="InventoryPage.convertPreview()"></div>
          <div class="form-group"><label class="form-label">Precio Venta (Bs.)</label><input class="form-input" type="number" step="0.01" id="p-price-bs" required oninput="InventoryPage.convertPreview()"></div>
        </div>
        <div id="usd-preview" style="display:flex;gap:16px;margin-bottom:12px;padding:6px 10px;background:rgba(0,200,255,0.05);border-radius:var(--radius);border:1px solid var(--outline-variant)">
          <span style="font-size:11px;color:var(--outline);font-family:var(--font-mono)">Ref. Costo: $0.00</span>
          <span style="font-size:11px;color:var(--primary);font-family:var(--font-mono);font-weight:600">Ref. Venta: $0.00</span>
        </div>
        <div class="form-row" style="margin-bottom:12px"><div class="form-group"><label class="form-label">Stock</label><input class="form-input" type="number" id="p-stock" value="0"></div><div class="form-group"><label class="form-label">Stock Mínimo</label><input class="form-input" type="number" id="p-min" value="5"></div></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Guardar</button></div>
      </form>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  async openEdit(id) {
    const p = await API.get(`/api/products/${id}`);
    const rate = Store.get('bcvRate') || 483.87;
    const costBs = (p.cost_price * rate).toFixed(2);
    const priceBs = (p.sell_price * rate).toFixed(2);
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">edit</span>Editar: ${p.name}</div>
      <form onsubmit="InventoryPage.update(event,${id})">
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Nombre</label><input class="form-input" id="p-name" value="${p.name}" required></div>
        <p style="color:var(--outline);font-size:11px;margin-bottom:8px">Ingrese los precios en Bolívares · Tasa BCV: ${rate.toFixed(2)} Bs/$</p>
        <div class="form-row" style="margin-bottom:4px">
          <div class="form-group"><label class="form-label">Costo (Bs.)</label><input class="form-input" type="number" step="0.01" id="p-cost-bs" value="${costBs}" oninput="InventoryPage.convertPreview()"></div>
          <div class="form-group"><label class="form-label">Precio Venta (Bs.)</label><input class="form-input" type="number" step="0.01" id="p-price-bs" value="${priceBs}" required oninput="InventoryPage.convertPreview()"></div>
        </div>
        <div id="usd-preview" style="display:flex;gap:16px;margin-bottom:12px;padding:6px 10px;background:rgba(0,200,255,0.05);border-radius:var(--radius);border:1px solid var(--outline-variant)">
          <span style="font-size:11px;color:var(--outline);font-family:var(--font-mono)">Ref. Costo: $${p.cost_price.toFixed(2)}</span>
          <span style="font-size:11px;color:var(--primary);font-family:var(--font-mono);font-weight:600">Ref. Venta: $${p.sell_price.toFixed(2)}</span>
        </div>
        <div class="form-row" style="margin-bottom:12px"><div class="form-group"><label class="form-label">Stock</label><input class="form-input" type="number" id="p-stock" value="${p.stock}"></div><div class="form-group"><label class="form-label">Stock Mínimo</label><input class="form-input" type="number" id="p-min" value="${p.min_stock}"></div></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary">Actualizar</button></div>
      </form>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  convertPreview() {
    const rate = Store.get('bcvRate') || 483.87;
    const costBs = parseFloat(document.getElementById('p-cost-bs')?.value) || 0;
    const priceBs = parseFloat(document.getElementById('p-price-bs')?.value) || 0;
    const costUsd = (costBs / rate).toFixed(2);
    const priceUsd = (priceBs / rate).toFixed(2);
    const el = document.getElementById('usd-preview');
    if (el) el.innerHTML = `<span style="font-size:11px;color:var(--outline);font-family:var(--font-mono)">Ref. Costo: $${costUsd}</span><span style="font-size:11px;color:var(--primary);font-family:var(--font-mono);font-weight:600">Ref. Venta: $${priceUsd}</span>`;
  },
  async save(e) {
    e.preventDefault();
    try {
      const rate = Store.get('bcvRate') || 483.87;
      const costBs = parseFloat(document.getElementById('p-cost-bs').value) || 0;
      const priceBs = parseFloat(document.getElementById('p-price-bs').value) || 0;
      await API.post('/api/products', { name: document.getElementById('p-name').value, barcode: document.getElementById('p-barcode')?.value, cost_price: costBs / rate, sell_price: priceBs / rate, stock: parseInt(document.getElementById('p-stock').value), min_stock: parseInt(document.getElementById('p-min').value) });
      App.closeModal(); Toast.success('Producto creado'); App.navigate('inventory');
    } catch(e) { Toast.error(e.message); }
  },
  async update(e, id) {
    e.preventDefault();
    try {
      const rate = Store.get('bcvRate') || 483.87;
      const costBs = parseFloat(document.getElementById('p-cost-bs').value) || 0;
      const priceBs = parseFloat(document.getElementById('p-price-bs').value) || 0;
      await API.put(`/api/products/${id}`, { name: document.getElementById('p-name').value, cost_price: costBs / rate, sell_price: priceBs / rate, stock: parseInt(document.getElementById('p-stock').value), min_stock: parseInt(document.getElementById('p-min').value) });
      App.closeModal(); Toast.success('Producto actualizado'); App.navigate('inventory');
    } catch(e) { Toast.error(e.message); }
  },
  async deleteProduct(id, name) {
    if(!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await API.del(`/api/products/${id}`);
      Toast.success(`Producto "${name}" eliminado`);
      App.navigate('inventory');
    } catch(e) { Toast.error(e.message); }
  }
};
