import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Media } from '../lib/types';
import { formatBytes, formatDate } from '../lib/utils';
import { Button, ConfirmDialog, Field, Input, Modal } from '../components/ui';
import { MediaBrowser, MediaThumb } from '../components/MediaLibrary';
import { PageHeader } from '../components/PageHeader';

export default function MediaPage() {
  const qc = useQueryClient();
  const [item, setItem] = useState<Media | null>(null);
  const [alt, setAlt] = useState('');
  const [folder, setFolder] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    setAlt(item?.alt ?? '');
    setFolder(item?.folder ?? '');
  }, [item]);

  const update = useMutation({
    mutationFn: async () => (await api.patch<Media>(`/admin/media/${item!.id}`, { alt, folder: folder || 'general' })).data,
    onSuccess: (m) => {
      toast.success('Info file disimpan');
      setItem(m);
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async () => api.delete(`/admin/media/${item!.id}`),
    onSuccess: () => {
      toast.success('File dihapus');
      setConfirm(false);
      setItem(null);
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success('Disalin'));

  return (
    <>
      <PageHeader title="Media" description="Semua gambar, video, dan dokumen yang diupload. Seret file ke halaman ini untuk upload cepat." />
      <div className="rounded-xl border border-line bg-white p-5">
        <MediaBrowser onItemClick={setItem} />
      </div>

      <Modal
        open={!!item}
        onClose={() => setItem(null)}
        title={item?.originalName ?? ''}
        size="lg"
        footer={
          <>
            <Button variant="ghost" className="mr-auto !text-danger hover:bg-danger-50" icon={<Trash2 className="size-4" />} onClick={() => setConfirm(true)}>Hapus file</Button>
            <Button variant="secondary" onClick={() => setItem(null)}>Tutup</Button>
            <Button loading={update.isPending} onClick={() => update.mutate()}>Simpan</Button>
          </>
        }
      >
        {item && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-line bg-paper">
              {item.mimeType.startsWith('video/') ? (
                <video src={item.url} controls className="w-full" />
              ) : item.mimeType.startsWith('image/') ? (
                <img src={item.url} alt={item.alt ?? ''} className="max-h-96 w-full object-contain" />
              ) : (
                <div className="aspect-square"><MediaThumb m={item} /></div>
              )}
            </div>
            <div className="flex flex-col gap-4 text-sm">
              <dl className="grid grid-cols-[90px_1fr] gap-y-1.5">
                <dt className="text-muted">Tipe</dt><dd>{item.mimeType}</dd>
                <dt className="text-muted">Ukuran</dt><dd>{formatBytes(item.size)}</dd>
                <dt className="text-muted">Diupload</dt><dd>{formatDate(item.createdAt, true)}</dd>
              </dl>
              <Field label="Path (untuk konten)">
                <div className="flex gap-2">
                  <Input readOnly value={item.path} className="font-mono text-xs" />
                  <Button variant="secondary" onClick={() => copy(item.path)} aria-label="Salin path"><Copy className="size-4" /></Button>
                </div>
              </Field>
              <Field label="URL lengkap">
                <div className="flex gap-2">
                  <Input readOnly value={item.url} className="font-mono text-xs" />
                  <Button variant="secondary" onClick={() => copy(item.url)} aria-label="Salin URL"><Copy className="size-4" /></Button>
                </div>
              </Field>
              <Field label="Teks alternatif" help="Deskripsi gambar untuk pembaca layar dan SEO." htmlFor="alt">
                <Input id="alt" value={alt} onChange={(e) => setAlt(e.target.value)} />
              </Field>
              <Field label="Folder" htmlFor="folder">
                <Input id="folder" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="general" />
              </Field>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirm}
        title="Hapus file?"
        message="File dihapus dari server. Konten yang masih memakai file ini akan menampilkan gambar rusak."
        loading={remove.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
