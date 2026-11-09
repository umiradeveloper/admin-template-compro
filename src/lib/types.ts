export type Role = 'superadmin' | 'admin' | 'editor';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type Locale = 'en' | 'id';
export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
];

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type FieldType =
  | 'text' | 'textarea' | 'markdown' | 'number' | 'boolean' | 'image' | 'file'
  | 'url' | 'email' | 'select' | 'tags' | 'list' | 'date' | 'datetime' | 'gallery';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  translatable?: boolean;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  fields?: FieldDef[];
}

export interface ContentSchema {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  titleField?: string;
  usedOn?: string;
  fields: FieldDef[];
  count?: number;
}

export interface SchemaValues {
  data: Record<string, any>;
  translations: Record<string, Record<string, any>>;
}

export interface CollectionItem extends SchemaValues {
  id: number;
  collection: string;
  sortOrder: number;
  isActive: boolean;
  title: string;
  updatedAt: string;
}

export interface Media {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  folder: string;
  alt: string | null;
  createdAt: string;
  updatedAt?: string;
  storage?: 'local' | 'minio';
}

export interface MediaUsage {
  path: string;
  count: number;
  items: { label: string; ref: string; title?: string; link: string }[];
}

export interface Inquiry {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string;
  status: 'new' | 'read' | 'replied' | 'archived';
  notes: string | null;
  source: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  ip: string | null;
  createdAt: string;
}

export interface ContentItem {
  id: number;
  slug: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  translations: Array<Record<string, any> & { locale: Locale; title: string }>;
  [key: string]: any;
}
