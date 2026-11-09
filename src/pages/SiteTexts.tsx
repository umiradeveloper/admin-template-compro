import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { LOCALES } from '../lib/types';
import { cn } from '../lib/utils';
import { Button, ConfirmDialog, EmptyState, Field, IconButton, Input, Modal, PageLoader, Textarea } from '../components/ui';
import { PageHeader } from '../components/PageHeader';

interface Row { key: string; values: Record<string, string> }
interface Res { groups: string[]; rows: Row[]; collectionDrivenKeys: string[] }

/** Label ramah untuk namespace message next-intl */
const GROUP_LABEL: Record<string, string> = {
  HeroSection: 'Beranda — hero',
  StatsFacts: 'Beranda — statistik',
  PortfolioSection: 'Beranda — proyek',
  ServicesSection: 'Beranda — layanan',
  FaqSection: 'Beranda — FAQ',
  BlogSection: 'Blog',
  ContactSection: 'Kontak',
  AboutHero: 'Tentang kami — hero',
  AboutDetail: 'Tentang kami — visi, misi, nilai',
  AboutStats: 'Tentang kami — statistik',
  CareerSection: 'Karir',
};

const ORDER = Object.keys(GROUP_LABEL);
const order = (g: string) => (ORDER.indexOf(g) === -1 ? 999 : ORDER.indexOf(g));

const prettyKey = (k: string) => k.split('.').slice(1).map((p) => (/^\d+$/.test(p) ? `#${Number(p) + 1}` : p)).join(' › ');

export default function SiteTexts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string>('');
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [adding, setAdding] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['site-texts'], queryFn: async () => (await api.get<Res>('/admin/site-texts')).data });
  useEffect(() => {
    if (data && !group) setGroup([...data.groups].sort((a, b) => order(a) - order(b))[0] ?? '');
  }, [data, group]);

  const changed = Object.keys(edits).length;
  const save = useMutation({
    mutationFn: async (rows: Row[]) => api.put('/admin/site-texts', { rows }),
    onSuccess: () => {
      toast.success('Teks disimpan');
      setEdits({});
      setAdding(null);
      qc.invalidateQueries({ queryKey: ['site-texts'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (key: string) => api.post('/admin/site-texts/delete', { keys: [key] }),
    onSuccess: () => {
      toast.success('Teks dihapus');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['site-texts'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    return data.rows.filter((r) =>
      q ? r.key.toLowerCase().includes(q) || Object.values(r.values).some((v) => v.toLowerCase().includes(q)) : r.key.split('.')[0] === group,
    );
  }, [data, group, search]);

  if (isLoading || !data) return <PageLoader />;

  const val = (r: Row, l: string) => edits[r.key]?.[l] ?? r.values[l] ?? '';
  const setVal = (r: Row, l: string, v: string) =>
    setEdits((e) => {
      const next = { ...e, [r.key]: { ...(e[r.key] ?? {}), [l]: v } };
      if (LOCALES.every((x) => (next[r.key][x.code] ?? r.values[x.code] ?? '') === (r.values[x.code] ?? ''))) delete next[r.key];
      return next;
    });

  return (
    <>
      <PageHeader
        title="Teks website"
        description="Judul section, label tombol, visi-misi, dan teks statis lain dalam dua bahasa."
        actions={
          <>
            <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding({ key: group ? `${group}.` : '', values: { id: '', en: '' } })}>Tambah teks</Button>
            <Button disabled={!changed} loading={save.isPending} onClick={() => save.mutate(Object.entries(edits).map(([key, values]) => ({ key, values })))}>
              Simpan {changed ? `(${changed})` : ''}
            </Button>
          </>
        }
      />
      <p className="mb-5 rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink-3">
        Daftar layanan, FAQ, dan angka statistik diatur di <Link to="/collections" className="font-medium text-teal hover:underline">Konten halaman</Link> agar bisa ditambah dan diurutkan.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input placeholder="Cari teks…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Kelompok teks">
            {[...data.groups].sort((a, b) => order(a) - order(b)).map((g) => (
              <button
                key={g}
                onClick={() => { setGroup(g); setSearch(''); }}
                className={cn('rounded-md px-3 py-2 text-left text-sm whitespace-nowrap', !search && group === g ? 'bg-white font-medium shadow-sm ring-1 ring-line' : 'text-ink-3 hover:bg-ink/5')}
              >
                {GROUP_LABEL[g] ?? g}
              </button>
            ))}
          </nav>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="hidden grid-cols-[180px_1fr_1fr_32px] gap-4 border-b border-line px-5 py-2.5 text-xs text-muted md:grid">
            <span>Bagian</span>
            {LOCALES.map((l) => <span key={l.code}>{l.label}</span>)}
            <span />
          </div>
          {rows.length === 0 ? (
            <EmptyState title="Tidak ada teks yang cocok" />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const isLong = LOCALES.some((l) => val(r, l.code).length > 70);
                return (
                  <li key={r.key} className={cn('grid gap-3 px-5 py-4 md:grid-cols-[180px_1fr_1fr_32px] md:gap-4', edits[r.key] && 'bg-teal-50/50')}>
                    <div className="min-w-0 pt-2">
                      <p className="text-sm font-medium break-words">{prettyKey(r.key) || r.key}</p>
                      {search && <p className="text-xs text-muted">{GROUP_LABEL[r.key.split('.')[0]] ?? r.key.split('.')[0]}</p>}
                    </div>
                    {LOCALES.map((l) =>
                      isLong ? (
                        <Textarea key={l.code} aria-label={`${r.key} ${l.label}`} rows={Math.min(9, Math.max(2, Math.ceil(Math.max(...LOCALES.map((x) => val(r, x.code).length)) / 42)))} value={val(r, l.code)} onChange={(e) => setVal(r, l.code, e.target.value)} />
                      ) : (
                        <Input key={l.code} aria-label={`${r.key} ${l.label}`} value={val(r, l.code)} onChange={(e) => setVal(r, l.code, e.target.value)} />
                      ),
                    )}
                    <IconButton label="Hapus teks" className="mt-1 hover:text-danger" onClick={() => setDeleting(r.key)}><Trash2 className="size-4" /></IconButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <Modal
        open={!!adding}
        onClose={() => setAdding(null)}
        title="Tambah teks"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(null)}>Batal</Button>
            <Button loading={save.isPending} onClick={() => adding && save.mutate([adding])}>Tambah</Button>
          </>
        }
      >
        {adding && (
          <div className="flex flex-col gap-4">
            <Field label="Key" required help="Format: NamaSection.namaTeks — harus sama dengan yang dipanggil di kode website, mis. ContactSection.title" htmlFor="nk">
              <Input id="nk" value={adding.key} onChange={(e) => setAdding({ ...adding, key: e.target.value.replace(/\s/g, '') })} />
            </Field>
            {LOCALES.map((l) => (
              <Field key={l.code} label={l.label}>
                <Textarea rows={2} value={adding.values[l.code] ?? ''} onChange={(e) => setAdding({ ...adding, values: { ...adding.values, [l.code]: e.target.value } })} />
              </Field>
            ))}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        title="Hapus teks?"
        message={<>Teks <code>{deleting}</code> dihapus dari kedua bahasa. Bila website masih memakainya, yang tampil adalah nama key-nya.</>}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  );
}
