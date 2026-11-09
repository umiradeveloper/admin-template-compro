import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, assetUrl, errorMessage } from '../../lib/api';
import type { ContentItem, ContentStatus, Paginated } from '../../lib/types';
import { formatDate, hideBroken } from '../../lib/utils';
import { Badge, Button, Checkbox, ConfirmDialog, EmptyState, IconButton, Input, PageLoader, Pagination, StatusBadge, Tabs } from '../../components/ui';
import { PageHeader } from '../../components/PageHeader';
import type { ContentTypeConfig } from './contentTypes';

export default function ContentList({ type }: { type: ContentTypeConfig }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | ContentStatus>('');
  const [selected, setSelected] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<{ ids: number[] } | null>(null);

  const key = ['content', type.key, { page, search, status }];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get<Paginated<ContentItem>>(`/admin/${type.key}`, { params: { page, limit: 15, search: search || undefined, status: status || undefined } })).data,
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['content', type.key] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    setSelected([]);
  };

  const remove = useMutation({
    mutationFn: async (ids: number[]) =>
      ids.length === 1 ? api.delete(`/admin/${type.key}/${ids[0]}`) : api.post(`/admin/${type.key}/bulk-delete`, { ids }),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} ${type.singular} dihapus`);
      setConfirm(null);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const bulkStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: ContentStatus }) => api.post(`/admin/${type.key}/bulk-status`, { ids, status }),
    onSuccess: (_, v) => {
      toast.success(v.status === 'published' ? 'Diterbitkan' : v.status === 'draft' ? 'Dijadikan draf' : 'Diarsipkan');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const duplicate = useMutation({
    mutationFn: async (id: number) => (await api.post<ContentItem>(`/admin/${type.key}/${id}/duplicate`)).data,
    onSuccess: (item) => {
      toast.success('Salinan dibuat sebagai draf');
      invalidate();
      nav(`/${type.key}/${item.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = data?.data ?? [];
  const allChecked = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <>
      <PageHeader
        title={type.label}
        description={type.description}
        actions={
          <Link to={`/${type.key}/new`}>
            <Button icon={<Plus className="size-4" />}>Tambah {type.singular}</Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <Tabs
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            items={[
              { value: '', label: 'Semua' },
              { value: 'published', label: 'Terbit' },
              { value: 'draft', label: 'Draf' },
              { value: 'archived', label: 'Arsip' },
            ]}
          />
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Cari judul atau slug…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-teal-50 px-5 py-2.5 text-sm">
            <span className="mr-2 font-medium text-teal-600">{selected.length} dipilih</span>
            <Button size="sm" variant="secondary" onClick={() => bulkStatus.mutate({ ids: selected, status: 'published' })}>Terbitkan</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkStatus.mutate({ ids: selected, status: 'draft' })}>Jadikan draf</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkStatus.mutate({ ids: selected, status: 'archived' })}>Arsipkan</Button>
            <Button size="sm" variant="secondary" className="!text-danger" onClick={() => setConfirm({ ids: selected })}>Hapus</Button>
          </div>
        )}

        {isLoading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-8" />}
            title={search || status ? 'Tidak ada yang cocok' : `Belum ada ${type.singular}`}
            description={search || status ? 'Ubah kata kunci atau filter status.' : undefined}
            action={!search && !status ? <Link to={`/${type.key}/new`}><Button icon={<Plus className="size-4" />}>Tambah {type.singular}</Button></Link> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="w-10 py-2.5 pl-5">
                    <Checkbox label="Pilih semua" checked={allChecked} indeterminate={!allChecked && selected.length > 0} onChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])} />
                  </th>
                  <th className="py-2.5 pr-3 font-medium">Judul</th>
                  <th className="hidden py-2.5 pr-3 font-medium md:table-cell">Bahasa</th>
                  <th className="py-2.5 pr-3 font-medium">Status</th>
                  <th className="hidden py-2.5 pr-3 font-medium sm:table-cell">{type.dateField ? 'Tanggal' : 'Urutan'}</th>
                  <th className="py-2.5 pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const tr = r.translations.find((t) => t.locale === 'id') ?? r.translations[0];
                  return (
                    <tr key={r.id} className="group hover:bg-paper/70">
                      <td className="py-3 pl-5">
                        <Checkbox label={`Pilih ${tr?.title}`} checked={selected.includes(r.id)} onChange={(v) => setSelected((s) => (v ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
                      </td>
                      <td className="py-3 pr-3">
                        <Link to={`/${type.key}/${r.id}`} className="flex items-center gap-3">
                          <span className="size-11 shrink-0 overflow-hidden rounded-md bg-paper">
                            {r.coverImage && <img onError={hideBroken} src={assetUrl(r.coverImage)} alt="" className="h-full w-full object-cover" loading="lazy" />}
                          </span>
                          <span className="min-w-0">
                            <span className="line-clamp-1 font-medium group-hover:text-teal">{tr?.title}</span>
                            <span className="block truncate text-xs text-muted">/{r.slug}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="hidden py-3 pr-3 md:table-cell">
                        <div className="flex gap-1">
                          {(['id', 'en'] as const).map((l) => (
                            <Badge key={l} tone={r.translations.some((t) => t.locale === l) ? 'teal' : 'neutral'} className={r.translations.some((t) => t.locale === l) ? '' : 'line-through opacity-60'}>
                              {l.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-3"><StatusBadge status={r.status} /></td>
                      <td className="hidden py-3 pr-3 text-ink-3 tabular-nums sm:table-cell">{type.dateField ? formatDate(r[type.dateField]) : r.sortOrder}</td>
                      <td className="py-3 pr-5">
                        <div className="flex justify-end gap-0.5">
                          <IconButton label="Ubah" onClick={() => nav(`/${type.key}/${r.id}`)}><Pencil className="size-4" /></IconButton>
                          <IconButton label="Duplikat" onClick={() => duplicate.mutate(r.id)}><Copy className="size-4" /></IconButton>
                          <IconButton label="Hapus" className="hover:text-danger" onClick={() => setConfirm({ ids: [r.id] })}><Trash2 className="size-4" /></IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={`Hapus ${type.singular}?`}
        message={`${confirm?.ids.length ?? 0} ${type.singular} akan dihapus permanen beserta semua terjemahannya. Tindakan ini tidak bisa dibatalkan.`}
        loading={remove.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm.ids)}
      />
    </>
  );
}
