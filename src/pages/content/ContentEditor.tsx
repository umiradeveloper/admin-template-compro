import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CopyPlus, ExternalLink, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage, SITE_URL } from '../../lib/api';
import type { ContentItem, ContentStatus, Locale } from '../../lib/types';
import { LOCALES } from '../../lib/types';
import { cn, formatDate, toSlug } from '../../lib/utils';
import { Button, ConfirmDialog, Field, Input, PageLoader, Panel, Select, Textarea } from '../../components/ui';
import { FieldInput } from '../../components/SchemaForm';
import { PageHeader } from '../../components/PageHeader';
import type { ContentTypeConfig } from './contentTypes';

type TrMap = Record<Locale, Record<string, any>>;
interface FormState {
  slug: string;
  status: ContentStatus;
  scalars: Record<string, any>;
  tr: TrMap;
}

const emptyTr = (): TrMap => ({ id: { title: '' }, en: { title: '' } });

function fromItem(item: ContentItem, type: ContentTypeConfig): FormState {
  const tr = emptyTr();
  for (const t of item.translations) tr[t.locale] = { ...t };
  const scalars: Record<string, any> = {};
  for (const f of type.scalarFields) scalars[f.name] = item[f.name] ?? (f.type === 'boolean' ? false : null);
  return { slug: item.slug, status: item.status, scalars, tr };
}

function blank(type: ContentTypeConfig): FormState {
  const scalars: Record<string, any> = {};
  for (const f of type.scalarFields) scalars[f.name] = f.type === 'boolean' ? false : f.type === 'gallery' ? [] : null;
  return { slug: '', status: 'draft', scalars, tr: emptyTr() };
}

