import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Building2, FileText, Images, Inbox, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { ActivityLog, ContentItem, Inquiry } from '../lib/types';
import { formatBytes, formatDate, timeAgo } from '../lib/utils';
import { Button, EmptyState, PageLoader, Panel, StatusBadge } from '../components/ui';
import { PageHeader } from '../components/PageHeader';

interface Summary {
  counts: {
    blogs: Record<string, number>;
    projects: Record<string, number>;
    careers: Record<string, number>;
    inquiries: Record<string, number>;
    media: { count: number; totalSize: number };
    users: number;
  };
  recentInquiries: Inquiry[];
  recentActivity: ActivityLog[];
  inquiriesMonthly: { month: string; count: number }[];
  latestBlogs: ContentItem[];
}

const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short' });

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get<Summary>('/admin/dashboard')).data });
  if (isLoading || !data) return <PageLoader />;
  const c = data.counts;
  const max = Math.max(1, ...data.inquiriesMonthly.map((m) => m.count));

  const stats = [
    { to: '/blogs', icon: FileText, label: 'Artikel terbit', value: c.blogs.published, sub: `${c.blogs.draft} draf` },
    { to: '/projects', icon: Building2, label: 'Proyek tampil', value: c.projects.published, sub: `${c.projects.total} total` },
    { to: '/careers', icon: Briefcase, label: 'Lowongan dibuka', value: c.careers.open, sub: `${c.careers.total} total` },
    { to: '/inquiries', icon: Inbox, label: 'Pesan belum dibaca', value: c.inquiries.new, sub: `${c.inquiries.total} total`, accent: c.inquiries.new > 0 },
    { to: '/media', icon: Images, label: 'File media', value: c.media.count, sub: formatBytes(c.media.totalSize) },
  ];

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name?.split(' ')[0] ?? ''}`}
        description="Ringkasan isi website dan aktivitas terbaru."
        actions={
          <>
            <Link to="/projects/new"><Button variant="secondary" icon={<Plus className="size-4" />}>Proyek</Button></Link>
            <Link to="/blogs/new"><Button icon={<Plus className="size-4" />}>Tulis artikel</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-5">
        {stats.map((s) => (
          <Link key={s.to} to={s.to} className="group flex flex-col gap-3 bg-white p-5 last:col-span-2 hover:bg-paper md:last:col-span-1">
            <s.icon className={s.accent ? 'size-5 text-copper' : 'size-5 text-teal'} strokeWidth={1.8} />
            <div>
              <p className="text-3xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-sm text-ink-3">{s.label}</p>
              <p className="text-xs text-muted">{s.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Pesan masuk terbaru"
          actions={<Link to="/inquiries" className="text-sm text-teal hover:underline">Lihat semua</Link>}
          bodyClassName="p-0"
        >
          {data.recentInquiries.length === 0 ? (
            <EmptyState icon={<Inbox className="size-7" />} title="Belum ada pesan" description="Pesan dari formulir kontak website akan muncul di sini." />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentInquiries.map((i) => (
                <li key={i.id}>
                  <Link to={`/inquiries?open=${i.id}`} className="flex items-start gap-4 px-5 py-3.5 hover:bg-paper">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {i.name} <span className="font-normal text-muted">{i.email}</span>
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-sm text-ink-3">{i.message}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={i.status} />
                      <span className="text-xs text-muted">{timeAgo(i.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Pesan per bulan">
          <div className="flex h-40 items-end gap-3" role="img" aria-label="Grafik jumlah pesan 6 bulan terakhir">
            {data.inquiriesMonthly.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs tabular-nums text-ink-3">{m.count}</span>
                <div className="w-full rounded-t bg-teal" style={{ height: `${Math.max(3, (m.count / max) * 110)}px`, opacity: m.count ? 1 : 0.25 }} />
                <span className="text-xs text-muted">{monthName(m.month)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Artikel terakhir diubah" className="lg:col-span-2" bodyClassName="p-0" actions={<Link to="/blogs" className="text-sm text-teal hover:underline">Semua artikel</Link>}>
          <ul className="divide-y divide-line">
            {data.latestBlogs.map((b) => {
              const t = b.translations.find((x) => x.locale === 'id') ?? b.translations[0];
              return (
                <li key={b.id}>
                  <Link to={`/blogs/${b.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-paper">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{t?.title}</span>
                    <StatusBadge status={b.status} />
                    <span className="w-28 text-right text-xs text-muted">{formatDate(b.updatedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Aktivitas terbaru" bodyClassName="p-0">
          <ol className="divide-y divide-line">
            {data.recentActivity.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <p className="text-sm leading-snug">{a.description}</p>
                <p className="mt-0.5 text-xs text-muted">{timeAgo(a.createdAt)}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
