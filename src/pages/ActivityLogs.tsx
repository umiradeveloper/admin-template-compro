import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { History, Search } from 'lucide-react';
import { api } from '../lib/api';
import type { ActivityLog, Paginated } from '../lib/types';
import { formatDate } from '../lib/utils';
import { Badge, EmptyState, Input, PageLoader, Pagination, Select } from '../components/ui';
import { PageHeader } from '../components/PageHeader';

const ACTIONS: Record<string, string> = {
  create: 'Tambah', update: 'Ubah', delete: 'Hapus', login: 'Login', upload: 'Upload', duplicate: 'Duplikat',
  bulk_status: 'Ubah status massal', bulk_delete: 'Hapus massal', reorder: 'Urutkan', import: 'Impor',
};
const tone = (a: string) => (a === 'delete' || a === 'bulk_delete' ? 'danger' : a === 'create' || a === 'upload' ? 'teal' : a === 'login' ? 'neutral' : 'copper');

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['activity', { page, search, action }],
    queryFn: async () => (await api.get<Paginated<ActivityLog>>('/admin/activity-logs', { params: { page, limit: 25, search: search || undefined, action: action || undefined } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Log aktivitas" description="Rekam jejak setiap perubahan konten dan login ke CMS." />
      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-wrap gap-3 border-b border-line px-5 py-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Cari pengguna atau keterangan…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select className="w-48" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Jenis aksi">
            <option value="">Semua aksi</option>
            {Object.entries(ACTIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </div>
        {isLoading ? <PageLoader /> : !data?.data.length ? (
          <EmptyState icon={<History className="size-8" />} title="Belum ada aktivitas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="py-2.5 pl-5 font-medium">Waktu</th>
                  <th className="py-2.5 pr-3 font-medium">Aksi</th>
                  <th className="py-2.5 pr-3 font-medium">Keterangan</th>
                  <th className="hidden py-2.5 pr-5 font-medium md:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 pl-5 whitespace-nowrap text-ink-3 tabular-nums">{formatDate(l.createdAt, true)}</td>
                    <td className="py-2.5 pr-3"><Badge tone={tone(l.action)}>{ACTIONS[l.action] ?? l.action}</Badge></td>
                    <td className="py-2.5 pr-3">{l.description}</td>
                    <td className="hidden py-2.5 pr-5 text-xs text-muted md:table-cell">{l.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </div>
    </>
  );
}
