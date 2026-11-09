import type { FieldDef, SchemaValues } from '../lib/types';
import { LOCALES } from '../lib/types';
import { toDateInput, toDateTimeInput } from '../lib/utils';
import { Field, Input, Select, Switch, Textarea } from './ui';
import { GalleryField, ImageField, ListField, TagsInput } from './fields';
import { MarkdownEditor } from './MarkdownEditor';

/** Satu input sesuai tipe field */
export function FieldInput({ field, value, onChange, id }: { field: FieldDef; value: any; onChange: (v: any) => void; id?: string }) {
  switch (field.type) {
    case 'textarea':
      return <Textarea id={id} rows={3} value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'markdown':
      return <MarkdownEditor value={value ?? ''} onChange={onChange} minHeight={260} />;
    case 'number':
      return <Input id={id} type="number" step="any" value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'boolean':
      return <Switch checked={!!value} onChange={onChange} label={value ? 'Ya' : 'Tidak'} />;
    case 'image':
      return <div className="max-w-xs"><ImageField value={value} onChange={onChange} kind="image" compact /></div>;
    case 'file':
      return <div className="max-w-xs"><ImageField value={value} onChange={onChange} kind="" compact /></div>;
    case 'gallery':
      return <GalleryField value={value} onChange={onChange} />;
    case 'tags':
      return <TagsInput value={value} onChange={onChange} placeholder={field.placeholder} />;
    case 'select':
      return (
        <Select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Pilih —</option>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      );
    case 'date':
      return <Input id={id} type="date" value={toDateInput(value)} onChange={(e) => onChange(e.target.value || null)} />;
    case 'datetime':
      return <Input id={id} type="datetime-local" value={toDateTimeInput(value)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
    case 'list':
      return (
        <ListField
          value={value}
          onChange={onChange}
          empty={Object.fromEntries((field.fields ?? []).map((f) => [f.name, f.type === 'boolean' ? false : '']))}
          renderItem={(item, set) => (
            <div className="grid gap-3 sm:grid-cols-2">
              {(field.fields ?? []).map((sub) => (
                <Field key={sub.name} label={sub.label}>
                  <FieldInput field={sub} value={item[sub.name]} onChange={(v) => set({ [sub.name]: v } as any)} />
                </Field>
              ))}
            </div>
          )}
        />
      );
    default:
      return (
        <Input
          id={id}
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/**
 * Form otomatis dari definisi skema.
 * Field terjemahan ditampilkan berdampingan: Indonesia | English.
 */
export function SchemaForm({ fields, values, onChange }: { fields: FieldDef[]; values: SchemaValues; onChange: (v: SchemaValues) => void }) {
  const setData = (name: string, v: any) => onChange({ ...values, data: { ...values.data, [name]: v } });
  const setTr = (locale: string, name: string, v: any) =>
    onChange({ ...values, translations: { ...values.translations, [locale]: { ...(values.translations?.[locale] ?? {}), [name]: v } } });

  return (
    <div className="flex flex-col gap-5">
      {fields.map((f) =>
        f.translatable ? (
          <fieldset key={f.name} className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-medium text-ink-2">
              {f.label}
              {f.required && <span className="ml-0.5 text-copper">*</span>}
            </legend>
            <div className="grid gap-3 md:grid-cols-2">
              {LOCALES.map((l) => (
                <div key={l.code} className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-muted">{l.label}</span>
                  <FieldInput field={f} value={values.translations?.[l.code]?.[f.name]} onChange={(v) => setTr(l.code, f.name, v)} />
                </div>
              ))}
            </div>
            {f.help && <p className="text-xs text-muted">{f.help}</p>}
          </fieldset>
        ) : (
          <Field key={f.name} label={f.label} required={f.required} help={f.help} htmlFor={`f-${f.name}`}>
            <FieldInput id={`f-${f.name}`} field={f} value={values.data?.[f.name]} onChange={(v) => setData(f.name, v)} />
          </Field>
        ),
      )}
    </div>
  );
}
