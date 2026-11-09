import type { FieldDef } from '../../lib/types';

export interface ContentTypeConfig {
  key: 'blogs' | 'projects' | 'careers';
  label: string;
  singular: string;
  description: string;
  /** path halaman detail di website, untuk tombol "Lihat di website" */
  sitePath: string;
  dateField?: string;
  /** field non-terjemahan, tampil di kolom kanan editor */
  scalarFields: FieldDef[];
  /** field per bahasa (selain judul) */
  translationFields: FieldDef[];
}

const seo: FieldDef[] = [
  { name: 'metaTitle', label: 'Meta title (SEO)', type: 'text', help: 'Kosongkan untuk memakai judul.' },
  { name: 'metaDescription', label: 'Meta description (SEO)', type: 'textarea', help: 'Ringkasan 140–160 karakter untuk hasil pencarian Google.' },
];

export const CONTENT_TYPES: Record<string, ContentTypeConfig> = {
  blogs: {
    key: 'blogs',
    label: 'Blog & Aktivitas',
    singular: 'artikel',
    description: 'Berita, buletin bulanan, dan aktivitas proyek yang tampil di halaman Blog.',
    sitePath: 'blog',
    dateField: 'publishedAt',
    scalarFields: [
      { name: 'publishedAt', label: 'Tanggal terbit', type: 'datetime' },
      { name: 'coverImage', label: 'Gambar sampul', type: 'image', help: 'Tampil di daftar artikel.' },
      { name: 'galleryImg', label: 'Gambar halaman detail', type: 'image' },
      { name: 'tags', label: 'Tag', type: 'text', placeholder: 'proyek, bali, event', help: 'Pisahkan dengan koma.' },
      { name: 'isFeatured', label: 'Artikel unggulan', type: 'boolean' },
    ],
    translationFields: [
      { name: 'detail', label: 'Sub judul / lokasi', type: 'text', placeholder: 'UMI Resort Bali at Uluwatu' },
      { name: 'excerpt', label: 'Ringkasan', type: 'textarea', help: 'Paragraf pembuka singkat di bawah judul.' },
      { name: 'content', label: 'Isi artikel', type: 'markdown' },
      ...seo,
    ],
  },
  projects: {
    key: 'projects',
    label: 'Proyek',
    singular: 'proyek',
    description: 'Portofolio proyek di halaman Projects dan slider beranda. Urutan mengikuti angka "Urutan".',
    sitePath: 'projects',
    scalarFields: [
      { name: 'coverImage', label: 'Gambar sampul', type: 'image' },
      { name: 'gallery', label: 'Galeri foto', type: 'gallery' },
      { name: 'area', label: 'Luas area', type: 'text', placeholder: '5,822 m²' },
      { name: 'location', label: 'Lokasi', type: 'text', placeholder: 'Nusa Dua, Bali' },
      { name: 'client', label: 'Klien', type: 'text' },
      { name: 'year', label: 'Tahun', type: 'text', placeholder: '2025' },
      {
        name: 'projectStatus', label: 'Status proyek', type: 'select',
        options: [
          { value: 'planning', label: 'Perencanaan' },
          { value: 'ongoing', label: 'Berjalan' },
          { value: 'completed', label: 'Selesai' },
        ],
      },
      { name: 'website', label: 'Website proyek', type: 'url' },
      { name: 'sortOrder', label: 'Urutan', type: 'number', help: 'Angka kecil tampil lebih dulu.' },
      { name: 'isFeatured', label: 'Tampilkan di beranda', type: 'boolean' },
    ],
    translationFields: [
      { name: 'industry', label: 'Kategori / industri', type: 'text', placeholder: 'Villa & Apartment' },
      { name: 'scopeOfWork', label: 'Lingkup pekerjaan / tag', type: 'tags', placeholder: 'Villa, Hotel, Design & Build' },
      { name: 'description', label: 'Deskripsi singkat', type: 'textarea' },
      { name: 'content', label: 'Detail proyek', type: 'markdown' },
      ...seo,
    ],
  },
  careers: {
    key: 'careers',
    label: 'Karir',
    singular: 'lowongan',
    description: 'Lowongan kerja di halaman Career. Lowongan otomatis disembunyikan setelah tanggal penutupan.',
    sitePath: 'career',
    dateField: 'publishedAt',
    scalarFields: [
      { name: 'publishedAt', label: 'Tanggal dibuka', type: 'datetime' },
      { name: 'closingDate', label: 'Tanggal ditutup', type: 'date', help: 'Kosongkan bila tidak ada batas.' },
      { name: 'department', label: 'Divisi', type: 'text', placeholder: 'Engineering' },
      { name: 'location', label: 'Lokasi penempatan', type: 'text', placeholder: 'Yogyakarta / Bali' },
      {
        name: 'employmentType', label: 'Jenis pekerjaan', type: 'select',
        options: [
          { value: 'full-time', label: 'Full-time' },
          { value: 'contract', label: 'Kontrak' },
          { value: 'part-time', label: 'Part-time' },
          { value: 'internship', label: 'Magang' },
          { value: 'trainee', label: 'Management trainee' },
        ],
      },
      { name: 'applyEmail', label: 'Email lamaran', type: 'email' },
      { name: 'applyUrl', label: 'Link formulir lamaran', type: 'url' },
      { name: 'coverImage', label: 'Gambar sampul', type: 'image' },
      { name: 'galleryImg', label: 'Gambar halaman detail', type: 'image' },
    ],
    translationFields: [
      { name: 'detail', label: 'Sub judul / divisi', type: 'text' },
      { name: 'excerpt', label: 'Ringkasan', type: 'textarea' },
      { name: 'content', label: 'Kualifikasi & detail', type: 'markdown' },
      ...seo,
    ],
  },
};
