// API utility wrapper
window.API = {
  token: null,
  async request(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'include'
    });
    if (res.status === 401) { window.App?.showLogin(); throw new Error('No autorizado'); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
  },
  get: (url) => window.API.request(url),
  post: (url, body) => window.API.request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => window.API.request(url, { method: 'PUT', body: JSON.stringify(body) }),
  del: (url) => window.API.request(url, { method: 'DELETE' })
};
