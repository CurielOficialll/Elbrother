window.LoginPage = {
  render() {
    return `
    <div class="login-container">
      <div class="login-glow"></div>
      <div class="login-card">
        <div style="text-align:center;margin-bottom:32px">
          <h1 class="brand-logo" style="font-size:36px;margin-bottom:4px">ELBROTHER</h1>
          <p style="color:var(--outline);font-size:13px;letter-spacing:0.1em;text-transform:uppercase">Sistema de Inventario v2.5</p>
        </div>
        <form id="login-form" onsubmit="window.LoginPage.submit(event)">
          <div class="form-group" style="margin-bottom:20px">
            <label class="form-label">Correo electrónico</label>
            <div class="form-input-icon">
              <span class="material-symbols-outlined">email</span>
              <input class="form-input" type="email" id="login-email" placeholder="usuario@elbrother.com" required autocomplete="email">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:28px">
            <label class="form-label">Contraseña</label>
            <div class="form-input-icon">
              <span class="material-symbols-outlined">lock</span>
              <input class="form-input" type="password" id="login-password" placeholder="••••••••" required autocomplete="current-password">
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="login-btn">
            <span class="material-symbols-outlined">login</span> ACCEDER AL SISTEMA
          </button>
          <p id="login-error" style="color:var(--error);font-size:13px;text-align:center;margin-top:16px;display:none"></p>
        </form>
        <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid var(--outline-variant)">
          <p style="color:var(--outline);font-size:11px;cursor:pointer;transition:color 0.2s" onclick="window.LoginPage.fillCredentials()" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--outline)'" title="Clic para autocompletar">Admin: admin@elbrother.com / admin123</p>
        </div>
      </div>
    </div>`;
  },
  fillCredentials() {
    document.getElementById('login-email').value = 'admin@elbrother.com';
    document.getElementById('login-password').value = 'admin123';
  },
  async submit(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> VERIFICANDO...';
    btn.disabled = true;
    errEl.style.display = 'none';
    try {
      const data = await API.post('/api/auth/login', {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      });
      Store.set('user', data.user);
      window.App.showApp();
      Toast.success(`Bienvenido, ${data.user.name}`);
      Sounds.play('success');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      Sounds.play('error');
    } finally {
      btn.innerHTML = '<span class="material-symbols-outlined">login</span> ACCEDER AL SISTEMA';
      btn.disabled = false;
    }
  }
};
