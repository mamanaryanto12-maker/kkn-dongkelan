# Website KKN Dongkelan Asoy

Website resmi kelompok **KKN Dongkelan Asoy — Universitas Negeri Yogyakarta**.
Proyek ini terdiri dari dua bagian dalam satu aplikasi:

- **Situs publik** — profil kelompok, anggota, program kerja, agenda kegiatan, dokumentasi, dan kontak.
- **CMS (Content Management System)** — panel admin untuk mengelola seluruh konten di atas.

Dibangun dengan Node.js + Express + EJS dan basis data SQLite bawaan Node (`node:sqlite`),
sehingga **tanpa ketergantungan native** dan mudah dijalankan di mana saja.

---

## 1. Prasyarat

- **Node.js ≥ 22.5** (dibutuhkan untuk modul `node:sqlite`). Disarankan Node 22 LTS atau lebih baru.
- npm (sudah termasuk bersama Node.js).

Cek versi:

```bash
node -v
npm -v
```

---

## 2. Menjalankan Proyek

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan server
npm start
```

Server berjalan di:

- Situs publik: <http://localhost:3000/>
- CMS: <http://localhost:3000/admin>

Saat pertama kali dijalankan, basis data dibuat otomatis dan diisi data awal
(anggota, program kerja, agenda, dokumentasi, pengaturan situs).

### Akun administrator

Akun admin dibuat otomatis pada saat pertama kali server dijalankan:

- **Nama pengguna**: `admin` (atau nilai `ADMIN_USERNAME`).
- **Kata sandi**: dicetak di terminal saat startup dan disimpan sementara di
  `data/initial-admin.txt`. Segera ubah melalui menu **Akun** setelah masuk.

Untuk menentukan sendiri, setel variabel lingkungan `ADMIN_USERNAME` dan `ADMIN_PASSWORD`
sebelum menjalankan server.

---

## 3. Skrip npm

| Perintah | Keterangan |
| --- | --- |
| `npm start` | Menjalankan server produksi. |
| `npm run dev` | Menjalankan server dengan auto-reload (`node --watch`). |
| `npm run seed` | Mengisi ulang data awal (aman dijalankan berulang). |
| `npm run reset` | Menghapus data konten lalu mengisi ulang data awal. Akun & pengaturan dipertahankan. |

---

## 4. Variabel Lingkungan

Lihat `.env.example`. Variabel dibaca langsung dari lingkungan proses
(tidak memakai `dotenv`), jadi setel melalui shell atau environment host.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP server. |
| `HOST` | `0.0.0.0` | Alamat bind server. |
| `SESSION_SECRET` | otomatis | Kunci enkripsi sesi. Bila kosong, dibuat acak dan disimpan di `data/session-secret.txt`. |
| `ADMIN_USERNAME` | `admin` | Nama pengguna admin awal. |
| `ADMIN_PASSWORD` | acak | Kata sandi admin awal. |
| `NODE_ENV` | `development` | Setel `production` untuk cookie sesi `secure`. |
| `FORCE_HTTP` | `0` | Setel `1` bila production tanpa HTTPS (di balik proxy). |
| `DATA_DIR` | `./data` | Folder database SQLite & berkas sesi. Arahkan ke disk permanen saat deploy. |
| `UPLOAD_DIR` | `./public/uploads` | Folder foto unggahan (mode penyimpanan lokal). |
| `ASSET_VERSION` | waktu mulai | Versi cache-busting CSS/JS. |
| `TURSO_DATABASE_URL` | – | URL database Turso (libSQL). Bila diisi, aplikasi memakai Turso, bukan SQLite lokal. |
| `TURSO_AUTH_TOKEN` | – | Token akses Turso. |
| `CLOUDINARY_CLOUD_NAME` | – | Nama cloud Cloudinary. Bila diisi (bersama key & secret), gambar diunggah ke Cloudinary. |
| `CLOUDINARY_API_KEY` | – | API key Cloudinary. |
| `CLOUDINARY_API_SECRET` | – | API secret Cloudinary. |
| `CLOUDINARY_FOLDER` | `kkn-dongkelan` | Folder penyimpanan gambar di Cloudinary. |

Contoh (PowerShell):

```powershell
$env:PORT=3000; $env:ADMIN_PASSWORD='rahasia-kuat'; npm start
```

---

## 5. Struktur Proyek

```
website-kkn/
├─ server.js                 # Entry point: Express, sesi, CSRF, rute, error handler
├─ api/index.js              # Entry point serverless untuk Vercel
├─ vercel.json               # Konfigurasi deploy Vercel
├─ Dockerfile                # Image produksi (untuk Render/Railway/Fly.io)
├─ render.yaml               # Blueprint deploy Render + disk permanen
├─ .dockerignore
├─ src/
│  ├─ config.js              # Jalur DATA_DIR & UPLOAD_DIR (dapat dikonfigurasi)
│  ├─ db.js                  # DB async: Turso (libSQL) atau SQLite lokal
│  ├─ seed.js                # Data awal (anggota, program, agenda, dokumentasi, pengaturan)
│  ├─ utils.js               # Helper format tanggal, avatar, status, dsb.
│  ├─ middleware/
│  │  ├─ auth.js             # requireAuth, CSRF, security headers, rate limit login
│  │  └─ upload.js           # Unggah gambar (Cloudinary atau disk lokal)
│  └─ routes/
│     ├─ public.routes.js    # Halaman publik
│     ├─ auth.routes.js      # Login / logout
│     └─ admin.routes.js     # Seluruh CRUD CMS
├─ views/
│  ├─ partials/              # Layout publik (header, footer, avatar)
│  ├─ public/                # 9 halaman publik
│  └─ admin/                 # Halaman CMS
├─ public/
│  ├─ css/                   # style.css (publik) & admin.css (CMS)
│  ├─ js/                    # main.js (publik), admin.js (CMS)
│  ├─ img/                   # Logo, foto, peta topografi, kartu anggota
│  └─ uploads/               # Berkas unggahan (dibuat otomatis)
└─ data/                     # Basis data SQLite & berkas runtime (tidak masuk git)
```

---

## 6. Fitur CMS

| Menu | Fungsi |
| --- | --- |
| **Dasbor** | Ringkasan jumlah anggota/program/agenda/dokumentasi, agenda terdekat, dokumentasi terbaru. |
| **Anggota** | Tambah/ubah/hapus anggota, unggah foto, atur urutan tampil. |
| **Program Kerja** | Kelola program kelompok & individu beserta status pelaksanaan. |
| **Agenda Kegiatan** | Kelola agenda/jadwal kegiatan internal (tanggal tidak ditampilkan di situs publik). |
| **Dokumentasi** | Unggah galeri foto kegiatan dengan keterangan dan kategori. |
| **Konten Halaman** | Sunting teks beranda, profil, kontak, dan footer pada situs publik. |
| **Akun** | Ubah nama tampilan dan kata sandi administrator. |

---

## 7. Keamanan

- Kata sandi admin di-hash dengan **bcrypt**.
- **CSRF protection** pada seluruh permintaan POST (token via body, query untuk form unggah, atau header `x-csrf-token`).
- Sesi berbasis **cookie bertanda tangan** (`httpOnly`, `sameSite=lax`, dan `secure` saat production) — aman untuk serverless karena tidak bergantung pada penyimpanan server.
- **Rate limit** percobaan login (maks. 8 kali per 10 menit per IP).
- Header keamanan dasar (CSP ringan, `X-Frame-Options`, `X-Content-Type-Options`, dsb).
- Unggahan dibatasi berkas gambar (jpeg/png/webp/gif) maksimal **6 MB** dengan nama berkas yang diamankan.

> **Catatan produksi:** di serverless, setel `SESSION_SECRET` agar cookie sesi tetap sah
> di semua instance. Tanpa itu, sesi dibuat acak per instance.

---

## 8. Data

Data awal berasal dari berkas kelompok KKN (matriks program, data peserta, kartu anggota,
logo, foto bersama, dan palet warna). Seluruh isi dapat diubah kapan saja melalui CMS.

Secara default basis data tersimpan di `data/kkn.sqlite` (mode lokal). Bila
`TURSO_DATABASE_URL` diisi, data tersimpan di **Turso** (cloud). Untuk
mengembalikan data awal:

```bash
npm run reset
```

> Pada mode Turso, jalankan `npm run reset` dengan variabel `TURSO_*` diisi agar
> reset mengenai database cloud.

---

## 9. Deploy

Ada dua cara. Pilih sesuai jenis host:

| Cara | Cocok untuk | Yang dibutuhkan |
| --- | --- | --- |
| **A. Serverless (gratis)** | **Vercel** | Turso (DB) + Cloudinary (gambar) — keduanya gratis |
| **B. Disk tetap** | Render / Railway / Fly / VPS | Disk permanen (umumnya berbayar) |

Aplikasi otomatis mendeteksi mode: bila `TURSO_DATABASE_URL` & `CLOUDINARY_*`
diisi → mode serverless; bila tidak → mode disk lokal.

---

### Cara A — Vercel + Turso + Cloudinary (gratis)

**1. Siapkan Turso (database)**
1. Daftar gratis di <https://turso.tech>, pasang CLI:
   ```bash
   npm i -g @turso/cli    # atau: brew install tursodatabase/tap/turso
   turso auth login
   turso db create kkn-dongkelan
   turso db show kkn-dongkelan --url          # → TURSO_DATABASE_URL
   turso db tokens create kkn-dongkelan       # → TURSO_AUTH_TOKEN
   ```

**2. Siapkan Cloudinary (gambar)**
1. Daftar gratis di <https://cloudinary.com>.
2. Buka **Dashboard**, salin `Cloud name`, `API Key`, `API Secret`.

**3. Deploy ke Vercel**
1. Push ke GitHub (lihat bagian bawah).
2. Di <https://vercel.com>: **Add New → Project**, impor repositori.
   Vercel membaca `vercel.json` (fungsi di `api/index.js`).
3. Tambahkan **Environment Variables**:
   ```
   TURSO_DATABASE_URL   = libsql://kkn-dongkelan-<akun>.turso.io
   TURSO_AUTH_TOKEN     = <token turso>
   CLOUDINARY_CLOUD_NAME= <cloud name>
   CLOUDINARY_API_KEY   = <api key>
   CLOUDINARY_API_SECRET= <api secret>
   SESSION_SECRET       = <string acak 32+ karakter>
   ADMIN_USERNAME       = admin
   ADMIN_PASSWORD       = <kata sandi admin pilihan Anda>
   NODE_ENV             = production
   ```
4. **Deploy**. Situs aktif di `https://<nama>.vercel.app`, CMS di `/admin`.

