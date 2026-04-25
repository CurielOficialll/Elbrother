window.PurchasesPage = {
  currentTab: 'historial',
  cart: [],

  async render() {
    try {
      return `
        <div class="page-header">
          <h1 class="page-title">Compras y Proveedores</h1>
          <div class="page-actions">
            <button class="btn btn-primary" onclick="PurchasesPage.openAddPurchase()">
              <span class="material-symbols-outlined">add_shopping_cart</span>Nueva Compra
            </button>
            <button class="btn btn-ghost" onclick="PurchasesPage.openAddSupplier()">
              <span class="material-symbols-outlined">person_add</span>Nuevo Proveedor
            </button>
          </div>
        </div>
        <div class="tabs" style="display:flex;gap:16px;margin-bottom:16px;border-bottom:1px solid var(--outline-variant);padding-bottom:8px">
          <button class="btn btn-ghost ${this.currentTab === 'historial' ? 'active' : ''}" onclick="PurchasesPage.setTab('historial')" style="${this.currentTab === 'historial' ? 'border-bottom:2px solid var(--primary)' : ''}">Historial</button>
          <button class="btn btn-ghost ${this.currentTab === 'payables' ? 'active' : ''}" onclick="PurchasesPage.setTab('payables')" style="${this.currentTab === 'payables' ? 'border-bottom:2px solid var(--primary)' : ''}">Cuentas por Pagar</button>
          <button class="btn btn-ghost ${this.currentTab === 'suppliers' ? 'active' : ''}" onclick="PurchasesPage.setTab('suppliers')" style="${this.currentTab === 'suppliers' ? 'border-bottom:2px solid var(--primary)' : ''}">Proveedores</button>
        </div>
        <div id="purchases-content">
          ${await this.renderTabContent()}
        </div>
      `;
    } catch (e) {
      return `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>${e.message}</p></div>`;
    }
  },

  async setTab(tab) {
    this.currentTab = tab;
    App.navigate('purchases');
  },

  async renderTabContent() {
    if (this.currentTab === 'historial') return await this.renderHistorial();
    if (this.currentTab === 'payables') return await this.renderPayables();
    if (this.currentTab === 'suppliers') return await this.renderSuppliers();
  },

  // --- HISTORIAL ---
  async renderHistorial() {
    const purchases = await API.get('/api/purchases');
    return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>N° Compra</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Método</th>
              <th>Total ($)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${purchases.map(p => `
              <tr>
                <td style="font-family:var(--font-mono);font-weight:600">${p.purchase_number}</td>
                <td>${Format.datetime(p.created_at)}</td>
                <td>${p.supplier_name || '—'}</td>
                <td style="text-transform:uppercase;font-size:12px">${p.payment_method}</td>
                <td style="font-family:var(--font-mono);font-weight:700">$${p.total.toFixed(2)}</td>
                <td><span class="badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}">${p.status}</span></td>
                <td>
                  <button class="btn btn-sm btn-ghost" onclick="PurchasesPage.viewPurchase(${p.id})" title="Ver Detalles">
                    <span class="material-symbols-outlined" style="font-size:18px">visibility</span>
                  </button>
                  <button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="PurchasesPage.deletePurchase(${p.id}, '${p.purchase_number}')" title="Eliminar Compra">
                    <span class="material-symbols-outlined" style="font-size:18px">delete</span>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--outline)">No hay compras registradas</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  async viewPurchase(id) {
    try {
      const p = await API.get(`/api/purchases/${id}`);
      document.getElementById('modal-body').innerHTML = `
        <div class="modal-title">
          <span class="material-symbols-outlined">receipt_long</span>
          Detalle de Compra: ${p.purchase_number}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--outline-variant)">
          <div>
            <div style="font-size:12px;color:var(--outline);text-transform:uppercase">Proveedor</div>
            <div style="font-weight:600">${p.supplier_name || 'Desconocido'}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--outline);text-transform:uppercase">Fecha</div>
            <div>${Format.datetime(p.created_at)}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--outline);text-transform:uppercase">Método de Pago</div>
            <div style="text-transform:uppercase">${p.payment_method}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--outline);text-transform:uppercase">Total</div>
            <div style="font-family:var(--font-mono);font-weight:700;font-size:18px">$${p.total.toFixed(2)}</div>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:12px;color:var(--outline);text-transform:uppercase;margin-bottom:8px">Productos</div>
          <div class="table-container" style="max-height:200px;overflow-y:auto">
            <table style="font-size:13px">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Costo U.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${p.items.map(i => `
                  <tr>
                    <td>${i.product_name} <br><small style="color:var(--outline)">${i.barcode || ''}</small></td>
                    <td>${i.quantity}</td>
                    <td style="font-family:var(--font-mono)">$${i.unit_cost.toFixed(2)}</td>
                    <td style="font-family:var(--font-mono)">$${i.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="App.closeModal()">Cerrar</button>
        </div>
      `;
      document.getElementById('modal-overlay').classList.remove('hidden');
    } catch(e) { Toast.error(e.message); }
  },

  async deletePurchase(id, purchaseNumber) {
    if (!confirm(`¿Está seguro de eliminar la compra ${purchaseNumber}?\nEsto restará los productos del inventario y eliminará las cuentas por pagar asociadas.`)) return;
    try {
      await API.del(`/api/purchases/${id}`);
      Toast.success('Compra eliminada correctamente');
      this.setTab('historial');
    } catch(e) {
      Toast.error(e.message);
    }
  },

  // --- CUENTAS POR PAGAR ---
  async renderPayables() {
    const payables = await API.get('/api/purchases/payables/list');
    return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>N° Compra</th>
              <th>Fecha Deuda</th>
              <th>Total Deuda ($)</th>
              <th>Saldo Pendiente ($)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${payables.map(p => `
              <tr>
                <td style="font-weight:600">${p.supplier_name || '—'}</td>
                <td style="font-family:var(--font-mono)">${p.purchase_number}</td>
                <td>${Format.date(p.created_at)}</td>
                <td style="font-family:var(--font-mono)">$${p.amount.toFixed(2)}</td>
                <td style="font-family:var(--font-mono);font-weight:700;color:${p.balance > 0 ? 'var(--error)' : 'var(--success)'}">$${p.balance.toFixed(2)}</td>
                <td><span class="badge ${p.status === 'paid' ? 'badge-success' : 'badge-error'}">${p.status === 'paid' ? 'Pagado' : 'Pendiente'}</span></td>
                <td>
                  ${p.balance > 0 ? `
                    <button class="btn btn-sm btn-success" onclick="PurchasesPage.openPayablePayment(${p.id}, ${p.balance}, '${p.supplier_name.replace(/'/g,"\\'")}')" title="Abonar">
                      <span class="material-symbols-outlined" style="font-size:18px">payments</span> Abonar
                    </button>
                  ` : ''}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--outline)">No hay cuentas por pagar</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  openPayablePayment(id, balance, supplierName) {
    const rate = Store.get('bcvRate') || 40;
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title">
        <span class="material-symbols-outlined">payments</span>
        Abonar a: ${supplierName}
      </div>
      <form onsubmit="PurchasesPage.submitPayablePayment(event, ${id})">
        <div style="margin-bottom:16px;background:var(--surface-variant);padding:12px;border-radius:8px;text-align:center;display:flex;justify-content:space-around">
          <div>
            <div style="font-size:12px;color:var(--outline);text-transform:uppercase">Saldo Pendiente ($)</div>
            <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--error)">$${balance.toFixed(2)}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--outline);text-transform:uppercase">Saldo Pendiente (Bs)</div>
            <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--error)">Bs. ${(balance * rate).toFixed(2)}</div>
          </div>
        </div>
        <div class="form-row" style="margin-bottom:12px">
          <div class="form-group">
            <label class="form-label">Abono en Divisas ($)</label>
            <input type="number" step="0.01" max="${balance}" id="pay-amount-usd" class="form-input" value="${balance.toFixed(2)}" oninput="document.getElementById('pay-amount-bs').value = (this.value * ${rate}).toFixed(2)">
          </div>
          <div class="form-group">
            <label class="form-label">Abono en Bs</label>
            <input type="number" step="0.01" id="pay-amount-bs" class="form-input" value="${(balance * rate).toFixed(2)}" oninput="document.getElementById('pay-amount-usd').value = (this.value / ${rate}).toFixed(2)">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Método de Pago</label>
          <select id="pay-method" class="form-input" required>
            <option value="cash">Efectivo USD</option>
            <option value="transfer">Transferencia Bs</option>
            <option value="zelle">Zelle</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Referencia (Opcional)</label>
          <input type="text" id="pay-ref" class="form-input">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Registrar Pago</button>
        </div>
      </form>
    `;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  async submitPayablePayment(e, id) {
    e.preventDefault();
    try {
      const amount = parseFloat(document.getElementById('pay-amount-usd').value);
      const method = document.getElementById('pay-method').value;
      const ref = document.getElementById('pay-ref').value;
      
      await API.post(`/api/purchases/payables/${id}/pay`, {
        amount,
        payment_method: method,
        reference: ref
      });
      App.closeModal();
      Toast.success('Abono registrado exitosamente');
      this.setTab('payables');
    } catch(err) { Toast.error(err.message); }
  },

  // --- PROVEEDORES ---
  async renderSuppliers() {
    const suppliers = await API.get('/api/suppliers');
    return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Notas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${suppliers.map(s => `
              <tr>
                <td style="font-weight:600">${s.name}</td>
                <td>${s.phone || '—'}</td>
                <td>${s.email || '—'}</td>
                <td>${s.notes || '—'}</td>
                <td>
                  <button class="btn btn-sm btn-ghost" onclick="PurchasesPage.viewSupplier(${s.id})" title="Ver">
                    <span class="material-symbols-outlined" style="font-size:18px">visibility</span>
                  </button>
                  <button class="btn btn-sm btn-ghost" style="color:var(--error)" onclick="PurchasesPage.deleteSupplier(${s.id}, '${s.name.replace(/'/g, "\\'")}')" title="Eliminar Proveedor">
                    <span class="material-symbols-outlined" style="font-size:18px">delete</span>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--outline)">No hay proveedores registrados</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  openAddSupplier() {
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">person_add</span>Nuevo Proveedor</div>
      <form onsubmit="PurchasesPage.saveSupplier(event)">
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Nombre</label><input class="form-input" id="s-name" required></div>
        <div class="form-row" style="margin-bottom:12px">
          <div class="form-group"><label class="form-label">Teléfono</label><input class="form-input" id="s-phone"></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="s-email"></div>
        </div>
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Dirección</label><input class="form-input" id="s-address"></div>
        <div class="form-group" style="margin-bottom:12px"><label class="form-label">Notas</label><textarea class="form-input" id="s-notes"></textarea></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  async saveSupplier(e) {
    e.preventDefault();
    try {
      await API.post('/api/suppliers', { 
        name: document.getElementById('s-name').value, 
        phone: document.getElementById('s-phone').value, 
        email: document.getElementById('s-email').value, 
        address: document.getElementById('s-address').value,
        notes: document.getElementById('s-notes').value 
      });
      App.closeModal(); 
      Toast.success('Proveedor creado'); 
      if (this.currentTab === 'suppliers') {
        this.setTab('suppliers');
      } else {
        // If we opened this from "New Purchase" modal, we might want to refresh the dropdown, but for now we'll just close.
        if (document.getElementById('purchase-supplier-id')) {
          // It was opened from new purchase, we could re-render new purchase or just show success
        }
      }
    } catch(e) { Toast.error(e.message); }
  },

  async viewSupplier(id) {
    // Basic view
    try {
      const s = await API.get(`/api/suppliers/${id}`);
      document.getElementById('modal-body').innerHTML = `
        <div class="modal-title"><span class="material-symbols-outlined">person</span>Proveedor: ${s.name}</div>
        <div style="margin-bottom:16px">
          <p><strong>Teléfono:</strong> ${s.phone || '—'}</p>
          <p><strong>Email:</strong> ${s.email || '—'}</p>
          <p><strong>Dirección:</strong> ${s.address || '—'}</p>
          <p><strong>Notas:</strong> ${s.notes || '—'}</p>
        </div>
        <div class="modal-actions"><button class="btn btn-ghost" onclick="App.closeModal()">Cerrar</button></div>
      `;
      document.getElementById('modal-overlay').classList.remove('hidden');
    } catch(e) { Toast.error(e.message); }
  },

  async deleteSupplier(id, name) {
    if (!confirm(`¿Está seguro de eliminar al proveedor "${name}"?`)) return;
    try {
      await API.del(`/api/suppliers/${id}`);
      Toast.success('Proveedor eliminado correctamente');
      this.setTab('suppliers');
    } catch(e) {
      Toast.error(e.message);
    }
  },

  // --- REGISTRAR NUEVA COMPRA ---
  async openAddPurchase() {
    this.cart = [];
    try {
      const suppliers = await API.get('/api/suppliers');
      const products = await API.get('/api/products');
      
      // We will render a full screen modal or large modal for this.
      document.getElementById('modal-body').innerHTML = `
        <div class="modal-title"><span class="material-symbols-outlined">add_shopping_cart</span>Registrar Compra</div>
        <div style="display:flex;gap:16px;height:60vh">
          
          <!-- Lado izquierdo: Seleccion y Busqueda -->
          <div style="flex:1;display:flex;flex-direction:column;gap:12px;border-right:1px solid var(--outline-variant);padding-right:16px">
            <div class="form-group">
              <label class="form-label">Proveedor</label>
              <div style="display:flex;gap:8px">
                <select id="purchase-supplier" class="form-input" style="flex:1">
                  <option value="">Seleccione un proveedor...</option>
                  ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <button class="btn btn-ghost" onclick="PurchasesPage.openAddSupplier()" title="Nuevo Proveedor"><span class="material-symbols-outlined">add</span></button>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Buscar Producto a Comprar</label>
              <input type="text" class="form-input" id="purchase-search" placeholder="Buscar por código o nombre..." onkeyup="PurchasesPage.searchProductsForPurchase(this.value)">
            </div>
            
            <div style="flex:1;overflow-y:auto">
              <div id="purchase-products-list" style="display:flex;flex-direction:column;gap:8px">
                ${products.slice(0, 50).map(p => this.renderProductOption(p)).join('')}
              </div>
            </div>
          </div>
          
          <!-- Lado derecho: Carrito de Compra -->
          <div style="flex:1;display:flex;flex-direction:column">
            <div style="flex:1;overflow-y:auto;background:var(--surface-variant);border-radius:8px;padding:8px" id="purchase-cart">
              <div style="text-align:center;padding:24px;color:var(--outline)">Agregue productos a la compra</div>
            </div>
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--outline-variant)">
              <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:18px;font-weight:700">
                <span>Total:</span>
                <span id="purchase-total-label" style="font-family:var(--font-mono)">$0.00</span>
              </div>
              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label">Método de Pago / Condición</label>
                <select id="purchase-payment" class="form-input">
                  <option value="cash">Efectivo USD</option>
                  <option value="transfer">Transferencia Bs</option>
                  <option value="zelle">Zelle</option>
                  <option value="credit">Crédito (Cuenta por Pagar)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label">Notas</label>
                <input type="text" id="purchase-notes" class="form-input" placeholder="N° de factura, etc...">
              </div>
              <div style="display:flex;gap:8px">
                <button class="btn btn-ghost" style="flex:1" onclick="App.closeModal()">Cancelar</button>
                <button class="btn btn-primary" style="flex:2" onclick="PurchasesPage.submitPurchase()">Guardar Compra</button>
              </div>
            </div>
          </div>
        </div>
      `;
      // Store full product list globally for the modal
      window._purchaseProducts = products;
      document.getElementById('modal-overlay').classList.remove('hidden');
    } catch(e) { Toast.error(e.message); }
  },

  renderProductOption(p) {
    return `
      <div style="padding:8px;border:1px solid var(--outline-variant);border-radius:6px;display:flex;justify-content:space-between;align-items:center;background:var(--surface)">
        <div>
          <div style="font-weight:600;font-size:13px">${p.name}</div>
          <div style="font-size:11px;color:var(--outline)">Stock act: ${p.stock} | Costo act: $${(p.cost_price||0).toFixed(2)}</div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick='PurchasesPage.addToPurchaseCart(${JSON.stringify(p).replace(/'/g, "&#39;")})'><span class="material-symbols-outlined">add</span></button>
      </div>
    `;
  },

  searchProductsForPurchase(term) {
    const q = term.toLowerCase();
    const filtered = window._purchaseProducts.filter(p => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)));
    document.getElementById('purchase-products-list').innerHTML = filtered.slice(0, 50).map(p => this.renderProductOption(p)).join('');
  },

  addToPurchaseCart(product) {
    const existing = this.cart.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_cost: product.cost_price || 0
      });
    }
    this.renderPurchaseCart();
  },

  updatePurchaseCartItem(index, field, value) {
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) return;
    this.cart[index][field] = val;
    this.renderPurchaseCart();
  },

  removeFromPurchaseCart(index) {
    this.cart.splice(index, 1);
    this.renderPurchaseCart();
  },

  renderPurchaseCart() {
    const container = document.getElementById('purchase-cart');
    const totalLabel = document.getElementById('purchase-total-label');
    
    if (this.cart.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--outline)">Agregue productos a la compra</div>';
      totalLabel.textContent = '$0.00';
      return;
    }

    let total = 0;
    container.innerHTML = this.cart.map((item, idx) => {
      const subtotal = item.quantity * item.unit_cost;
      total += subtotal;
      return `
        <div style="background:var(--surface);border-radius:6px;padding:8px;margin-bottom:8px;display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;font-size:13px">${item.name}</span>
            <button class="btn btn-sm btn-ghost" style="color:var(--error);padding:0" onclick="PurchasesPage.removeFromPurchaseCart(${idx})"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="flex:1">
              <label style="font-size:10px;color:var(--outline)">Cantidad</label>
              <input type="number" class="form-input" style="padding:4px;font-size:13px" min="1" value="${item.quantity}" onchange="PurchasesPage.updatePurchaseCartItem(${idx}, 'quantity', this.value)">
            </div>
            <div style="flex:1">
              <label style="font-size:10px;color:var(--outline)">Costo U. ($)</label>
              <input type="number" class="form-input" style="padding:4px;font-size:13px" step="0.01" min="0" value="${item.unit_cost}" onchange="PurchasesPage.updatePurchaseCartItem(${idx}, 'unit_cost', this.value)">
            </div>
            <div style="flex:1;text-align:right">
              <label style="font-size:10px;color:var(--outline)">Subtotal</label>
              <div style="font-family:var(--font-mono);font-size:13px;font-weight:600;margin-top:4px">$${subtotal.toFixed(2)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    totalLabel.textContent = `$${total.toFixed(2)}`;
  },

  async submitPurchase() {
    const supplier_id = document.getElementById('purchase-supplier').value;
    const payment_method = document.getElementById('purchase-payment').value;
    const notes = document.getElementById('purchase-notes').value;

    if (!supplier_id) { Toast.error('Debe seleccionar un proveedor'); return; }
    if (this.cart.length === 0) { Toast.error('El carrito de compra está vacío'); return; }
    for (const item of this.cart) {
      if (item.quantity <= 0 || item.unit_cost < 0) {
        Toast.error('Revise las cantidades y costos (deben ser mayores a 0)');
        return;
      }
    }

    try {
      await API.post('/api/purchases', {
        supplier_id,
        items: this.cart,
        payment_method,
        notes
      });
      Toast.success('Compra registrada correctamente');
      App.closeModal();
      this.setTab(payment_method === 'credit' ? 'payables' : 'historial');
    } catch(e) { Toast.error(e.message); }
  }
};
