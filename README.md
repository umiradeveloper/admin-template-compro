# Umira CMS — Admin Panel (React + Vite + Tailwind)

Panduan lengkap: lihat `../CMS-README.md`.

```bash
cp .env.example .env     # VITE_API_URL = URL backend, VITE_SITE_URL = URL website
npm install
npm run dev              # http://localhost:5173
npm run build            # hasil di dist/ (static, sajikan dengan Nginx — lihat nginx.conf)
```

## Struktur
```
src/
├── lib/            api (axios + token), auth context, tipe, util
├── components/     ui dasar, Layout (sidebar), MediaLibrary (picker & upload),
│                   MarkdownEditor, SchemaForm (form otomatis dari skema), field gambar/galeri/tag
└── pages/
    ├── content/    daftar & editor generik untuk Blog, Proyek, Karir (contentTypes.ts)
    ├── Collections, CollectionItems   konten halaman
    ├── SiteTexts, Settings, MediaPage, Inquiries, Users, ActivityLogs, Profile, Dashboard, Login
```
Pintasan: **Ctrl/Cmd + S** menyimpan di editor konten.
