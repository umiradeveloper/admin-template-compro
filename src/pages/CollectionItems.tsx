import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, LayoutList, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, assetUrl, errorMessage } from '../lib/api';
import { hideBroken } from '../lib/utils';
import type { CollectionItem, SchemaValues } from '../lib/types';
import { Button, ConfirmDialog, EmptyState, IconButton, Modal, PageLoader, Switch } from '../components/ui';
import { SchemaForm } from '../components/SchemaForm';
import { PageHeader } from '../components/PageHeader';
import { useSchemas } from './Collections';

export default function CollectionItems() {
  const { key = '' } = useParams();
  const qc = useQueryClient();
  const { data: schemas } = useSchemas();
  const schema = schemas?.collections.find((c) => c.key === key);
  const [editing, setEditing] = useState<{ id?: number; values: SchemaValues; isActive: boolean } | null>(null);
  const [deleting, setDeleting] = useState<CollectionItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['collection', key],
    queryFn: async () => (await api.get<CollectionItem[]>(`/admin/collections/${key}`)).data,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['collection', key] });
    qc.invalidateQueries({ queryKey: ['schemas'] });
  };

  const save = useMutation({
    mutationFn: async (e: NonNullable<typeof editing>) => {
      const body = { ...e.values, isActive: e.isActive };
      return e.id ? api.patch(`/admin/collections/${key}/${e.id}`, body) : api.post(`/admin/collections/${key}`, body);
    },
    onSuccess: (_, e) => {
      toast.success(e.id ? 'Item disimpan' : 'Item ditambahkan');
      setEditing(null);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const toggle = useMutation({
    mutationFn: async (i: CollectionItem) => api.patch(`/admin/collections/${key}/${i.id}`, { isActive: !i.isActive }),
    onSuccess: refresh,
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/collections/${key}/${id}`),
    onSuccess: () => {
      toast.success('Item dihapus');
      setDeleting(null);
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const reorder = useMutation({
    mutationFn: async (ids: number[]) => api.post(`/admin/collections/${key}/reorder`, { ids }),
    onSuccess: refresh,
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isLoading || !schemas) return <PageLoader />;
  if (!schema) return <EmptyState title="Koleksi tidak ditemukan" />;

  const list = items ?? [];
  const move = (i: number, d: number) => {
    const ids = list.map((x) => x.id);
    const j = i + d;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    qc.setQueryData(['collection', key], ids.map((id) => list.find((x) => x.id === id)));
    reorder.mutate(ids);
  };
  const imageField = schema.fields.find((f) => f.type === 'image');
  const subtitleField = schema.fields.find((f) => f.name !== schema.titleField && (f.type === 'text' || f.type === 'textarea'));

  return (
    <>
      <PageHeader
        back="/collections"
        title={schema.label}
        description={schema.usedOn ? `Tampil di: ${schema.usedOn}. Urutan di sini sama dengan urutan di website.` : schema.description}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setEditing({ values: { data: {}, translations: { en: {}, id: {} } }, isActive: true })}>
            Tambah item
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {list.length === 0 ? (
          <EmptyState icon={<LayoutList className="size-8" />} title="Belum ada item" description="Section ini akan kosong di website sampai item ditambahkan." />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((item, i) => {
              const img = imageField ? item.data?.[imageField.name] : null;
              const sub = subtitleField
                ? subtitleField.translatable
                  ? item.translations?.id?.[subtitleField.name] ?? item.translations?.en?.[subtitleField.name]
                  : item.data?.[subtitleField.name]
                : null;
              const idTitle = schema.fields.find((f) => f.name === schema.titleField)?.translatable ? item.translations?.id?.[schema.titleField!] : null;
              return (
                <li key={item.id} className={item.isActive ? 'flex items-center gap-4 px-5 py-3' : 'flex items-center gap-4 bg-paper/60 px-5 py-3 opacity-70'}>
                  <div className="flex flex-col">
                    <IconButton label="Naikkan" className="size-6" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></IconButton>
                    <IconButton label="Turunkan" className="size-6" disabled={i === list.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></IconButton>
                  </div>
                  {imageField && (
                    <span className="size-12 shrink-0 overflow-hidden rounded-md border border-line bg-paper">
                      {img && <img onError={hideBroken} src={assetUrl(img)} alt="" className="h-full w-full object-contain" />}
                    </span>
                  )}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing({ id: item.id, values: { data: item.data, translations: item.translations }, isActive: item.isActive })}>
                    <p className="line-clamp-1 font-medium hover:text-teal">{idTitle || item.title || <span className="text-muted">(tanpa judul)</span>}</p>
                    {sub && <p className="line-clamp-1 text-sm text-muted">{String(sub)}</p>}
                  </button>
                  <Switch checked={item.isActive} onChange={() => toggle.mutate(item)} label={<span className="hidden text-xs text-muted sm:inline">{item.isActive ? 'Tampil' : 'Disembunyikan'}</span>} />
                  <IconButton label="Ubah" onClick={() => setEditing({ id: item.id, values: { data: item.data, translations: item.translations }, isActive: item.isActive })}><Pencil className="size-4" /></IconButton>
                  <IconButton label="Hapus" className="hover:text-danger" onClick={() => setDeleting(item)}><Trash2 className="size-4" /></IconButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Ubah item — ${schema.label}` : `Tambah item — ${schema.label}`}
        size="lg"
        footer={
          <>
            <div className="mr-auto">
              {editing && <Switch checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} label="Tampilkan di website" />}
            </div>
            <Button variant="secondary" onClick={() => setEditing(null)}>Batal</Button>
            <Button loading={save.isPending} onClick={() => editing && save.mutate(editing)}>Simpan</Button>
          </>
        }
      >
        {editing && <SchemaForm fields={schema.fields} values={editing.values} onChange={(values) => setEditing({ ...editing, values })} />}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus item?"
        message={<>“{deleting?.title}” akan dihapus dari {schema.label.toLowerCase()}.</>}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
