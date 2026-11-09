import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Briefcase, Building2, ExternalLink, FileText, History, Images, Inbox, LayoutDashboard, LayoutList, LogOut, Menu, Settings,
  Type, UserCircle, Users, X,
} from 'lucide-react';
import { api, assetUrl, SITE_URL } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Role } from '../lib/types';
import { cn, ROLE_LABEL, hideBroken } from '../lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: Role;
  badge?: number;
}

function NavGroup({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate: () => void }) {
  const { can } = useAuth();
  const visible = items.filter((i) => !i.minRole || can(i.minRole));
  if (!visible.length) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {title && <p className="px-3 pt-5 pb-1.5 text-xs text-white/40">{title}</p>}
      {visible.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-white/10 font-medium text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r bg-teal-200" />}
              <item.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && <span className="rounded-full bg-copper px-1.5 text-[11px] font-semibold leading-5 text-white">{item.badge}</span>}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const { data: counts } = useQuery({
    queryKey: ['inquiries', 'counts'],
    queryFn: async () => (await api.get<Record<string, number>>('/admin/inquiries/counts')).data,
    refetchInterval: 60_000,
  });

  const close = () => setOpen(false);

  const sidebar: ReactNode = (
    <div className="flex h-full flex-col bg-ink px-3 py-4 text-white">
      <Link to="/" className="mb-4 flex items-center gap-2.5 px-3 py-1">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white/10">
          <Building2 className="size-[18px] text-teal-200" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold">Umira CMS</span>
          <span className="block text-xs text-white/45">Company profile</span>
        </span>
      </Link>
      <nav className="-mx-1 flex-1 overflow-y-auto px-1" aria-label="Navigasi utama">
        <NavGroup onNavigate={close} items={[{ to: '/', label: 'Dashboard', icon: LayoutDashboard }]} />
        <NavGroup
          onNavigate={close}
          title="Konten"
          items={[
            { to: '/blogs', label: 'Blog & Aktivitas', icon: FileText },
            { to: '/projects', label: 'Proyek', icon: Building2 },
            { to: '/careers', label: 'Karir', icon: Briefcase },
            { to: '/media', label: 'Media', icon: Images },
          ]}
        />
        <NavGroup
          onNavigate={close}
          title="Halaman website"
          items={[
            { to: '/collections', label: 'Konten halaman', icon: LayoutList },
            { to: '/site-texts', label: 'Teks website', icon: Type },
            { to: '/settings', label: 'Pengaturan', icon: Settings },
          ]}
        />
        <NavGroup
          onNavigate={close}
          title="Komunikasi"
          items={[{ to: '/inquiries', label: 'Pesan masuk', icon: Inbox, badge: counts?.new }]}
        />
        <NavGroup
          onNavigate={close}
          title="Sistem"
          items={[
            { to: '/users', label: 'Pengguna', icon: Users, minRole: 'superadmin' },
            { to: '/activity', label: 'Log aktivitas', icon: History, minRole: 'admin' },
          ]}
        />
      </nav>
      <div className="mt-3 border-t border-white/10 pt-3">
        <Link to="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-white/5">
          {user?.avatar ? (
            <img onError={hideBroken} src={assetUrl(user.avatar)} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <UserCircle className="size-8 text-white/50" strokeWidth={1.4} />
          )}
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium">{user?.name}</span>
            <span className="block text-xs text-white/45">{ROLE_LABEL[user?.role ?? 'editor']}</span>
          </span>
        </Link>
        <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white/65 hover:bg-white/5 hover:text-white">
          <LogOut className="size-[18px]" strokeWidth={1.8} /> Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={close} />
          <aside className="absolute inset-y-0 left-0 w-72">{sidebar}</aside>
          <button onClick={close} aria-label="Tutup menu" className="absolute top-4 left-[300px] rounded-md bg-white p-1.5">
            <X className="size-5" />
          </button>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-8">
          <button className="rounded-md p-1.5 hover:bg-ink/5 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu">
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          {SITE_URL && (
            <a href={SITE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              Lihat website <ExternalLink className="size-3.5" />
            </a>
          )}
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
