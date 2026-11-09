import { useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link as LinkIcon, List, ListOrdered, Quote } from 'lucide-react';
import { assetUrl } from '../lib/api';
import { cn } from '../lib/utils';
import { IconButton, Tabs } from './ui';
import { MediaPickerModal } from './MediaLibrary';

/** Editor Markdown dengan toolbar, sisip gambar dari media library, dan preview. */
export function MarkdownEditor({ value, onChange, minHeight = 380, placeholder }: { value: string; onChange: (v: string) => void; minHeight?: number; placeholder?: string }) {
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('write');
  const [picker, setPicker] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const html = useMemo(() => {
    const raw = marked.parse(value ?? '', { async: false, gfm: true, breaks: false }) as string;
    // tampilkan gambar /uploads & /images dari host yang benar
    const fixed = raw.replace(/src="(\/[^"]+)"/g, (_, p) => `src="${assetUrl(p)}"`);
    return DOMPurify.sanitize(fixed);
  }, [value]);

  const wrap = (before: string, after = '', ph = 'teks') => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const sel = value.slice(s, e) || ph;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };
  const linePrefix = (prefix: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => el.focus());
  };
  const insert = (text: string) => {
    const el = ref.current;
    const s = el?.selectionStart ?? value.length;
    onChange(value.slice(0, s) + text + value.slice(s));
  };

  const tools = [
    { label: 'Judul H2', icon: Heading2, fn: () => linePrefix('## ') },
    { label: 'Judul H3', icon: Heading3, fn: () => linePrefix('### ') },
    { label: 'Tebal', icon: Bold, fn: () => wrap('**', '**') },
    { label: 'Miring', icon: Italic, fn: () => wrap('_', '_') },
    { label: 'Daftar', icon: List, fn: () => linePrefix('- ') },
    { label: 'Daftar bernomor', icon: ListOrdered, fn: () => linePrefix('1. ') },
    { label: 'Kutipan', icon: Quote, fn: () => linePrefix('> ') },
    { label: 'Link', icon: LinkIcon, fn: () => wrap('[', '](https://)', 'teks link') },
    { label: 'Sisipkan gambar', icon: ImagePlus, fn: () => setPicker(true) },
  ];

  const editor = (
    <textarea
      ref={ref}
      value={value}
      placeholder={placeholder ?? 'Tulis isi dengan format Markdown…'}
      onChange={(e) => onChange(e.target.value)}
      style={{ minHeight }}
      className="w-full resize-y bg-white px-4 py-3 font-mono text-[13px] leading-relaxed outline-none"
    />
  );
  const preview = (
    <div style={{ minHeight }} className="prose-cms overflow-auto bg-white px-5 py-3 text-sm" dangerouslySetInnerHTML={{ __html: html || '<p style="color:#65767B">Belum ada isi.</p>' }} />
  );

  return (
    <div className="overflow-hidden rounded-lg border border-line focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/15">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-2 py-1.5">
        <div className={cn('flex flex-wrap items-center gap-0.5', mode === 'preview' && 'invisible')}>
          {tools.map((t) => (
            <IconButton key={t.label} label={t.label} onClick={t.fn}>
              <t.icon className="size-4" />
            </IconButton>
          ))}
        </div>
        <Tabs
          value={mode}
          onChange={setMode}
          items={[
            { value: 'write', label: 'Tulis' },
            { value: 'split', label: 'Berdampingan' },
            { value: 'preview', label: 'Pratinjau' },
          ]}
        />
      </div>
      {mode === 'write' && editor}
      {mode === 'preview' && preview}
      {mode === 'split' && (
        <div className="grid grid-cols-1 divide-line md:grid-cols-2 md:divide-x">
          {editor}
          {preview}
        </div>
      )}
      <MediaPickerModal
        open={picker}
        onClose={() => setPicker(false)}
        kind="image"
        onPick={(items) => insert(`\n![${items[0].alt ?? ''}](${items[0].path})\n`)}
      />
    </div>
  );
}
