window.Store = {
  _state: { 
    user: null, 
    bcvRate: 36.5, 
    cart: [], 
    currentPage: 'dashboard',
    enableSounds: localStorage.getItem('enableSounds') !== 'false'
  },
  _listeners: {},
  get(key) { return this._state[key]; },
  set(key, value) { 
    this._state[key] = value; 
    if (key === 'enableSounds') localStorage.setItem('enableSounds', value);
    (this._listeners[key]||[]).forEach(fn => fn(value)); 
  },
  on(key, fn) { if(!this._listeners[key]) this._listeners[key]=[]; this._listeners[key].push(fn); },
  off(key, fn) { if(this._listeners[key]) this._listeners[key] = fn ? this._listeners[key].filter(f=>f!==fn) : []; },
  clearListeners(key) { if(key) this._listeners[key]=[]; else this._listeners={}; },
  // Cart helpers
  addToCart(product, quantity) {
    const cart = [...this._state.cart];
    const qty = quantity !== undefined ? parseFloat(quantity) : 1;
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > product.stock) return false;
      existing.quantity = Math.round(newQty * 1000) / 1000;
    } else {
      if (qty > product.stock) return false;
      cart.push({
        product_id: product.id,
        name: product.name,
        price: product.sell_price,
        quantity: Math.round(qty * 1000) / 1000,
        stock: product.stock,
        unit: product.unit || 'und',
        sells_by_weight: product.sells_by_weight || 0
      });
    }
    this.set('cart', cart);
    return true;
  },
  updateQty(productId, qty) {
    const cart = this._state.cart.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = Math.max(0, Math.min(parseFloat(qty) || 0, i.stock));
      return { ...i, quantity: Math.round(newQty * 1000) / 1000 };
    }).filter(i => i.quantity > 0);
    this.set('cart', cart);
  },
  clearCart() { this.set('cart', []); },
  getCartTotal() { return this._state.cart.reduce((s, i) => s + i.price * i.quantity, 0); }
};
