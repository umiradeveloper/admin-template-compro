import { KeyboardEvent, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, GripVertical, ImagePlus, Link2, Plus, Trash2, X } from 'lucide-react';
import { assetUrl } from '../lib/api';
import { cn, hideBroken } from '../lib/utils';
import { Button, IconButton, Input } from './ui';
import { MediaKind, MediaPickerModal } from './MediaLibrary';

/** Pilih gambar dari media library, atau tempel path/URL manual */
export function ImageField({ value, onChange, kind = 'image', compact }: { value?: string | null; onChange: (v: string) => void; kind?: MediaKind; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const url = assetUrl(value);
  const isImage = kind === 'image' || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(value ?? '');

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className={cn('group relative overflow-hidden rounded-lg border border-line bg-paper', compact ? 'h-28' : 'aspect-video')}>
          {isImage ? (
            <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')} />
          ) : (
            <div className="flex h-full items-center justify-center gap-2 px-3 text-sm text-ink-3">
              <FileText className="size-5 shrink-0" />
              <a href={url} target="_blank" rel="noreferrer" className="truncate underline">{value.split('/').pop()}</a>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button size="sm" variant="secondary" type="button" onClick={() => setOpen(true)}>Ganti</Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => onChange('')} aria-label="Hapus file"><X className="size-3.5" /></Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn('flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line text-sm text-muted hover:border-teal hover:text-teal', compact ? 'h-28' : 'aspect-video')}
        >
          <ImagePlus className="size-6" />
          {kind === 'image' ? 'Pilih gambar' : 'Pilih file'}
        </button>
      )}
      {manual ? (
        <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="/images/... atau https://..." className="h-8 text-xs" />
      ) : (
        <button type="button" className="inline-flex items-center gap-1 self-start text-xs text-muted hover:text-ink" onClick={() => setManual(true)}>
          <Link2 className="size-3" /> Isi path manual
        </button>
      )}
      <MediaPickerModal open={open} onClose={() => setOpen(false)} kind={kind} onPick={(items) => onChange(items[0].path)} />
    </div>
  );
}

export function GalleryField({ value, onChange }: { value?: string[] | null; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const list = value ?? [];
  const move = (i: number, d: number) => {
    const next = [...list];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {list.map((p, i) => (
          <div key={`${p}-${i}`} className="group relative aspect-square overflow-hidden rounded-md border border-line bg-paper">
            <img onError={hideBroken} src={assetUrl(p)} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-end justify-center gap-0.5 bg-ink/40 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <IconButton label="Geser kiri" className="size-6 bg-white" onClick={() => move(i, -1)}><ArrowUp className="size-3 -rotate-90" /></IconButton>
              <IconButton label="Geser kanan" className="size-6 bg-white" onClick={() => move(i, 1)}><ArrowDown className="size-3 -rotate-90" /></IconButton>
              <IconButton label="Hapus" className="size-6 bg-white text-danger" onClick={() => onChange(list.filter((_, x) => x !== i))}><X className="size-3" /></IconButton>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line text-xs text-muted hover:border-teal hover:text-teal">
          <Plus className="size-5" /> Tambah
        </button>
      </div>
      <MediaPickerModal open={open} onClose={() => setOpen(false)} kind="image" multiple onPick={(items) => onChange([...list, ...items.map((m) => m.path)])} />
    </div>
  );
}

export function TagsInput({ value, onChange, placeholder = 'Ketik lalu tekan Enter' }: { value?: string[] | null; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('');
  const list = value ?? [];
  const add = () => {
    const v = text.trim();
    if (v && !list.includes(v)) onChange([...list, v]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !text && list.length) onChange(list.slice(0, -1));
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1.5 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/15">
      {list.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-teal-50 py-0.5 pr-1 pl-2 text-xs font-medium text-teal-600">
          {t}
          <button type="button" aria-label={`Hapus ${t}`} onClick={() => onChange(list.filter((x) => x !== t))} className="rounded hover:bg-teal/15">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={list.length ? '' : placeholder} className="min-w-28 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted/70" />
    </div>
  );
}

/** Repeater sederhana untuk list objek */
export function ListField<T extends Record<string, any>>({
  value, onChange, renderItem, empty, addLabel = 'Tambah baris',
}: { value?: T[] | null; onChange: (v: T[]) => void; renderItem: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode; empty: T; addLabel?: string }) {
  const list = value ?? [];
  const setAt = (i: number, patch: Partial<T>) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => {
    const next = [...list];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {list.map((item, i) => (
        <div key={i} className="flex gap-2 rounded-lg border border-line bg-paper/60 p-3">
          <GripVertical className="mt-2 size-4 shrink-0 text-muted/60" />
          <div className="min-w-0 flex-1">{renderItem(item, (p) => setAt(i, p))}</div>
          <div className="flex flex-col gap-0.5">
            <IconButton label="Naikkan" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="size-3.5" /></IconButton>
            <IconButton label="Turunkan" onClick={() => move(i, 1)} disabled={i === list.length - 1}><ArrowDown className="size-3.5" /></IconButton>
            <IconButton label="Hapus baris" className="!text-danger" onClick={() => onChange(list.filter((_, j) => j !== i))}><Trash2 className="size-3.5" /></IconButton>
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" className="self-start" icon={<Plus className="size-3.5" />} onClick={() => onChange([...list, { ...empty }])}>
        {addLabel}
      </Button>
    </div>
  );
}