export default function ContentEditor({ type }: { type: ContentTypeConfig }) {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() => blank(type));
  const [initial, setInitial] = useState('');
  const [locale, setLocale] = useState<Locale>('id');
  const [slugTouched, setSlugTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ['content', type.key, 'item', id],
    queryFn: async () => (await api.get<ContentItem>(`/admin/${type.key}/${id}`)).data,
    enabled: !isNew,
  });

  useEffect(() => {
    const f = item ? fromItem(item, type) : blank(type);
    setForm(f);
    setInitial(JSON.stringify(f));
    setSlugTouched(!!item);
  }, [item, type, isNew]);

  const dirty = useMemo(() => initial !== '' && JSON.stringify(form) !== initial, [form, initial]);

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async (override?: Partial<FormState>) => {
      const f = { ...form, ...override };
      const translations = LOCALES.map((l) => l.code)
        .filter((l) => f.tr[l]?.title?.trim())
        .map((l) => {
          const t = f.tr[l];
          const out: Record<string, any> = { locale: l, title: t.title.trim() };
          for (const fd of type.translationFields) out[fd.name] = t[fd.name] ?? (fd.type === 'tags' ? [] : '');
          return out;
        });
      if (!translations.length) throw new Error('Isi judul minimal dalam satu bahasa.');
      const body: Record<string, any> = { slug: f.slug || undefined, status: f.status, translations };
      for (const fd of type.scalarFields) {
        let v = f.scalars[fd.name];
        if (fd.type === 'number') v = v === '' || v === null ? 0 : Number(v);
        if (v === null && fd.type !== 'boolean') v = '';
        body[fd.name] = v;
      }
      // field tanggal kosong tidak dikirim (validator butuh format tanggal)
      for (const fd of type.scalarFields) if ((fd.type === 'date' || fd.type === 'datetime') && !body[fd.name]) delete body[fd.name];
      return isNew
        ? (await api.post<ContentItem>(`/admin/${type.key}`, body)).data
        : (await api.patch<ContentItem>(`/admin/${type.key}/${id}`, body)).data;
    },
    onSuccess: (saved, override) => {
      qc.invalidateQueries({ queryKey: ['content', type.key] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      const f = fromItem(saved, type);
      setForm(f);
      setInitial(JSON.stringify(f));
      toast.success(override?.status === 'published' ? 'Diterbitkan' : 'Perubahan disimpan');
      if (isNew) nav(`/${type.key}/${saved.id}`, { replace: true });
    },
    onError: (e) => toast.error(e instanceof Error && !('response' in e) ? e.message : errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/${type.key}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', type.key] });
      setInitial(JSON.stringify(form));
      toast.success(`${type.singular[0].toUpperCase()}${type.singular.slice(1)} dihapus`);
      nav(`/${type.key}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // Ctrl/Cmd + S untuk simpan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!save.isPending) save.mutate(undefined);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isNew && isLoading) return <PageLoader />;

  const tr = form.tr[locale] ?? {};
  const setTr = (name: string, v: any) =>
    setForm((f) => {
      const next = { ...f, tr: { ...f.tr, [locale]: { ...f.tr[locale], [name]: v } } };
      if (name === 'title' && !slugTouched && (locale === 'en' || !f.tr.en?.title)) next.slug = toSlug(v);
      return next;
    });
  const setScalar = (name: string, v: any) => setForm((f) => ({ ...f, scalars: { ...f.scalars, [name]: v } }));
  const other: Locale = locale === 'id' ? 'en' : 'id';
  const copyFromOther = () => setForm((f) => ({ ...f, tr: { ...f.tr, [locale]: { ...f.tr[other] } } }));
  const title = form.tr.id?.title || form.tr.en?.title;
  const previewUrl = SITE_URL && !isNew && form.status === 'published' ? `${SITE_URL}/${locale}/${type.sitePath}/${form.slug}` : '';

  return (
    <>
      <PageHeader
        back={`/${type.key}`}
        title={isNew ? `Tambah ${type.singular}` : title || 'Tanpa judul'}
        description={
          !isNew && item ? (
            <>
              Terakhir diubah {formatDate(item.updatedAt, true)}
              {dirty && <span className="ml-2 font-medium text-copper">· ada perubahan belum disimpan</span>}
            </>
          ) : undefined
        }
        actions={
          <>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" icon={<ExternalLink className="size-4" />}>Lihat di website</Button>
              </a>
            )}
            <Button variant="secondary" icon={<Save className="size-4" />} loading={save.isPending && save.variables === undefined} onClick={() => save.mutate(undefined)}>
              Simpan
            </Button>
            {form.status !== 'published' && (
              <Button loading={save.isPending && !!save.variables} onClick={() => save.mutate({ status: 'published' })}>Terbitkan</Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel
            title={
              <div role="tablist" className="flex gap-1">
                {LOCALES.map((l) => {
                  const filled = !!form.tr[l.code]?.title?.trim();
                  return (
                    <button
                      key={l.code}
                      role="tab"
                      type="button"
                      aria-selected={locale === l.code}
                      onClick={() => setLocale(l.code)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium',
                        locale === l.code ? 'bg-ink text-white' : 'text-muted hover:bg-ink/5 hover:text-ink',
                      )}
                    >
                      {l.label}
                      <span className={cn('size-1.5 rounded-full', filled ? 'bg-teal-200' : 'bg-copper')} title={filled ? 'Sudah diisi' : 'Belum diisi'} />
                    </button>
                  );
                })}
              </div>
            }
            actions={
              form.tr[other]?.title && !tr.title ? (
                <Button size="sm" variant="ghost" icon={<CopyPlus className="size-3.5" />} onClick={copyFromOther}>
                  Salin dari {other === 'id' ? 'Indonesia' : 'English'}
                </Button>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-5">
              <Field label="Judul" required htmlFor="title">
                <Input id="title" value={tr.title ?? ''} onChange={(e) => setTr('title', e.target.value)} className="h-12 text-lg font-semibold" placeholder={`Judul ${type.singular}`} />
              </Field>
              {type.translationFields.map((f) =>
                f.name.startsWith('meta') ? null : (
                  <Field key={f.name} label={f.label} help={f.help} htmlFor={`tr-${f.name}`}>
                    <FieldInput id={`tr-${f.name}`} field={f} value={tr[f.name]} onChange={(v) => setTr(f.name, v)} />
                  </Field>
                ),
              )}
            </div>
          </Panel>

          <Panel title={`SEO (${locale === 'id' ? 'Indonesia' : 'English'})`}>
            <div className="flex flex-col gap-4">
              <Field label="Meta title" help="Kosongkan untuk memakai judul." htmlFor="mt">
                <Input id="mt" value={tr.metaTitle ?? ''} onChange={(e) => setTr('metaTitle', e.target.value)} maxLength={255} />
              </Field>
              <Field label="Meta description" help={`${(tr.metaDescription ?? '').length}/160 karakter disarankan`} htmlFor="md">
                <Textarea id="md" rows={2} value={tr.metaDescription ?? ''} onChange={(e) => setTr('metaDescription', e.target.value)} maxLength={500} />
              </Field>
              <div className="rounded-lg border border-line bg-paper p-4">
                <p className="truncate text-xs text-muted">{SITE_URL || 'https://umiraglobal.com'}/{locale}/{type.sitePath}/{form.slug || 'slug'}</p>
                <p className="mt-0.5 line-clamp-1 text-[17px] text-[#1a0dab]">{tr.metaTitle || tr.title || 'Judul halaman'}</p>
                <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-3">{tr.metaDescription || tr.excerpt || tr.description || 'Deskripsi akan diambil dari ringkasan.'}</p>
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Publikasi">
            <div className="flex flex-col gap-4">
              <Field label="Status" htmlFor="status">
                <Select id="status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}>
                  <option value="draft">Draf — tidak tampil di website</option>
                  <option value="published">Terbit — tampil di website</option>
                  <option value="archived">Diarsipkan</option>
                </Select>
              </Field>
              <Field label="Slug URL" help="Bagian akhir alamat halaman. Huruf kecil dan tanda hubung." htmlFor="slug">
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((f) => ({ ...f, slug: toSlug(e.target.value) }));
                  }}
                  placeholder="otomatis-dari-judul"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Detail">
            <div className="flex flex-col gap-5">
              {type.scalarFields.map((f) => (
                <Field key={f.name} label={f.label} help={f.help} htmlFor={`s-${f.name}`}>
                  <FieldInput id={`s-${f.name}`} field={f} value={form.scalars[f.name]} onChange={(v) => setScalar(f.name, v)} />
                </Field>
              ))}
            </div>
          </Panel>

          {!isNew && (
            <Button variant="ghost" className="self-start !text-danger hover:bg-danger-50" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
              Hapus {type.singular}
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Hapus ${type.singular}?`}
        message={<>“{title}” akan dihapus permanen dari website beserta semua terjemahannya.</>}
        loading={remove.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
