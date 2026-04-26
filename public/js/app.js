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

  // Estado de actualización
  _pendingUpdate: null,

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
    
    // Version
    if (window.elbrother && window.elbrother.getAppVersion) {
      try {
        const version = await window.elbrother.getAppVersion();
        const el = document.getElementById('app-version');
        if (el) el.textContent = `v${version}`;
      } catch (e) { console.error('Error loading version:', e); }
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

    // ═══════════════════════════════════════════
    //  AUTO-UPDATE — Listeners
    // ═══════════════════════════════════════════
    if (window.elbrother && window.elbrother.onUpdateAvailable) {
      window.elbrother.onUpdateAvailable((data) => {
        this._pendingUpdate = data;
        this.showUpdateBanner(data.version);
      });

      window.elbrother.onUpdateProgress((progress) => {
        this.updateDownloadProgress(progress);
      });
    }

    // Hash routing
    window.addEventListener('hashchange', () => this.route());
  },

  // ═══════════════════════════════════════════
  //  AUTO-UPDATE — UI Methods
  // ═══════════════════════════════════════════

  showUpdateBanner(version) {
    // Remover banner anterior si existe
    const existing = document.getElementById('update-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.className = 'update-banner';
    banner.innerHTML = `
      <div class="update-banner-content">
        <span class="material-symbols-outlined update-banner-icon">system_update</span>
        <div class="update-banner-text">
          <strong>Nueva versión v${version} disponible</strong>
          <span>Descarga e instala la actualización</span>
        </div>
        <div class="update-banner-actions">
          <button class="btn btn-sm btn-outline" onclick="App.dismissUpdateBanner()" style="color:var(--on-surface);border-color:var(--outline)">Después</button>
          <button class="btn btn-sm btn-primary" onclick="App.startUpdate()" id="update-start-btn">
            <span class="material-symbols-outlined">download</span>Actualizar
          </button>
        </div>
      </div>
      <div class="update-progress-container hidden" id="update-progress-wrap">
        <div class="update-progress-bar" id="update-progress-bar"></div>
        <span class="update-progress-text" id="update-progress-text">0%</span>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);
  },

  dismissUpdateBanner() {
    const banner = document.getElementById('update-banner');
    if (banner) {
      banner.classList.add('update-banner-hiding');
      setTimeout(() => banner.remove(), 300);
    }
  },

  async startUpdate() {
    if (!this._pendingUpdate || !window.elbrother) return;

    const updateInfo = this._pendingUpdate.updateInfo;

    // Si es GitHub fallback, descargar directamente via navegador
    if (updateInfo?.isGitHubFallback) {
      try {
        const result = await window.elbrother.downloadUpdates(updateInfo);
        if (result === 'external') {
          Toast.success('Descarga iniciada en tu navegador. Ejecuta el instalador cuando termine.');
          this.dismissUpdateBanner();
        } else {
          Toast.error('Error al iniciar la descarga');
        }
      } catch (e) {
        Toast.error('Error: ' + e.message);
      }
      return;
    }

    // Velopack: flujo automático
    const btn = document.getElementById('update-start-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined spin">progress_activity</span>Descargando...';
    }

    // Mostrar barra de progreso
    const progressWrap = document.getElementById('update-progress-wrap');
    if (progressWrap) progressWrap.classList.remove('hidden');

    // Ocultar botón "Después"
    const dismissBtn = btn?.previousElementSibling;
    if (dismissBtn) dismissBtn.classList.add('hidden');

    try {
      const success = await window.elbrother.downloadUpdates(updateInfo);
      if (success) {
        if (btn) btn.innerHTML = '<span class="material-symbols-outlined">restart_alt</span>Reiniciando...';
        Toast.success('Actualización descargada. Reiniciando...');
        setTimeout(async () => {
          await window.elbrother.applyUpdates(updateInfo);
        }, 1500);
      } else {
        Toast.error('Error al descargar la actualización');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span class="material-symbols-outlined">download</span>Reintentar';
        }
      }
    } catch (e) {
      Toast.error('Error: ' + e.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">download</span>Reintentar';
      }
    }
  },

  updateDownloadProgress(progress) {
    const bar = document.getElementById('update-progress-bar');
    const text = document.getElementById('update-progress-text');
    if (bar) bar.style.width = `${progress}%`;
    if (text) text.textContent = `${progress}%`;
  },

  // ═══════════════════════════════════════════

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
