import type React from 'react';
import clsx, { ClassValue } from 'clsx';

export const cn = (...v: ClassValue[]) => clsx(v);

export function formatDate(v?: string | null, withTime = false) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(v: string) {
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(v);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function toSlug(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 180);
}

/** ISO → nilai untuk <input type="date"> */
export const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : '');
/** ISO → nilai untuk <input type="datetime-local"> (waktu lokal) */
export function toDateTimeInput(v?: string | null) {
  if (!v) return '';
  const d = new Date(v);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export const ROLE_LABEL: Record<string, string> = { superadmin: 'Super admin', admin: 'Admin', editor: 'Editor' };
export const ROLE_LEVEL: Record<string, number> = { superadmin: 3, admin: 2, editor: 1 };
export const STATUS_LABEL: Record<string, string> = { draft: 'Draf', published: 'Terbit', archived: 'Diarsipkan' };
export const INQUIRY_LABEL: Record<string, string> = { new: 'Baru', read: 'Dibaca', replied: 'Dibalas', archived: 'Diarsipkan' };

/** sembunyikan <img> yang gagal dimuat (mis. website belum berjalan) */
export const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
};
