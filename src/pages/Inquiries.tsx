import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Inbox, Mail, MessageCircle, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Inquiry, Paginated } from '../lib/types';
import { cn, formatDate, INQUIRY_LABEL, timeAgo } from '../lib/utils';
import { Button, Checkbox, ConfirmDialog, EmptyState, Field, Input, Modal, PageLoader, Pagination, Select, StatusBadge, Tabs, Textarea } from '../components/ui';
import { PageHeader } from '../components/PageHeader';

type Status = '' | Inquiry['status'];

export default function Inquiries() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [openId, setOpenId] = useState<number | null>(params.get('open') ? Number(params.get('open')) : null);
  const [confirm, setConfirm] = useState<number[] | null>(null);

  const { data: counts } = useQuery({ queryKey: ['inquiries', 'counts'], queryFn: async () => (await api.get<Record<string, number>>('/admin/inquiries/counts')).data });
  const { data, isLoading } = useQuery({
    queryKey: ['inquiries', { page, status, search }],
    queryFn: async () => (await api.get<Paginated<Inquiry>>('/admin/inquiries', { params: { page, limit: 15, status: status || undefined, search: search || undefined } })).data,
    placeholderData: keepPreviousData,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['inquiries'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const bulkStatus = useMutation({
    mutationFn: async (s: Inquiry['status']) => api.post('/admin/inquiries/bulk-status', { ids: selected, status: s }),
    onSuccess: () => { toast.success('Status diperbarui'); setSelected([]); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (ids: number[]) => (ids.length === 1 ? api.delete(`/admin/inquiries/${ids[0]}`) : api.post('/admin/inquiries/bulk-delete', { ids })),
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} pesan dihapus`);
      setConfirm(null);
      setSelected([]);
      if (openId && ids.includes(openId)) setOpenId(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const exportCsv = async () => {
    try {
      const res = await api.get('/admin/inquiries/export', { params: { status: status || undefined, search: search || undefined }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pesan-masuk-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const rows = data?.data ?? [];
  const all = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <>
      <PageHeader
        title="Pesan masuk"
        description="Pesan dari formulir kontak website. Pesan baru otomatis ditandai dibaca saat dibuka."
        actions={<Button variant="secondary" icon={<Download className="size-4" />} onClick={exportCsv}>Ekspor CSV</Button>}
      />
      <div className="rounded-xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <Tabs
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            items={(['', 'new', 'read', 'replied', 'archived'] as Status[]).map((s) => ({
              value: s,
              label: (
                <>
                  {s ? INQUIRY_LABEL[s] : 'Semua'}
                  {counts && <span className="ml-1.5 text-muted tabular-nums">{counts[s || 'total'] ?? 0}</span>}
                </>
              ),
            }))}
          />
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Cari nama, email, isi…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-teal-50 px-5 py-2.5 text-sm">
            <span className="mr-2 font-medium text-teal-600">{selected.length} dipilih</span>
            <Button size="sm" variant="secondary" onClick={() => bulkStatus.mutate('read')}>Tandai dibaca</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkStatus.mutate('replied')}>Tandai dibalas</Button>
            <Button size="sm" variant="secondary" onClick={() => bulkStatus.mutate('archived')}>Arsipkan</Button>
            <Button size="sm" variant="secondary" className="!text-danger" onClick={() => setConfirm(selected)}>Hapus</Button>
          </div>
        )}
        {isLoading ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Inbox className="size-8" />} title={search || status ? 'Tidak ada pesan yang cocok' : 'Belum ada pesan'} description={search || status ? undefined : 'Pesan dari halaman kontak website akan muncul di sini.'} />
        ) : (
          <ul className="divide-y divide-line">
            <li className="flex items-center gap-4 px-5 py-2 text-xs text-muted">
              <Checkbox label="Pilih semua" checked={all} indeterminate={!all && selected.length > 0} onChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])} />
              <span>Pengirim & pesan</span>
            </li>
            {rows.map((r) => (
              <li key={r.id} className={cn('flex items-start gap-4 px-5 py-3.5 hover:bg-paper/70', r.status === 'new' && 'bg-copper-50/40')}>
                <div className="pt-0.5">
                  <Checkbox label={`Pilih pesan ${r.name}`} checked={selected.includes(r.id)} onChange={(v) => setSelected((s) => (v ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
                </div>
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(r.id)}>
                  <p className={cn('text-sm', r.status === 'new' ? 'font-semibold' : 'font-medium')}>
                    {r.name} <span className="font-normal text-muted">· {r.email}</span>
                  </p>
                  {r.subject && <p className="text-sm text-ink-2">{r.subject}</p>}
                  <p className="line-clamp-1 text-sm text-muted">{r.message}</p>
                </button>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-muted" title={formatDate(r.createdAt, true)}>{timeAgo(r.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </div>

      <InquiryDetail
        id={openId}
        onClose={() => {
          setOpenId(null);
          if (params.get('open')) setParams({});
          refresh();
        }}
        onDelete={(id) => setConfirm([id])}
      />
      <ConfirmDialog
        open={!!confirm}
        title="Hapus pesan?"
        message={`${confirm?.length ?? 0} pesan akan dihapus permanen.`}
        loading={remove.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm)}
      />
    </>
  );
}

function InquiryDetail({ id, onClose, onDelete }: { id: number | null; onClose: () => void; onDelete: (id: number) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inquiries', 'item', id],
    queryFn: async () => (await api.get<Inquiry>(`/admin/inquiries/${id}`)).data,
    enabled: !!id,
  });
  const [status, setStatus] = useState<Inquiry['status']>('read');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (data) {
      setStatus(data.status);
      setNotes(data.notes ?? '');
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => api.patch(`/admin/inquiries/${id}`, { status, notes }),
    onSuccess: () => {
      toast.success('Pesan diperbarui');
      qc.invalidateQueries({ queryKey: ['inquiries'] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const wa = data?.phone ? data.phone.replace(/\D/g, '').replace(/^0/, '62') : '';
  return (
    <Modal
      open={!!id}
      onClose={onClose}
      title={data ? `Pesan dari ${data.name}` : 'Pesan'}
      size="lg"
      footer={
        data && (
          <>
            <Button variant="ghost" className="mr-auto !text-danger hover:bg-danger-50" icon={<Trash2 className="size-4" />} onClick={() => onDelete(data.id)}>Hapus</Button>
            <Button variant="secondary" onClick={onClose}>Tutup</Button>
            <Button loading={save.isPending} onClick={() => save.mutate()}>Simpan</Button>
          </>
        )
      }
    >
      {isLoading || !data ? (
        <PageLoader />
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-sm">
            <dt className="text-muted">Email</dt><dd><a className="text-teal hover:underline" href={`mailto:${data.email}`}>{data.email}</a></dd>
            {data.phone && (<><dt className="text-muted">Telepon</dt><dd>{data.phone}</dd></>)}
            {data.company && (<><dt className="text-muted">Perusahaan</dt><dd>{data.company}</dd></>)}
            <dt className="text-muted">Diterima</dt><dd>{formatDate(data.createdAt, true)}</dd>
          </dl>
          <div className="rounded-lg bg-paper p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {data.subject && <p className="mb-2 font-semibold">{data.subject}</p>}
            {data.message}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${data.email}?subject=${encodeURIComponent(`Re: ${data.subject ?? 'Pesan Anda di website Umira'}`)}`} onClick={() => setStatus('replied')}>
              <Button variant="secondary" icon={<Mail className="size-4" />}>Balas via email</Button>
            </a>
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" onClick={() => setStatus('replied')}>
                <Button variant="secondary" icon={<MessageCircle className="size-4" />}>WhatsApp</Button>
              </a>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <Field label="Status" htmlFor="ist">
              <Select id="ist" value={status} onChange={(e) => setStatus(e.target.value as Inquiry['status'])}>
                {Object.entries(INQUIRY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Catatan internal" help="Tidak terlihat oleh pengirim." htmlFor="inote">
              <Textarea id="inote" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>
      )}
    </Modal>
  );
}