> Saat pertama diakses, aplikasi otomatis membuat tabel + mengisi data awal ke
> Turso dan membuat akun admin memakai `ADMIN_PASSWORD`.

---

### Cara B — Host dengan disk permanen

**Render (blueprint siap pakai)**

1. Push proyek ini ke GitHub.
2. Di Render: **New → Blueprint**, pilih repositori. Render membaca `render.yaml`
   dan menyiapkan Web Service (Docker) + disk permanen `1 GB` di `/var/data`.
3. Isi `ADMIN_PASSWORD` saat diminta; `SESSION_SECRET` dibuat otomatis.
4. Deploy. Aktif di `https://<nama>.onrender.com`.

> Catatan: disk permanen Render tersedia pada paket berbayar (Starter ke atas).

**Railway / Fly.io** — sama, memakai `Dockerfile` + volume disk:

- **Railway** — Deploy from repo, tambahkan **Volume** dengan mount `/var/data`.
  Env: `DATA_DIR=/var/data`, `UPLOAD_DIR=/var/data/uploads`, `SESSION_SECRET`,
  `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NODE_ENV=production`.
- **Fly.io** — `fly launch` (pakai Dockerfile), `fly volumes create kkn_data --size 1`,
  mount ke `/var/data`, lalu `fly deploy`.

**Docker lokal**
```bash
docker build -t kkn-dongkelan .
docker run -p 3000:3000 -e DATA_DIR=/var/data -e UPLOAD_DIR=/var/data/uploads \
  -e SESSION_SECRET=ubah-ini -e ADMIN_PASSWORD=rahasia-kuat -v kkn_data:/var/data \
  kkn-dongkelan
```

### Push ke GitHub

```bash
git init
git add .
git commit -m "Website KKN Dongkelan Asoy"
git branch -M main
git remote add origin https://github.com/<akun>/<repo>.git
git push -u origin main
```

`.gitignore` sudah mengecualikan database, unggahan, dan berkas rahasia,
sehingga tidak ada data sensitif yang ikut terunggah.
