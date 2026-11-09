import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import type { ContentSchema } from '../lib/types';
import { PageLoader } from '../components/ui';
import { PageHeader } from '../components/PageHeader';

export const useSchemas = () =>
  useQuery({
    queryKey: ['schemas'],
    queryFn: async () => (await api.get<{ collections: ContentSchema[]; settings: ContentSchema[] }>('/admin/schemas')).data,
    staleTime: 30_000,
  });

const GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Beranda', keys: ['services', 'home-stats', 'team', 'testimonials', 'faqs', 'partners', 'avatars'] },
  { title: 'Tentang kami', keys: ['about-stats', 'services-slider'] },
  { title: 'Navigasi & footer', keys: ['menu', 'footer-links', 'offices', 'social-links'] },
];

export default function Collections() {
  const { data, isLoading } = useSchemas();
  if (isLoading || !data) return <PageLoader />;
  const known = new Set(GROUPS.flatMap((g) => g.keys));
  const groups = [...GROUPS, { title: 'Lainnya', keys: data.collections.filter((c) => !known.has(c.key)).map((c) => c.key) }];

  return (
    <>
      <PageHeader title="Konten halaman" description="Daftar item yang tampil di berbagai section website: layanan, tim, FAQ, partner, menu, dan lainnya." />
      <div className="flex flex-col gap-8">
        {groups.map((g) => {
          const items = g.keys.map((k) => data.collections.find((c) => c.key === k)).filter(Boolean) as ContentSchema[];
          if (!items.length) return null;
          return (
            <section key={g.title}>
              <h2 className="mb-3 text-sm font-semibold text-ink-3">{g.title}</h2>
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                {items.map((c) => (
                  <Link key={c.key} to={`/collections/${c.key}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.label}</p>
                      <p className="mt-0.5 text-sm text-muted">{c.description ?? c.usedOn}</p>
                    </div>
                    {c.usedOn && <span className="hidden text-xs text-muted md:block">{c.usedOn}</span>}
                    <span className="w-16 text-right text-sm tabular-nums text-ink-3">{c.count} item</span>
                    <ChevronRight className="size-4 text-muted" />
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
