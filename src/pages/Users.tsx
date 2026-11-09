import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, assetUrl, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Paginated, Role, User } from '../lib/types';
import { formatDate, ROLE_LABEL, hideBroken } from '../lib/utils';
import { Badge, Button, ConfirmDialog, Field, IconButton, Input, Modal, PageLoader, Pagination, Select, Switch } from '../components/ui';
import { PageHeader } from '../components/PageHeader';

interface Form { id?: number; name: string; email: string; role: Role; password: string; isActive: boolean }
const ROLE_HELP: Record<Role, string> = {
  editor: 'Mengelola blog, proyek, karir, media, konten halaman, dan pesan masuk.',
  admin: 'Semua akses editor + pengaturan website dan log aktivitas.',
  superadmin: 'Akses penuh termasuk mengelola pengguna.',
};

export default function Users() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['users', page], queryFn: async () => (await api.get<Paginated<User>>('/admin/users', { params: { page, limit: 20 } })).data });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const body: Record<string, unknown> = { name: f.name, email: f.email, role: f.role, isActive: f.isActive };
      if (f.password) body.password = f.password;
      return f.id ? api.patch(`/admin/users/${f.id}`, body) : api.post('/admin/users', body);
    },
    onSuccess: (_, f) => {
      toast.success(f.id ? 'Pengguna diperbarui' : 'Pengguna ditambahkan');
      setForm(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success('Pengguna dihapus');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun yang bisa masuk ke CMS beserta hak aksesnya."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setForm({ name: '', email: '', role: 'editor', password: '', isActive: true })}>Tambah pengguna</Button>}
      />
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {isLoading ? <PageLoader /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="py-2.5 pl-5 font-medium">Nama</th>
                  <th className="py-2.5 pr-3 font-medium">Peran</th>
                  <th className="hidden py-2.5 pr-3 font-medium md:table-cell">Login terakhir</th>
                  <th className="py-2.5 pr-3 font-medium">Status</th>
                  <th className="pr-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data?.data.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        {u.avatar ? <img onError={hideBroken} src={assetUrl(u.avatar)} alt="" className="size-9 rounded-full object-cover" /> : <UserCircle className="size-9 text-muted/60" strokeWidth={1.3} />}
                        <div>
                          <p className="font-medium">{u.name} {u.id === me?.id && <span className="text-xs font-normal text-muted">(Anda)</span>}</p>
                          <p className="text-xs text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3"><Badge tone={u.role === 'superadmin' ? 'dark' : u.role === 'admin' ? 'teal' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge></td>
                    <td className="hidden py-3 pr-3 text-ink-3 md:table-cell">{formatDate(u.lastLoginAt, true)}</td>
                    <td className="py-3 pr-3">{u.isActive ? <Badge tone="teal">Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                    <td className="py-3 pr-5">
                      <div className="flex justify-end gap-0.5">
                        <IconButton label="Ubah" onClick={() => setForm({ id: u.id, name: u.name, email: u.email, role: u.role, password: '', isActive: u.isActive })}><Pencil className="size-4" /></IconButton>
                        <IconButton label="Hapus" className="hover:text-danger" disabled={u.id === me?.id} onClick={() => setDeleting(u)}><Trash2 className="size-4" /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Ubah pengguna' : 'Tambah pengguna'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setForm(null)}>Batal</Button>
            <Button loading={save.isPending} onClick={() => form && save.mutate(form)}>Simpan</Button>
          </>
        }
      >
        {form && (
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
            <Field label="Nama" required htmlFor="un"><Input id="un" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email" required htmlFor="ue"><Input id="ue" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Peran" help={ROLE_HELP[form.role]} htmlFor="ur">
              <Select id="ur" value={form.role} disabled={form.id === me?.id} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super admin</option>
              </Select>
            </Field>
            <Field label={form.id ? 'Password baru' : 'Password'} required={!form.id} help={form.id ? 'Kosongkan bila tidak diganti. Minimal 8 karakter.' : 'Minimal 8 karakter.'} htmlFor="up">
              <Input id="up" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Switch checked={form.isActive} disabled={form.id === me?.id} onChange={(v) => setForm({ ...form, isActive: v })} label="Akun aktif (bisa login)" />
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        title="Hapus pengguna?"
        message={<>{deleting?.name} tidak akan bisa login lagi. Konten yang pernah dibuat tetap tersimpan.</>}
        loading={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </>
  );
}
