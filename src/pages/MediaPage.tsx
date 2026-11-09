import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Media, MediaUsage } from '../lib/types';
import { formatBytes, formatDate } from '../lib/utils';
import { Button, ConfirmDialog, Field, Input, Modal, Spinner } from '../components/ui';
import { MediaBrowser, MediaThumb } from '../components/MediaLibrary';
import { PageHeader } from '../components/PageHeader';

const ACCEPT: Record<string, string> = { image: 'image/*', video: 'video/*', application: 'application/pdf' };

export default function MediaPage() {
  const qc = useQueryClient();
  const [item, setItem] = useState<Media | null>(null);
  const [alt, setAlt] = useState('');
  const [folder, setFolder] = useState('');
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAlt(item?.alt ?? '');
    setFolder(item?.folder ?? '');
  }, [item]);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['media', 'usage', item?.id],
    queryFn: async () => (await api.get<MediaUsage>(`/admin/media/${item!.id}/usage`)).data,
    enabled: !!item,
  });

  const update = useMutation({
    mutationFn: async () => (await api.patch<Media>(`/admin/media/${item!.id}`, { alt, folder: folder || 'general' })).data,
    onSuccess: (m) => {
      toast.success('Info file disimpan');
      setItem(m);
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const replace = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return (await api.post<Media>(`/admin/media/${item!.id}/replace`, fd)).data;
    },
    onSuccess: (m) => {
      toast.success('File diganti. Semua halaman yang memakainya ikut berubah.');
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
  const cleanUrl = item?.url.split('?')[0] ?? '';

  return (
    <>
      <PageHeader
        title="Media"
        description="Semua gambar, video, dan dokumen website. Klik file untuk mengganti isinya — halaman yang memakai file itu ikut berubah."
      />
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
            <div className="flex flex-col gap-3">
              <div className="relative overflow-hidden rounded-lg border border-line bg-paper">
                {item.mimeType.startsWith('video/') ? (
                  <video key={item.url} src={item.url} controls className="w-full" />
                ) : item.mimeType.startsWith('image/') ? (
                  <img key={item.url} src={item.url} alt={item.alt ?? ''} className="max-h-96 w-full object-contain" />
                ) : (
                  <div className="aspect-square"><MediaThumb m={item} /></div>
                )}
                {replace.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Spinner className="size-7" /></div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept={ACCEPT[item.mimeType.split('/')[0]] ?? '*/*'}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) replace.mutate(f);
                  e.target.value = '';
                }}
              />
              <Button variant="secondary" icon={<RefreshCw className="size-4" />} loading={replace.isPending} onClick={() => fileRef.current?.click()}>
                Ganti file
              </Button>
              <p className="text-xs leading-relaxed text-muted">
                Alamat file tetap sama, jadi tidak perlu mengubah konten satu per satu. Browser pengunjung mungkin menampilkan versi lama hingga beberapa menit.
              </p>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <dl className="grid grid-cols-[90px_1fr] gap-y-1.5">
                <dt className="text-muted">Tipe</dt><dd>{item.mimeType}</dd>
                <dt className="text-muted">Ukuran</dt><dd>{formatBytes(item.size)}</dd>
                <dt className="text-muted">Diupload</dt><dd>{formatDate(item.createdAt, true)}</dd>
                {item.updatedAt && item.updatedAt !== item.createdAt && (<><dt className="text-muted">Diubah</dt><dd>{formatDate(item.updatedAt, true)}</dd></>)}
                <dt className="text-muted">Disimpan di</dt><dd>{item.storage === 'minio' ? 'MinIO' : 'Server backend'}</dd>
              </dl>

              <div>
                <p className="mb-1.5 text-[13px] font-medium text-ink-2">Dipakai di</p>
                {usageLoading ? (
                  <Spinner className="size-4" />
                ) : !usage?.count ? (
                  <p className="text-muted">Belum dipakai di konten mana pun.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {usage.items.map((u, i) => (
                      <li key={i}>
                        <Link to={u.link} className="text-teal hover:underline" onClick={() => setItem(null)}>
                          {u.label}{u.title ? ` — ${u.title}` : ''}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Field label="Path (untuk konten)">
                <div className="flex gap-2">
                  <Input readOnly value={item.path} className="font-mono text-xs" />
                  <Button variant="secondary" onClick={() => copy(item.path)} aria-label="Salin path"><Copy className="size-4" /></Button>
                </div>
              </Field>
              <Field label="URL publik">
                <div className="flex gap-2">
                  <Input readOnly value={cleanUrl} className="font-mono text-xs" />
                  <Button variant="secondary" onClick={() => copy(cleanUrl)} aria-label="Salin URL"><Copy className="size-4" /></Button>
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
        message={
          usage?.count
            ? `File ini masih dipakai di ${usage.count} tempat. Bila dihapus, gambar di tempat-tempat itu akan rusak. Lebih aman pakai "Ganti file".`
            : 'File akan dihapus permanen dari penyimpanan.'
        }
        loading={remove.isPending}
        onClose={() => setConfirm(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
