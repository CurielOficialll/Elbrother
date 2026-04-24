window.Toast = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px">${icons[type]||'info'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, duration);
  },
  success: (m) => window.Toast.show(m, 'success'),
  error: (m) => window.Toast.show(m, 'error'),
  info: (m) => window.Toast.show(m, 'info')
};
