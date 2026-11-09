import { FormEvent, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ROLE_LABEL } from '../lib/utils';
import { Button, Field, Input, Panel } from '../components/ui';
import { ImageField } from '../components/fields';
import { PageHeader } from '../components/PageHeader';

export default function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatar(user.avatar ?? '');
    }
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: async () => api.patch('/auth/profile', { name, email, avatar }),
    onSuccess: async () => { toast.success('Profil disimpan'); await refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const changePw = useMutation({
    mutationFn: async () => api.post('/auth/change-password', { currentPassword: pw.current, newPassword: pw.next }),
    onSuccess: () => { toast.success('Password diganti'); setPw({ current: '', next: '', confirm: '' }); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submitPw = (e: FormEvent) => {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error('Password baru minimal 8 karakter');
    if (pw.next !== pw.confirm) return toast.error('Konfirmasi password tidak sama');
    changePw.mutate();
  };

  return (
    <>
      <PageHeader title="Profil saya" description={`Peran: ${ROLE_LABEL[user?.role ?? 'editor']}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Data diri">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); saveProfile.mutate(); }}>
            <div className="w-40"><ImageField value={avatar} onChange={setAvatar} compact /></div>
            <Field label="Nama" htmlFor="pn"><Input id="pn" value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email" htmlFor="pe"><Input id="pe" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Button type="submit" className="self-start" loading={saveProfile.isPending}>Simpan profil</Button>
          </form>
        </Panel>
        <Panel title="Ganti password">
          <form className="flex flex-col gap-4" onSubmit={submitPw}>
            <Field label="Password saat ini" htmlFor="p1"><Input id="p1" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="Password baru" help="Minimal 8 karakter." htmlFor="p2"><Input id="p2" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Field label="Ulangi password baru" htmlFor="p3"><Input id="p3" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            <Button type="submit" className="self-start" loading={changePw.isPending}>Ganti password</Button>
          </form>
        </Panel>
      </div>
    </>
  );
}
