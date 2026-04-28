window.POSPage = {
  products: [], categories: [], clients: [], selectedCategory: null, _method: null, selectedClient: null,
  async render() {
    try {
      this.categories = await API.get('/api/categories');
      this.products = await API.get('/api/products');
      this.clients = await API.get('/api/clients');
    } catch(e) { this.products = []; this.categories = []; this.clients = []; }
    Store.off('cart');
    Store.on('cart', () => this.renderCart());
    return `<div class="pos-layout">
      <div class="pos-products">
        <div class="pos-search"><span class="material-symbols-outlined">search</span><input type="text" id="pos-search" placeholder="Buscar producto o escanear código..." oninput="POSPage.search(this.value)" autofocus></div>
        <div class="category-chips" id="category-chips">
          <div class="chip active" onclick="POSPage.filterCategory(null,this)"><span class="material-symbols-outlined">apps</span>Todos</div>
          ${this.categories.map(c=>`<div class="chip" onclick="POSPage.filterCategory(${c.id},this)">${c.name}</div>`).join('')}
        </div>
        <div class="product-grid" id="product-grid">${this.renderProducts(this.products)}</div>
      </div>
      <div class="pos-cart">
        <div class="cart-header"><h3 style="font-size:16px;font-weight:700"><span class="material-symbols-outlined" style="vertical-align:middle;margin-right:4px">receipt_long</span>Ticket</h3><button class="btn btn-sm btn-ghost" onclick="Store.clearCart();Toast.info('Carrito vacío')">Limpiar</button></div>
        <div class="cart-items" id="cart-items"><div class="empty-state" style="padding:32px"><span class="material-symbols-outlined" style="font-size:48px">add_shopping_cart</span><p style="font-size:13px;margin-top:8px">Agrega productos al carrito</p></div></div>
        <div class="cart-totals" id="cart-totals">${this.renderTotals()}</div>
      </div>
    </div>`;
  },
  afterRender() {
    const searchInput = document.getElementById('pos-search');
    if (searchInput) searchInput.focus();
  },
  renderProducts(products) {
    if(!products.length) return '<div class="empty-state"><span class="material-symbols-outlined">inventory_2</span><p>No se encontraron productos</p></div>';
    const rate = Store.get('bcvRate') || 483.87;
    return products.map(p=>{
      const bsPrice = Math.round(p.sell_price * rate * 100) / 100;
      const isWeight = p.sells_by_weight;
      const unitTag = isWeight ? `/${p.unit || 'kg'}` : '';
      const weightBadge = isWeight ? `<div class="product-weight-badge"><span class="material-symbols-outlined" style="font-size:14px">scale</span>${(p.unit || 'kg').toUpperCase()}</div>` : '';
      const stockDisplay = isWeight ? `${parseFloat(p.stock).toFixed(2)} ${p.unit || 'kg'}` : `${Math.round(p.stock)} ${p.unit||''}`;
      return `<div class="product-card ${p.stock<=0?'out-of-stock':''}" onclick="POSPage.addToCart(${p.id})">
      ${weightBadge}
      <div class="product-name">${p.name}</div>
      <div class="product-price">Bs. ${bsPrice.toFixed(2)}${unitTag}</div>
      <div style="font-family:var(--font-mono);font-size:12px;color:var(--outline)">$${p.sell_price.toFixed(2)}${unitTag}</div>
      <div class="product-stock ${p.stock<=p.min_stock?'low':''}">Stock: ${stockDisplay}</div>
    </div>`;}).join('');
  },
  renderCart() {
    const cart = Store.get('cart');
    const el = document.getElementById('cart-items');
    const totals = document.getElementById('cart-totals');
    if(!el) return;
    const rate = Store.get('bcvRate') || 483.87;
    if(!cart.length) { el.innerHTML = '<div class="empty-state" style="padding:32px"><span class="material-symbols-outlined" style="font-size:48px">add_shopping_cart</span><p style="font-size:13px;margin-top:8px">Agrega productos</p></div>'; }
    else { el.innerHTML = cart.map(i=>{
      const totalBs = Math.round(i.price * i.quantity * rate * 100) / 100;
      const unitBs = Math.round(i.price * rate * 100) / 100;
      const isWeight = i.sells_by_weight;
      const qtyDisplay = isWeight ? `${i.quantity.toFixed(3)} ${i.unit}` : i.quantity;
      const priceLabel = isWeight ? `Bs. ${unitBs.toFixed(2)}/${i.unit}` : `Bs. ${unitBs.toFixed(2)}/u`;
      
      // Weight products: use direct input; Regular: use +/- buttons
      const qtyControl = isWeight 
        ? `<div class="qty-control" style="gap:4px">
            <button onclick="Store.updateQty(${i.product_id},${Math.round((i.quantity-0.1)*1000)/1000})">−</button>
            <input type="number" step="0.001" min="0.001" max="${i.stock}" value="${i.quantity}" 
              style="width:70px;text-align:center;font-size:13px;padding:2px 4px;border:1px solid var(--outline-variant);border-radius:4px;background:var(--surface);color:var(--on-surface)"
              onchange="Store.updateQty(${i.product_id}, parseFloat(this.value)||0)">
            <button onclick="Store.updateQty(${i.product_id},${Math.round((i.quantity+0.1)*1000)/1000})">+</button>
            <span style="font-size:11px;color:var(--outline);min-width:20px">${i.unit}</span>
          </div>`
        : `<div class="qty-control"><button onclick="Store.updateQty(${i.product_id},${i.quantity-1})">−</button><span>${i.quantity}</span><button onclick="Store.updateQty(${i.product_id},${i.quantity+1})">+</button></div>`;

      return `<div class="cart-item cart-item-left"><div class="cart-item-header"><span class="cart-item-name">${isWeight ? '<span class="material-symbols-outlined" style="font-size:14px;vertical-align:middle;margin-right:2px">scale</span>' : ''}${i.name}</span><span class="cart-item-total">Bs. ${totalBs.toFixed(2)}</span></div><div class="cart-item-meta">${qtyControl}<span>${priceLabel}</span><button onclick="Store.updateQty(${i.product_id},0)" style="margin-left:auto;color:var(--error)"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button></div></div>`;}).join(''); }
    if(totals) totals.innerHTML = this.renderTotals();
  },
  renderTotals() {
    const cart = Store.get('cart');
    const rate = Store.get('bcvRate') || 483.87;
    const taxRate = (Store.get('taxRate') !== undefined && Store.get('taxRate') !== null) ? parseFloat(Store.get('taxRate')) : 0.16;
    const subtotalUsd = Store.getCartTotal();
    const taxUsd = Math.round(subtotalUsd * taxRate * 100) / 100;
    const totalUsd = Math.round((subtotalUsd + taxUsd) * 100) / 100;
    const subtotalBs = Math.round(subtotalUsd * rate * 100) / 100;
    const taxBs = Math.round(taxUsd * rate * 100) / 100;
    const totalBs = Math.round(totalUsd * rate * 100) / 100;
    return `<div class="cart-total-row"><span>Subtotal</span><span>Bs. ${subtotalBs.toFixed(2)}</span></div>
    <div class="cart-total-row"><span>IVA (${(taxRate * 100).toFixed(0)}%)</span><span>Bs. ${taxBs.toFixed(2)}</span></div>
    <div class="cart-total-row" style="border-top:1px solid var(--outline-variant);padding-top:8px;margin-top:4px"><span style="font-weight:700;color:var(--on-surface)">TOTAL</span><span class="cart-grand-total">Bs. ${totalBs.toFixed(2)}</span></div>
    <div class="cart-total-row"><span>Referencia USD</span><span style="color:var(--outline);font-family:var(--font-mono);font-size:13px">$${totalUsd.toFixed(2)}</span></div>
    <div class="payment-grid">
      <button class="btn btn-outline pay-method-btn ${POSPage._method==='cash'?'pay-method-active':''}" onclick="POSPage.selectMethod('cash',this)" ${!cart.length?'disabled':''}><span class="material-symbols-outlined">payments</span>Efectivo</button>
      <button class="btn btn-outline pay-method-btn ${POSPage._method==='card'?'pay-method-active':''}" onclick="POSPage.selectMethod('card',this)" ${!cart.length?'disabled':''}><span class="material-symbols-outlined">credit_card</span>Tarjeta</button>
      <button class="btn btn-outline pay-method-btn ${POSPage._method==='mobile'?'pay-method-active':''}" onclick="POSPage.selectMethod('mobile',this)" ${!cart.length?'disabled':''}><span class="material-symbols-outlined">phone_android</span>P. Móvil</button>
      <button class="btn btn-outline pay-method-btn ${POSPage._method==='biopago'?'pay-method-active':''}" onclick="POSPage.selectMethod('biopago',this)" ${!cart.length?'disabled':''}><span class="material-symbols-outlined">fingerprint</span>Biopago</button>
      <button class="btn btn-outline pay-method-btn ${POSPage._method==='credit'?'pay-method-active':''}" onclick="POSPage.selectMethod('credit',this)" ${!cart.length?'disabled':''}><span class="material-symbols-outlined">schedule</span>Fiado</button>
    </div>
    ${POSPage._method === 'credit' ? `
    <div style="margin: 12px 0;">
      <select class="form-input" onchange="POSPage.selectedClient = this.value">
        <option value="">-- Seleccionar Cliente --</option>
        ${POSPage.clients.map(c => `<option value="${c.id}" ${POSPage.selectedClient == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
    </div>` : ''}
    <button class="btn btn-confirm-sale" onclick="POSPage.confirmSale()" ${!cart.length || !POSPage._method?'disabled':''}><span class="material-symbols-outlined">check_circle</span>Confirmar Venta</button>`;
  },
  addToCart(id) {
    const product = this.products.find(p=>p.id===id);
    if(!product) return;
    // If product sells by weight, open weight modal instead of adding directly
    if (product.sells_by_weight) {
      this.openWeightModal(product);
      return;
    }
    if(Store.addToCart(product)) { Sounds.play('scan'); } else { Toast.error('Stock insuficiente'); Sounds.play('error'); }
  },
  openWeightModal(product) {
    const rate = Store.get('bcvRate') || 483.87;
    const bsPrice = Math.round(product.sell_price * rate * 100) / 100;
    const unit = product.unit || 'kg';
    const stockDisplay = parseFloat(product.stock).toFixed(3);
    
    document.getElementById('modal-body').innerHTML = `
      <div class="modal-title"><span class="material-symbols-outlined">scale</span>Venta por Peso: ${product.name}</div>
      <div style="text-align:center;margin-bottom:16px">
        <div style="display:flex;justify-content:center;gap:24px;margin-bottom:16px">
          <div>
            <div style="font-size:11px;color:var(--outline);text-transform:uppercase">Precio por ${unit}</div>
            <div style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--primary)">Bs. ${bsPrice.toFixed(2)}</div>
            <div style="font-family:var(--font-mono);font-size:12px;color:var(--outline)">$${product.sell_price.toFixed(2)}</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--outline);text-transform:uppercase">Stock disponible</div>
            <div style="font-family:var(--font-mono);font-size:20px;font-weight:700">${stockDisplay} ${unit}</div>
          </div>
        </div>
      </div>
      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label" style="font-size:14px;font-weight:600">Peso (${unit})</label>
        <input type="number" class="form-input" id="weight-input" step="0.001" min="0.001" max="${product.stock}" 
          placeholder="Ej: 0.750" autofocus style="font-size:24px;text-align:center;padding:16px;font-family:var(--font-mono)"
          oninput="POSPage.updateWeightPreview(${product.sell_price}, '${unit}')">
      </div>
      <div class="weight-quick-btns" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;justify-content:center">
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('weight-input').value='0.100';POSPage.updateWeightPreview(${product.sell_price},'${unit}')">100g</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('weight-input').value='0.250';POSPage.updateWeightPreview(${product.sell_price},'${unit}')">250g</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('weight-input').value='0.500';POSPage.updateWeightPreview(${product.sell_price},'${unit}')">500g</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('weight-input').value='0.750';POSPage.updateWeightPreview(${product.sell_price},'${unit}')">750g</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('weight-input').value='1.000';POSPage.updateWeightPreview(${product.sell_price},'${unit}')">1 kg</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('weight-input').value='2.000';POSPage.updateWeightPreview(${product.sell_price},'${unit}')">2 kg</button>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('weight-input').value='5.000';POSPage.updateWeightPreview(${product.sell_price},'${unit}')">5 kg</button>
      </div>
      <div id="weight-preview" style="background:var(--surface-variant);border-radius:var(--radius);padding:16px;text-align:center;margin-bottom:16px">
        <div style="font-size:12px;color:var(--outline);text-transform:uppercase">Subtotal</div>
        <div style="font-family:var(--font-mono);font-size:28px;font-weight:700;color:var(--primary)" id="weight-subtotal">Bs. 0.00</div>
        <div style="font-family:var(--font-mono);font-size:14px;color:var(--outline)" id="weight-subtotal-usd">$0.00</div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
        <button type="button" class="btn btn-primary" id="weight-confirm-btn" onclick="POSPage.confirmWeight(${product.id})" disabled>
          <span class="material-symbols-outlined">add_shopping_cart</span>Agregar al Carrito
        </button>
      </div>`;
    document.getElementById('modal-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('weight-input')?.focus(), 100);
  },
  updateWeightPreview(priceUsd, unit) {
    const weight = parseFloat(document.getElementById('weight-input')?.value) || 0;
    const rate = Store.get('bcvRate') || 483.87;
    const subtotalUsd = Math.round(priceUsd * weight * 100) / 100;
    const subtotalBs = Math.round(subtotalUsd * rate * 100) / 100;
    const el = document.getElementById('weight-subtotal');
    const elUsd = document.getElementById('weight-subtotal-usd');
    const btn = document.getElementById('weight-confirm-btn');
    if (el) el.textContent = `Bs. ${subtotalBs.toFixed(2)}`;
    if (elUsd) elUsd.textContent = `$${subtotalUsd.toFixed(2)}`;
    if (btn) btn.disabled = weight <= 0;
  },
  confirmWeight(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;
    const weight = parseFloat(document.getElementById('weight-input')?.value) || 0;
    if (weight <= 0) { Toast.error('Ingrese un peso válido'); return; }
    if (weight > product.stock) { Toast.error('Peso excede el stock disponible'); Sounds.play('error'); return; }
    if (Store.addToCart(product, weight)) {
      Sounds.play('scan');
      App.closeModal();
      Toast.success(`${product.name}: ${weight.toFixed(3)} ${product.unit || 'kg'} agregado`);
    } else {
      Toast.error('Stock insuficiente');
      Sounds.play('error');
    }
  },
  async search(term) {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    
    if(!term) { 
      grid.innerHTML = this.renderProducts(this.selectedCategory ? this.products.filter(p=>p.category_id===this.selectedCategory) : this.products); 
      return; 
    }
    
    const words = term.toLowerCase().split(' ').filter(w => w.length > 0);
    const results = this.products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      // Fuzzy match: all words in search term must be present in name or code
      return words.every(word => name.includes(word) || code.includes(word));
    });
    
    grid.innerHTML = this.renderProducts(results);
    if (results.length === 0) Sounds.play('error');
  },
  filterCategory(catId, el) {
    this.selectedCategory = catId;
    document.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
    if(el) el.classList.add('active');
    const filtered = catId ? this.products.filter(p=>p.category_id===catId) : this.products;
    document.getElementById('product-grid').innerHTML = this.renderProducts(filtered);
  },
  selectMethod(method, el) {
    this._method = method;
    if (method !== 'credit') this.selectedClient = null;
    document.getElementById('cart-totals').innerHTML = this.renderTotals();
  },
  async confirmSale() {
    const cart = Store.get('cart');
    if (!cart.length) return;
    if (!this._method) { Toast.error('Seleccione un método de pago'); return; }
    if (this._method === 'credit' && !this.selectedClient) { Toast.error('Seleccione el cliente para fiar'); return; }
    try {
      const items = cart.map(i => ({ product_id: i.product_id, quantity: i.quantity }));
      const result = await API.post('/api/sales', { items, payment_method: this._method, client_id: this.selectedClient });
      Store.clearCart();
      this._method = null;
      this.selectedClient = null;
      Sounds.play('success');
      const rate = Store.get('bcvRate') || 483.87;
      Toast.success(`Venta ${result.sale_number}: Bs. ${(result.total * rate).toFixed(2)} ($${result.total.toFixed(2)})`);
      this.products = await API.get('/api/products');
      this.filterCategory(this.selectedCategory, document.querySelector('.chip.active'));
    } catch (err) {
      Toast.error(err.message);
      Sounds.play('error');
    }
  }
};
