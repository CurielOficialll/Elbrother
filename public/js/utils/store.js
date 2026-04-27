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
  addToCart(product) {
    const cart = [...this._state.cart];
    const existing = cart.find(i => i.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return false;
      existing.quantity++;
    } else {
      cart.push({ product_id: product.id, name: product.name, price: product.sell_price, quantity: 1, stock: product.stock });
    }
    this.set('cart', cart);
    return true;
  },
  updateQty(productId, qty) {
    const cart = this._state.cart.map(i => i.product_id === productId ? {...i, quantity: Math.max(0, Math.min(qty, i.stock))} : i).filter(i => i.quantity > 0);
    this.set('cart', cart);
  },
  clearCart() { this.set('cart', []); },
  getCartTotal() { return this._state.cart.reduce((s, i) => s + i.price * i.quantity, 0); }
};
