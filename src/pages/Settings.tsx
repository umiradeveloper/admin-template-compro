import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { SchemaValues } from '../lib/types';
import { cn, formatDate } from '../lib/utils';
import { Button, PageLoader, Panel } from '../components/ui';
import { SchemaForm } from '../components/SchemaForm';
import { PageHeader } from '../components/PageHeader';
import { useSchemas } from './Collections';

export default function Settings() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const { data: schemas } = useSchemas();
  const { data: all, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<Record<string, SchemaValues & { updatedAt?: string }>>('/admin/settings')).data,
  });
  const [active, setActive] = useState('general');
  const [values, setValues] = useState<SchemaValues>({ data: {}, translations: { en: {}, id: {} } });

  useEffect(() => {
    if (all?.[active]) setValues({ data: all[active].data ?? {}, translations: all[active].translations ?? { en: {}, id: {} } });
  }, [all, active]);

  const dirty = useMemo(() => all?.[active] && JSON.stringify({ data: all[active].data, translations: all[active].translations }) !== JSON.stringify(values), [all, active, values]);

  const save = useMutation({
    mutationFn: async () => api.put(`/admin/settings/${active}`, values),
    onSuccess: () => {
      toast.success('Pengaturan disimpan');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !schemas || !all) return <PageLoader />;
  const schema = schemas.settings.find((s) => s.key === active)!;
  const readOnly = !can('admin');

  return (
    <>
      <PageHeader title="Pengaturan" description="Identitas perusahaan, media beranda, formulir kontak, dan SEO." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Grup pengaturan">
          {schemas.settings.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={cn('rounded-md px-3 py-2 text-left text-sm whitespace-nowrap', active === s.key ? 'bg-white font-medium shadow-sm ring-1 ring-line' : 'text-ink-3 hover:bg-ink/5')}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <Panel
          title={schema.label}
          actions={
            <div className="flex items-center gap-3">
              {all[active]?.updatedAt && <span className="hidden text-xs text-muted sm:inline">Diubah {formatDate(all[active].updatedAt, true)}</span>}
              {!readOnly && <Button size="sm" loading={save.isPending} disabled={!dirty} onClick={() => save.mutate()}>Simpan</Button>}
            </div>
          }
        >
          {schema.description && <p className="-mt-1 mb-5 text-sm text-muted">{schema.description}</p>}
          {readOnly && <p className="mb-5 rounded-md bg-copper-50 px-3 py-2 text-sm text-copper">Hanya admin yang bisa mengubah pengaturan.</p>}
          <fieldset disabled={readOnly} className="min-w-0">
            <SchemaForm fields={schema.fields} values={values} onChange={setValues} />
          </fieldset>
        </Panel>
      </div>
    </>
  );
}
