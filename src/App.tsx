import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import type { Role } from './lib/types';
import { Layout } from './components/Layout';
import { EmptyState, Spinner } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContentList from './pages/content/ContentList';
import ContentEditor from './pages/content/ContentEditor';
import { CONTENT_TYPES } from './pages/content/contentTypes';
import Collections from './pages/Collections';
import CollectionItems from './pages/CollectionItems';
import SiteTexts from './pages/SiteTexts';
import Settings from './pages/Settings';
import MediaPage from './pages/MediaPage';
import Inquiries from './pages/Inquiries';
import Users from './pages/Users';
import ActivityLogs from './pages/ActivityLogs';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-7" />
      </div>
    );
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { can } = useAuth();
  return can(role) ? <>{children}</> : <EmptyState title="Akses ditolak" description="Peran Anda tidak memiliki izin untuk halaman ini." />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        {Object.values(CONTENT_TYPES).map((t) => [
          <Route key={`${t.key}-list`} path={t.key} element={<ContentList type={t} />} />,
          <Route key={`${t.key}-edit`} path={`${t.key}/:id`} element={<ContentEditor key={t.key} type={t} />} />,
        ])}
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:key" element={<CollectionItems />} />
        <Route path="site-texts" element={<SiteTexts />} />
        <Route path="settings" element={<Settings />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="inquiries" element={<Inquiries />} />
        <Route path="users" element={<RequireRole role="superadmin"><Users /></RequireRole>} />
        <Route path="activity" element={<RequireRole role="admin"><ActivityLogs /></RequireRole>} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
