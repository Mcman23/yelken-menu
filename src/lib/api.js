// All data access goes through the two Base44 backend functions. No secrets live in the browser.
export const API_BASE =
  import.meta.env.VITE_MENU_API_BASE || 'https://superagent-c72b7f13.base44.app/functions';

const TOKEN_KEY = 'yelken_admin_token';
export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch {} };

export async function fetchMenu() {
  const r = await fetch(`${API_BASE}/menuApi`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error('menu_' + r.status);
  return r.json();
}

export async function admin(action, payload = {}) {
  const token = getToken();
  const r = await fetch(`${API_BASE}/menuAdmin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action, ...payload }),
  });
  let data = {};
  try { data = await r.json(); } catch {}
  if (r.status === 401 && token && action !== 'login') { setToken(''); window.dispatchEvent(new Event('admin-logout')); }
  if (!r.ok) { const e = new Error(data.error || 'http_' + r.status); e.status = r.status; e.data = data; throw e; }
  return data;
}
