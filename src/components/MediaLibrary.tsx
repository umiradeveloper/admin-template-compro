import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Film, ImageIcon, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import type { Media, Paginated } from '../lib/types';
import { cn, formatBytes } from '../lib/utils';
import { Button, EmptyState, Input, Modal, Pagination, Select, Spinner } from './ui';

export type MediaKind = 'image' | 'video' | 'document' | '';

export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ files, folder }: { files: File[]; folder?: string }) => {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      fd.append('folder', folder || 'general');
      const { data } = await api.post('/admin/media', fd);
      return (data.items ?? [data]) as Media[];
    },
    onSuccess: (items) => {
      qc.invalidateQueries({ queryKey: ['media'] });
      toast.success(items.length > 1 ? `${items.length} file diupload` : 'File diupload');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function MediaThumb({ m, className }: { m: Pick<Media, 'mimeType' | 'url' | 'originalName' | 'alt'>; className?: string }) {
  if (m.mimeType.startsWith('image/'))
    return <img src={m.url} alt={m.alt ?? m.originalName} loading="lazy" className={cn('h-full w-full', m.mimeType === 'image/svg+xml' ? 'object-contain p-4' : 'object-cover', className)} />;
  const Icon = m.mimeType.startsWith('video/') ? Film : FileText;
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-1 bg-paper text-muted', className)}>
      <Icon className="size-7" />
      <span className="text-[11px] uppercase">{m.mimeType.split('/')[1]?.slice(0, 6)}</span>
    </div>
  );
}

/** Grid media + upload. Dipakai di halaman Media dan di modal pemilih. */
export function MediaBrowser({
  kind = '', onPick, selectedIds, multiple, onItemClick,
}: { kind?: MediaKind; onPick?: (items: Media[]) => void; selectedIds?: number[]; multiple?: boolean; onItemClick?: (m: Media) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<MediaKind>(kind);
  const [folder, setFolder] = useState('');
  const [selected, setSelected] = useState<Media[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUpload();

  const { data, isLoading } = useQuery({
    queryKey: ['media', { page, search, type, folder }],
    queryFn: async () => (await api.get<Paginated<Media>>('/admin/media', { params: { page, limit: 24, search: search || undefined, type: type || undefined, folder: folder || undefined } })).data,
  });
  const { data: folders } = useQuery({ queryKey: ['media', 'folders'], queryFn: async () => (await api.get<string[]>('/admin/media/folders')).data });

  const accept = kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : kind === 'document' ? 'application/pdf' : 'image/*,video/*,application/pdf';

  const toggle = (m: Media) => {
    if (onItemClick) return onItemClick(m);
    if (!onPick) return;
    if (!multiple) return onPick([m]);
    setSelected((s) => (s.some((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : [...s, m]));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const items = await upload.mutateAsync({ files: [...files], folder: folder || undefined });
    if (onPick && !multiple && items[0]) onPick([items[0]]);
    if (multiple) setSelected((s) => [...s, ...items]);
  };

  return (
    <div
      className="flex flex-col gap-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void onFiles(e.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Cari nama file…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {!kind && (
          <Select className="!w-36" value={type} onChange={(e) => { setType(e.target.value as MediaKind); setPage(1); }} aria-label="Jenis file">
            <option value="">Semua jenis</option>
            <option value="image">Gambar</option>
            <option value="video">Video</option>
            <option value="document">Dokumen</option>
          </Select>
        )}
        <Select className="!w-44" value={folder} onChange={(e) => { setFolder(e.target.value); setPage(1); }} aria-label="Folder">
          <option value="">Semua folder</option>
          {folders?.map((f) => <option key={f} value={f}>{f}</option>)}
        </Select>
        <input ref={fileRef} type="file" hidden multiple accept={accept} onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
        <Button icon={<Upload className="size-4" />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>
          Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center"><Spinner /></div>
      ) : !data?.data.length ? (
        <div className="rounded-xl border-2 border-dashed border-line">
          <EmptyState icon={<ImageIcon className="size-8" />} title="Belum ada file" description="Seret file ke sini atau klik Upload. Gambar, video MP4, dan PDF didukung." />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {data.data.map((m) => {
            const active = selected.some((s) => s.id === m.id) || selectedIds?.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m)}
                className={cn(
                  'group overflow-hidden rounded-lg border bg-white text-left transition-colors',
                  active ? 'border-teal ring-2 ring-teal/30' : 'border-line hover:border-ink-3/40',
                )}
              >
                <div className="aspect-square overflow-hidden bg-paper">
                  <MediaThumb m={m} />
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium" title={m.originalName}>{m.originalName}</p>
                  <p className="text-[11px] text-muted">{formatBytes(m.size)}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {data && data.meta.totalPages > 1 && (
        <div className="-mx-5 -mb-5">
          <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />
        </div>
      )}
      {multiple && onPick && (
        <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
          <span className="text-sm text-muted">{selected.length} dipilih</span>
          <Button disabled={!selected.length} onClick={() => onPick(selected)}>Gunakan file terpilih</Button>
        </div>
      )}
    </div>
  );
}

export function MediaPickerModal({ open, onClose, onPick, kind, multiple }: { open: boolean; onClose: () => void; onPick: (items: Media[]) => void; kind?: MediaKind; multiple?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={multiple ? 'Pilih file' : 'Pilih atau upload file'} size="xl">
      {open && (
        <MediaBrowser
          kind={kind}
          multiple={multiple}
          onPick={(items) => {
            onPick(items);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
