// Main SPA Router & App Controller
window.App = {
  pages: {
    dashboard: () => DashboardPage.render(),
    pos: () => POSPage.render(),
    inventory: () => InventoryPage.render(),
    clients: () => ClientsPage.render(),
    purchases: () => PurchasesPage.render(),
    cash: () => CashPage.render(),
    reports: () => ReportsPage.render(),
    calculator: () => CalculatorPage.render(),
    settings: () => SettingsPage.render()
  },

  async init() {
    // Check auth
    try {
      const data = await API.get('/api/auth/me');
      Store.set('user', data.user);
      this.showApp();
    } catch (e) {
      this.showLogin();
    }

    // Load config
    try {
      const config = await API.get('/api/system/config');
      if (config) {
        Store.set('taxRate', config.tax_rate !== undefined && config.tax_rate !== null ? parseFloat(config.tax_rate) : 0.16);
        if (config.bcv_rate) Store.set('bcvRate', parseFloat(config.bcv_rate));
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }

    // Socket.IO
    try {
      this.socket = io();
      this.socket.on('bcv:update', (data) => {
        Store.set('bcvRate', data.rate);
        const el = document.getElementById('bcv-rate-value');
        if (el) el.textContent = Number(data.rate).toFixed(2);
      });
      this.socket.on('sale:new', () => {
        if (Store.get('currentPage') === 'dashboard') this.navigate('dashboard');
      });
    } catch (e) {}

    // Hash routing
    window.addEventListener('hashchange', () => this.route());
  },

  showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('login-screen').innerHTML = LoginPage.render();
    document.getElementById('app-shell').classList.add('hidden');
  },

  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    const user = Store.get('user');
    if (user) {
      const el = document.getElementById('user-name');
      if (el) el.textContent = user.name;
    }
    this.route();
  },

  async route() {
    const hash = window.location.hash.replace('#/', '') || 'dashboard';
    const page = hash.split('/')[0];
    if (!this.pages[page]) {
      window.location.hash = '#/dashboard';
      return;
    }
    await this.navigate(page);
  },

  async navigate(page) {
    if (!this.pages[page]) return;
    Store.set('currentPage', page);

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Update hash without triggering route
    if (window.location.hash !== `#/${page}`) {
      history.replaceState(null, '', `#/${page}`);
    }

    // Render page
    const container = document.getElementById('page-content');
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px"><div class="kpi-value" style="font-size:16px;animation:pulse 1s infinite">Cargando...</div></div>';

    try {
      const html = await this.pages[page]();
      container.innerHTML = html;

      // Post-render hooks
      const pageObjName = page.charAt(0).toUpperCase() + page.slice(1) + 'Page';
      if (window[pageObjName] && window[pageObjName].afterRender) {
        window[pageObjName].afterRender();
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Error: ${err.message}</p></div>`;
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('sidebar-open');

    // Update cash status
    this.updateCashStatus();
  },

  async updateCashStatus() {
    try {
      const cash = await API.get('/api/cash/current');
      const el = document.getElementById('cash-status');
      if (el) el.textContent = cash.open ? 'Caja: ABIERTA' : 'Caja: CERRADA';
    } catch (e) {}
  },

  async logout() {
    try { await API.post('/api/auth/logout'); } catch (e) {}
    Store.set('user', null);
    this.showLogin();
    Toast.info('Sesión cerrada');
  },

  closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').classList.add('hidden');
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
