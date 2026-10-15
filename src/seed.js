'use strict';

/**
 * Seed data awal proyek website KKN Dongkelan Asoy.
 *
 * Sumber data:
 *  - DATA PESERTA KKN (nama, NIM, program studi, jabatan)
 *  - MATRIKS_KELOMPOK (program kerja, kategori, dan sebaran minggu pelaksanaan)
 *  - Dokumen identitas visual (logo, color palette, foto bersama, kartu peserta)
 *
 * Catatan: tanggal agenda diturunkan dari sebaran minggu pada matriks KKN.
 * Minggu ke-1 dipetakan mulai Senin, 12 Oktober 2026 (periode 12 Okt - 14 Des 2026).
 * Tanggal ini dapat diubah sepenuhnya melalui CMS.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { all, get, run, transaction, init } = require('./db');
const { DATA_DIR } = require('./config');

const WEEKS = {
  1: ['2026-10-12', '2026-10-18'],
  2: ['2026-10-19', '2026-10-25'],
  3: ['2026-10-26', '2026-11-01'],
  4: ['2026-11-02', '2026-11-08'],
  5: ['2026-11-09', '2026-11-15'],
  6: ['2026-11-16', '2026-11-22'],
  7: ['2026-11-23', '2026-11-29'],
  8: ['2026-11-30', '2026-12-06'],
  9: ['2026-12-07', '2026-12-13'],
};

const MEMBERS = [
  { name: 'Maman Kironi Aryanto', nim: '23010530065', prodi: 'Teknologi Pendidikan', jabatan: 'Ketua', urutan: 1 },
  { name: 'Az Zahra Brilliant Qutrun Nada', nim: '23050530067', prodi: 'Pendidikan Teknik Informatika', jabatan: 'Bendahara', urutan: 2 },
  { name: 'Dirta Dwi Febriyanti', nim: '23050330093', prodi: 'Pendidikan Teknik Elektro', jabatan: 'Sekretaris', urutan: 3 },
  { name: 'Haura Dzakiyyah Nidaulhaq', nim: '23050530053', prodi: 'Pendidikan Teknik Informatika', jabatan: 'PDD', urutan: 4 },
  { name: "Rafi' Salman Sayyid", nim: '23050530057', prodi: 'Pendidikan Teknik Informatika', jabatan: 'PDD', urutan: 5 },
  { name: 'Ameylia Dwi Astuti', nim: '23050330102', prodi: 'Pendidikan Teknik Elektro', jabatan: 'Logistik', urutan: 6 },
  { name: 'M. Ilham Afriza Rahman', nim: '23040330084', prodi: 'Pendidikan Sejarah', jabatan: 'Logistik', urutan: 7 },
  { name: 'Ardelia Reza Maheswari', nim: '23050330003', prodi: 'Pendidikan Teknik Elektro', jabatan: 'Humas', urutan: 8 },
  { name: 'Rais Amani', nim: '23040330106', prodi: 'Pendidikan Sejarah', jabatan: 'Humas', urutan: 9 },
];

// Program kerja hasil pembacaan matriks KKN.
// tipe: "Kelompok" (Utama / Penunjang) atau "Individu"
const PROGRAMS = [
  // ===== PROGRAM KELOMPOK - A. UTAMA =====
  { nama: 'Smart Loka: Pembuatan Papan Peta Padukuhan Dongkelan', tipe: 'Kelompok', kategori: 'Kegiatan Teknologi Informasi dan Pemetaan', deskripsi: 'Pembuatan dan pemasangan papan peta padukuhan sebagai media informasi wilayah Dusun Dongkelan.', sasaran: 'Warga Padukuhan Dongkelan', lokasi: 'Padukuhan Dongkelan', status: 'Rencana', weekStart: 3, weekEnd: 7, urutan: 1 },
  { nama: 'Workshop Pengelolaan Sampah Menjadi Prakarya', tipe: 'Kelompok', kategori: 'Kegiatan Pengelolaan Sampah', deskripsi: 'Pelatihan pengolahan sampah rumah tangga menjadi produk prakarya bernilai guna.', sasaran: 'Ibu-ibu PKK dan pemuda', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', urutan: 2 },
  { nama: 'Pembuatan Biopori', tipe: 'Kelompok', kategori: 'Kegiatan Pengelolaan Sampah', deskripsi: 'Pembuatan lubang resapan biopori untuk meningkatkan daya serap air tanah.', sasaran: 'Warga Dusun Dongkelan', lokasi: 'Lingkungan Dusun Dongkelan', status: 'Rencana', weekStart: 2, weekEnd: 2, urutan: 3 },

  // ===== PROGRAM KELOMPOK - B. PENUNJANG =====
  { nama: 'Penerjunan KKN', tipe: 'Kelompok', kategori: 'Persiapan Kuliah Kerja Nyata', deskripsi: 'Penerjunan mahasiswa KKN ke lokasi pengabdian oleh pihak universitas dan pemerintah setempat.', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 1, urutan: 4 },
  { nama: 'Bersih-bersih Posko', tipe: 'Kelompok', kategori: 'Persiapan Kuliah Kerja Nyata', deskripsi: 'Kegiatan membersihkan dan menata posko KKN sebagai tempat tinggal dan pusat kegiatan.', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 1, urutan: 5 },
  { nama: 'Pertemuan dengan LPM dan Karang Taruna', tipe: 'Kelompok', kategori: 'Persiapan Kuliah Kerja Nyata', deskripsi: 'Koordinasi awal dengan Lembaga Pemberdayaan Masyarakat dan Karang Taruna setempat.', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 1, urutan: 6 },
  { nama: 'Persiapan Kegiatan Sosialisasi Program Kerja', tipe: 'Kelompok', kategori: 'Sosialisasi Program Kerja Ke Masyarakat', deskripsi: 'Persiapan materi dan perlengkapan sosialisasi program kerja kepada masyarakat.', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 1, urutan: 7 },
  { nama: 'Pelaksanaan Sosialisasi Program Kerja', tipe: 'Kelompok', kategori: 'Sosialisasi Program Kerja Ke Masyarakat', deskripsi: 'Pemaparan program kerja KKN kepada warga dan perangkat padukuhan.', sasaran: 'Warga dan perangkat dusun', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 1, urutan: 8 },
  { nama: 'Pelaksanaan Kegiatan Sosialisasi', tipe: 'Kelompok', kategori: 'Sosialisasi Program Kerja Ke Masyarakat', deskripsi: 'Pelaksanaan rangkaian kegiatan sosialisasi kepada masyarakat.', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 1, urutan: 9 },
  { nama: 'Evaluasi Kegiatan', tipe: 'Kelompok', kategori: 'Sosialisasi Program Kerja Ke Masyarakat', deskripsi: 'Evaluasi berkala terhadap pelaksanaan seluruh program kerja kelompok.', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 9, urutan: 10 },
  { nama: 'Kegiatan TPA', tipe: 'Kelompok', kategori: 'Kegiatan Pembelajaran dan Keagamaan', deskripsi: 'Pendampingan Taman Pendidikan Al-Qur\'an bagi anak-anak dusun.', sasaran: 'Anak-anak dusun', lokasi: 'Masjid/Musholla Dusun Dongkelan', status: 'Rencana', weekStart: 2, weekEnd: 9, urutan: 11 },
  { nama: 'Bimbingan Belajar', tipe: 'Kelompok', kategori: 'Kegiatan Pembelajaran dan Keagamaan', deskripsi: 'Pendampingan belajar bagi siswa sekolah dasar di lingkungan dusun.', sasaran: 'Siswa SD', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 2, weekEnd: 9, urutan: 12 },
  { nama: 'Penanaman Tanaman Obat Keluarga (TOGA)', tipe: 'Kelompok', kategori: 'Kegiatan Lingkungan', deskripsi: 'Penanaman dan pengenalan tanaman obat keluarga di lingkungan warga.', sasaran: 'Warga dusun', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 5, weekEnd: 5, urutan: 13 },
  { nama: 'Pembuatan Ecoenzym', tipe: 'Kelompok', kategori: 'Kegiatan Lingkungan', deskripsi: 'Pelatihan pembuatan ecoenzym dari limbah organik rumah tangga.', sasaran: 'Warga dusun', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', weekStart: 4, weekEnd: 4, urutan: 14 },
  { nama: 'Pembuatan Keychain dari Limbah Tutup Botol', tipe: 'Kelompok', kategori: 'Kegiatan Lingkungan', deskripsi: 'Pelatihan daur ulang tutup botol menjadi produk kerajinan keychain.', sasaran: 'Pemuda dan anak-anak', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', weekStart: 3, weekEnd: 3, urutan: 15 },
  { nama: 'Pembuatan Ecoprint', tipe: 'Kelompok', kategori: 'Kegiatan Kreatifitas dan Keterampilan', deskripsi: 'Pelatihan teknik ecoprint pada kain dengan pewarna alami.', sasaran: 'Ibu-ibu PKK', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', weekStart: 5, weekEnd: 5, urutan: 16 },
  { nama: 'Pembuatan Kain Sibori', tipe: 'Kelompok', kategori: 'Kegiatan Kreatifitas dan Keterampilan', deskripsi: 'Pelatihan pembuatan kain dengan teknik shibori.', sasaran: 'Ibu-ibu PKK', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', weekStart: 6, weekEnd: 6, urutan: 17 },
  { nama: 'Senam Bersama', tipe: 'Kelompok', kategori: 'Kegiatan Kesehatan dan Kebugaran', deskripsi: 'Kegiatan senam pagi bersama warga untuk menjaga kebugaran.', sasaran: 'Warga dusun', lokasi: 'Halaman Dusun Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 4, urutan: 18 },
  { nama: 'Budidaya Ikan Lele dalam Galon', tipe: 'Kelompok', kategori: 'Kegiatan Pemberdayaan dan Ketahanan Pangan', deskripsi: 'Pelatihan budidaya ikan lele menggunakan media galon untuk ketahanan pangan keluarga.', sasaran: 'Warga dusun', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 6, weekEnd: 6, urutan: 19 },
  { nama: 'Pembuatan Karcis Parkir Sunmor', tipe: 'Kelompok', kategori: 'Kegiatan Administrasi dan Pendukung Acara', deskripsi: 'Pembuatan karcis parkir untuk mendukung kegiatan pasar minggu (Sunmor).', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 1, weekEnd: 1, urutan: 20 },

  // ===== PROGRAM INDIVIDU =====
  { nama: 'Sosialisasi Literasi Digital, Waspada Hoaks & Link Berbahaya', tipe: 'Individu', kategori: 'Pendidikan dan Literasi Digital', deskripsi: 'Edukasi literasi digital kepada warga mengenai bahaya hoaks dan tautan berbahaya.', sasaran: 'Warga dusun', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 4, weekEnd: 4, urutan: 21 },
  { nama: 'Sosialisasi Microsoft Word', tipe: 'Individu', kategori: 'Pendidikan dan Literasi Digital', deskripsi: 'Pelatihan dasar penggunaan Microsoft Word.', sasaran: 'Warga dan pemuda', lokasi: 'Posko KKN Dongkelan', status: 'Rencana', urutan: 22 },
  { nama: 'Bimbingan Belajar Berbasis Proyek', tipe: 'Individu', kategori: 'Pendidikan dan Literasi Digital', deskripsi: 'Bimbingan belajar dengan metode pembelajaran berbasis proyek.', sasaran: 'Siswa sekolah', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 2, weekEnd: 2, urutan: 23 },
  { nama: 'TPA Berbasis Interaktif', tipe: 'Individu', kategori: 'Pendidikan dan Keagamaan', deskripsi: 'Kegiatan TPA dengan metode pembelajaran interaktif.', sasaran: 'Anak-anak dusun', lokasi: 'Masjid/Musholla Dusun Dongkelan', status: 'Rencana', urutan: 24 },
  { nama: 'Pengenalan Tokoh Pahlawan', tipe: 'Individu', kategori: 'Pendidikan Sejarah', deskripsi: 'Pengenalan tokoh-tokoh pahlawan nasional kepada anak-anak.', sasaran: 'Anak-anak sekolah', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 2, weekEnd: 3, urutan: 25 },
  { nama: 'Puzzle Tokoh Sejarah', tipe: 'Individu', kategori: 'Pendidikan Sejarah', deskripsi: 'Media pembelajaran puzzle untuk mengenalkan tokoh sejarah.', sasaran: 'Anak-anak sekolah', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 4, weekEnd: 4, urutan: 26 },
  { nama: 'Jejak Sejarah Dongkelan', tipe: 'Individu', kategori: 'Pendidikan Sejarah', deskripsi: 'Penelusuran dan pendokumentasian jejak sejarah Dusun Dongkelan.', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 3, weekEnd: 3, urutan: 27 },
  { nama: 'Workshop Praktikum Dasar di SD', tipe: 'Individu', kategori: 'Pendidikan dan Praktik Kelistrikan', deskripsi: 'Workshop praktikum dasar kelistrikan untuk siswa sekolah dasar.', sasaran: 'Siswa SD', lokasi: 'SD di Dusun Dongkelan', status: 'Rencana', weekStart: 3, weekEnd: 3, urutan: 28 },
  { nama: 'Pembuatan Maps UMKM', tipe: 'Individu', kategori: 'Pemberdayaan dan Digitalisasi UMKM', deskripsi: 'Pemetaan digital lokasi UMKM warga berbasis peta daring.', sasaran: 'Pelaku UMKM', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 4, weekEnd: 5, urutan: 29 },
  { nama: 'Pembuatan QRIS UMKM', tipe: 'Individu', kategori: 'Pemberdayaan dan Digitalisasi UMKM', deskripsi: 'Pendampingan pembuatan QRIS untuk pembayaran digital UMKM.', sasaran: 'Pelaku UMKM', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 4, weekEnd: 5, urutan: 30 },
  { nama: 'Pembuatan Banner UMKM', tipe: 'Individu', kategori: 'Pemberdayaan dan Digitalisasi UMKM', deskripsi: 'Pembuatan banner promosi untuk pelaku UMKM.', sasaran: 'Pelaku UMKM', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 4, weekEnd: 6, urutan: 31 },
  { nama: 'Sosialisasi Keselamatan dan Kesehatan Kerja', tipe: 'Individu', kategori: 'Keselamatan dan Kesehatan Kerja (K3)', deskripsi: 'Sosialisasi penerapan K3 bagi warga.', sasaran: 'Warga dusun', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 4, weekEnd: 4, urutan: 32 },
  { nama: 'Edukasi K3 Peralatan Rumah Tangga', tipe: 'Individu', kategori: 'Keselamatan dan Kesehatan Kerja (K3)', deskripsi: 'Edukasi keselamatan penggunaan peralatan rumah tangga.', sasaran: 'Ibu-ibu rumah tangga', lokasi: 'Dusun Dongkelan', status: 'Rencana', weekStart: 5, weekEnd: 5, urutan: 33 },
  { nama: 'Pemasangan Reflektor', tipe: 'Individu', kategori: 'Teknologi dan Infrastruktur Lingkungan', deskripsi: 'Pemasangan reflektor untuk penerangan jalan lingkungan.', lokasi: 'Jalan Dusun Dongkelan', status: 'Rencana', urutan: 34 },
  { nama: 'Penggantian Lampu Jalan Menjadi Otomatis', tipe: 'Individu', kategori: 'Teknologi dan Infrastruktur Lingkungan', deskripsi: 'Penggantian lampu jalan dengan sistem otomatis berbasis sensor.', lokasi: 'Jalan Dusun Dongkelan', status: 'Rencana', weekStart: 7, weekEnd: 7, urutan: 35 },
  { nama: 'Pemasangan Lampu Jalan', tipe: 'Individu', kategori: 'Teknologi dan Infrastruktur Lingkungan', deskripsi: 'Pemasangan lampu jalan untuk meningkatkan keamanan lingkungan.', lokasi: 'Jalan Dusun Dongkelan', status: 'Rencana', urutan: 36 },
];

const SETTINGS = {
  site_name: 'KKN Dongkelan Nalarasa',
  site_short: 'Dongkelan Nalarasa',
  universitas: 'Universitas Negeri Yogyakarta',
  unit: 'Unit KKN, Praktik Kependidikan, Praktik Industri, dan Magang Universitas Negeri Yogyakarta',
  tagline: 'Kolaborasi dan pengabdian di Padukuhan Dongkelan',
  lokasi: 'Dusun Dongkelan, Sidorejo, Kecamatan Godean, Kabupaten Sleman, Daerah Istimewa Yogyakarta',
  lokasi_singkat: 'Dongkelan, Sidorejo, Godean, Sleman',
  periode: '12 Oktober - 14 Desember 2026',
  maps_query: 'Dusun Dongkelan Sidorejo Godean Sleman',
  hero_eyebrow: 'Kuliah Kerja Nyata - Universitas Negeri Yogyakarta',
  hero_title: 'Menumbuhkan Dusun Dongkelan Bersama Warga',
  hero_desc: 'Website resmi kegiatan KKN Kelompok Dongkelan Asoy: profil kelompok, program kerja, agenda kegiatan, dan dokumentasi pengabdian di Padukuhan Dongkelan, Sidorejo, Godean, Sleman.',
  about_latar: 'Kuliah Kerja Nyata (KKN) merupakan mata kuliah pengabdian kepada masyarakat yang dilaksanakan mahasiswa Universitas Negeri Yogyakarta. Kegiatan ini menjadi ruang bagi mahasiswa untuk belajar bersama masyarakat, menerapkan ilmu yang dipelajari, serta turut mendukung pembangunan di tingkat padukuhan.\n\nMelalui KKN di Dusun Dongkelan, kelompok Dongkelan Asoy berupaya menghadirkan program yang relevan dengan kebutuhan warga, mulai dari pendidikan, lingkungan, kesehatan, pemberdayaan ekonomi, hingga pemanfaatan teknologi informasi.',
  about_tujuan: 'Menerapkan ilmu dan keterampilan mahasiswa untuk membantu memecahkan permasalahan yang dihadapi masyarakat.\nMembantu memberdayakan masyarakat melalui program kerja yang berkelanjutan.\nMengembangkan kepribadian, kemandirian, dan kepedulian sosial mahasiswa.\nMeningkatkan kerja sama antara perguruan tinggi dengan masyarakat dan pemerintah padukuhan.',
  about_sasaran: 'Warga Padukuhan Dongkelan, termasuk anak-anak, remaja, ibu-ibu PKK, dan pelaku UMKM.',
  about_kelompok: 'Kelompok KKN Dongkelan Nalarasa terdiri atas sembilan mahasiswa dari berbagai program studi di Universitas Negeri Yogyakarta. Nama "Nalarasa" mencerminkan semangat kebersamaan dan keceriaan kelompok dalam menjalani pengabdian bersama warga Dusun Dongkelan.',
  kontak_email: 'kkndongkelan@gmail.com',
  kontak_whatsapp: '6283866064905',
  kontak_instagram: 'kkn.dongkelan',
  footer_text: 'Dibangun sebagai dokumentasi dan sarana informasi kegiatan KKN di Padukuhan Dongkelan, Sidorejo, Godean, Sleman.',
  logo: '/img/logo.png',
};

async function ensureAdmin() {
  const existing = await get('SELECT COUNT(*) AS c FROM users');
  if (existing && existing.c > 0) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = 'KKN-' + crypto.randomBytes(4).toString('hex');
    generated = true;
  }
  const hash = bcrypt.hashSync(password, 12);
  await run('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)', [username, hash, 'Administrator KKN', 'admin']);
  console.log('\n================ AKUN ADMINISTRATOR AWAL ================');
  console.log(`  Username : ${username}`);
  console.log(`  Password : ${password}${generated ? '  (dibuat otomatis)' : ''}`);
  console.log('  Ganti kata sandi melalui menu Akun setelah masuk CMS.');
  console.log('=========================================================\n');
  try {
    const outFile = path.join(DATA_DIR, 'initial-admin.txt');
    fs.writeFileSync(outFile, `Username: ${username}\nPassword: ${password}\n\nHapus berkas ini setelah Anda mengganti kata sandi melalui CMS.\n`);
    console.log(`  Info kredensial juga disimpan sementara di: ${outFile}\n`);
  } catch (_) { /* diabaikan (fs read-only di serverless) */ }
}

