import { FormEvent, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { errorMessage } from '../lib/api';
import { Button, Field, Input } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={params.get('next') || '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      nav(params.get('next') || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <div className="blueprint relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 32 32" className="size-9" aria-hidden>
            <rect width="32" height="32" rx="7" fill="rgba(255,255,255,.08)" />
            <path d="M9 9v9a7 7 0 0 0 14 0V9" fill="none" stroke="#5FB3AA" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-semibold">Umira Sinergi Global</span>
        </div>
        {/* gambar potongan bangunan bergaya blueprint */}
        <svg viewBox="0 0 480 260" className="w-full max-w-xl text-teal-200/70" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
          <path d="M20 240h440" strokeWidth="2" />
          <path d="M60 240V120l90-60 90 60v120" />
          <path d="M240 240V90h170v150" />
          <path d="M240 90l85-50 85 50" />
          <rect x="90" y="150" width="40" height="50" />
          <rect x="160" y="150" width="40" height="50" />
          <rect x="125" y="205" width="40" height="35" />
          {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={262 + c * 36} y={110 + r * 40} width="22" height="26" />))}
          <path d="M20 255h440M20 250v10M460 250v10M240 250v10" strokeDasharray="4 4" opacity=".6" />
          <text x="230" y="275" fill="currentColor" stroke="none" fontSize="11">48.000 m²</text>
        </svg>
        <div>
          <p className="max-w-md text-3xl font-bold leading-tight">Kelola isi website company profile dari satu tempat.</p>
          <p className="mt-3 max-w-md text-sm text-white/60">Blog, proyek, lowongan, teks halaman, dan pesan dari calon klien — semua dalam dua bahasa.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">Masuk ke CMS</h1>
          <p className="mt-1 text-sm text-muted">Gunakan akun yang diberikan administrator.</p>
          <div className="mt-8 flex flex-col gap-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {error && <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" loading={loading} className="mt-2 w-full">Masuk</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
