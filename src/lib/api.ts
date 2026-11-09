import axios, { AxiosError } from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'umira_cms_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      tokenStore.clear();
      if (!location.pathname.startsWith('/login')) location.href = `/login?next=${encodeURIComponent(location.pathname)}`;
    }
    return Promise.reject(err);
  },
);

/** Ambil pesan error yang bisa dibaca dari response API */
export function errorMessage(err: unknown): string {
  const e = err as AxiosError<{ message?: string | string[] }>;
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  if (m) return m;
  if (e?.code === 'ERR_NETWORK') return 'Tidak bisa terhubung ke server API. Pastikan backend berjalan.';
  return e?.message ?? 'Terjadi kesalahan';
}

/**
 * Ubah path file menjadi URL yang bisa ditampilkan:
 *  - /uploads/...  → file di backend CMS
 *  - /images/...   → file statis website Next.js
 */
export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  if (path.startsWith('/uploads/')) return `${API_URL}${path}`;
  return SITE_URL ? `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}` : path;
}