async function seedMembers() {
  if ((await get('SELECT COUNT(*) AS c FROM members')).c > 0) return;
  for (const m of MEMBERS) {
    await run('INSERT INTO members (name, nim, prodi, fakultas, jabatan, foto, bio, urutan) VALUES (?,?,?,?,?,?,?,?)',
      [m.name, m.nim, m.prodi, m.fakultas || '', m.jabatan, '', '', m.urutan]);
  }
}

async function seedPrograms() {
  if ((await get('SELECT COUNT(*) AS c FROM programs')).c > 0) return;
  for (const p of PROGRAMS) {
    await run(`INSERT INTO programs (nama, tipe, kategori, deskripsi, tujuan, sasaran, lokasi, penanggung_jawab, status, urutan)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [p.nama, p.tipe, p.kategori, p.deskripsi || '', p.tujuan || '', p.sasaran || '', p.lokasi || '', p.penanggung_jawab || '', p.status || 'Rencana', p.urutan]);
    const row = await get('SELECT id FROM programs WHERE nama = ? ORDER BY id DESC LIMIT 1', [p.nama]);
    if (row && p.weekStart) {
      const start = WEEKS[p.weekStart] ? WEEKS[p.weekStart][0] : '';
      const end = WEEKS[p.weekEnd || p.weekStart] ? WEEKS[p.weekEnd || p.weekStart][1] : start;
      await run(`INSERT INTO agendas (judul, program_id, tanggal_mulai, tanggal_selesai, waktu, lokasi, kategori, deskripsi, status)
           VALUES (?,?,?,?,?,?,?,?,?)`,
        [p.nama, row.id, start, end, '', p.lokasi || '', p.tipe === 'Individu' ? 'Program Individu' : 'Program Kelompok', p.deskripsi || '', p.status || 'Rencana']);
    }
  }
}

async function seedSettings() {
  for (const [key, value] of Object.entries(SETTINGS)) {
    await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING', [key, value]);
  }
}

async function seedGallery() {
  if ((await get('SELECT COUNT(*) AS c FROM gallery')).c > 0) return;
  await run('INSERT INTO gallery (judul, keterangan, file, tanggal, kegiatan, urutan) VALUES (?,?,?,?,?,?)',
    ['Foto Bersama Kelompok KKN Dongkelan Asoy', 'Kebersamaan kelompok KKN Dongkelan Asoy.', '/img/foto-bersama.jpg', '', 'Kebersamaan Kelompok', 1]);
  for (let i = 1; i <= 18; i++) {
    await run('INSERT INTO gallery (judul, keterangan, file, tanggal, kegiatan, urutan) VALUES (?,?,?,?,?,?)',
      [`Kartu Peserta KKN ${Math.ceil(i / 2)}`, 'Dokumen kartu identitas peserta KKN Dongkelan Asoy.', `/img/kartu/${i}.png`, '', 'Identitas Peserta', 10 + i]);
  }
}

async function main() {
  await init();
  const reset = process.argv.includes('--reset');
  if (reset) {
    await transaction(async () => {
      for (const t of ['gallery', 'agendas', 'programs', 'members']) await run(`DELETE FROM ${t}`);
    });
    console.log('Data konten direset (akun pengguna dan pengaturan dipertahankan).');
  }
  await transaction(async () => {
    await seedMembers();
    await seedPrograms();
    await seedSettings();
    await seedGallery();
  });
  await ensureAdmin();
  // Penanda agar cold start berikutnya cukup satu query (hemat di serverless).
  await run("INSERT INTO settings (key, value) VALUES ('_seed_done', '1') ON CONFLICT(key) DO UPDATE SET value = '1'");
  console.log('Seed selesai.');
  console.log(`  Anggota   : ${(await get('SELECT COUNT(*) AS c FROM members')).c}`);
  console.log(`  Program   : ${(await get('SELECT COUNT(*) AS c FROM programs')).c}`);
  console.log(`  Agenda    : ${(await get('SELECT COUNT(*) AS c FROM agendas')).c}`);
  console.log(`  Dokumentasi: ${(await get('SELECT COUNT(*) AS c FROM gallery')).c}`);
}

/**
 * Jalur cepat untuk serverless: bila penanda sudah ada, lewati seluruh proses
 * seed (hanya satu query). Jika tabel/penanda belum ada, jalankan seed penuh.
 */
async function ensureSeed() {
  try {
    const done = await get('SELECT value FROM settings WHERE key = ?', ['_seed_done']);
    if (done && done.value === '1') return false;
  } catch (_) {
    // Tabel belum ada (database baru) — lanjut ke seed penuh di bawah.
  }
  await main();
  return true;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[seed] gagal:', err);
    process.exitCode = 1;
  });
}

module.exports = { main, ensureSeed, MEMBERS, PROGRAMS, SETTINGS, WEEKS };
