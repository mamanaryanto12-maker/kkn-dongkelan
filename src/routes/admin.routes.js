'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { all, get, run } = require('../db');
const { upload, storeUpload, deleteUpload } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const { statusMeta, toISO, initials, avatarTone, formatTanggal, formatRentang } = require('../utils');

const router = express.Router();
router.use(requireAuth);

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function adminLocals(req, extra = {}) {
  return {
    nav: 'dashboard',
    currentPath: req.path,
    statusMeta,
    initials,
    avatarTone,
    formatTanggal,
    formatRentang,
    user: req.session.user,
    ...extra,
  };
}

// ---------- Dashboard ----------
router.get('/', async (req, res) => {
  const counts = {
    members: (await get('SELECT COUNT(*) AS c FROM members')).c,
    programs: (await get('SELECT COUNT(*) AS c FROM programs')).c,
    agendas: (await get('SELECT COUNT(*) AS c FROM agendas')).c,
    gallery: (await get('SELECT COUNT(*) AS c FROM gallery')).c,
  };
  const byTipe = await all('SELECT tipe, COUNT(*) AS c FROM programs GROUP BY tipe');
  const byStatus = await all('SELECT status, COUNT(*) AS c FROM programs GROUP BY status');
  const upcoming = await all('SELECT * FROM agendas WHERE tanggal_selesai >= ? ORDER BY tanggal_mulai ASC LIMIT 5', [toISO(new Date())]);
  const recentGallery = await all('SELECT * FROM gallery ORDER BY id DESC LIMIT 4');
  res.render('admin/dashboard', adminLocals(req, {
    title: 'Dasbor', nav: 'dashboard', currentPath: '/admin', counts, byTipe, byStatus, upcoming, recentGallery,
  }));
});

// ================= ANGGOTA =================
router.get('/anggota', async (req, res) => {
  const members = await all('SELECT * FROM members ORDER BY urutan ASC, name ASC');
  res.render('admin/members', adminLocals(req, { title: 'Kelola Anggota', nav: 'anggota', currentPath: '/admin/anggota', members }));
});

router.get('/anggota/baru', (req, res) => {
  res.render('admin/member-form', adminLocals(req, { title: 'Tambah Anggota', nav: 'anggota', currentPath: '/admin/anggota', member: null }));
});

router.post('/anggota', upload.single('foto'), async (req, res) => {
  const b = req.body;
  if (!b.name || !b.name.trim()) {
    flash(req, 'error', 'Nama anggota wajib diisi.');
    return res.redirect('/admin/anggota/baru');
  }
  const foto = req.file ? await storeUpload(req.file) : (b.foto_url || '');
  await run(`INSERT INTO members (name, nim, prodi, fakultas, jabatan, foto, bio, instagram, urutan)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    [b.name.trim(), b.nim || '', b.prodi || '', b.fakultas || '', b.jabatan || '', foto, b.bio || '', b.instagram || '', Number(b.urutan) || 0]);
  flash(req, 'success', 'Anggota berhasil ditambahkan.');
  res.redirect('/admin/anggota');
});

router.get('/anggota/:id/ubah', async (req, res, next) => {
  const member = await get('SELECT * FROM members WHERE id = ?', [Number(req.params.id)]);
  if (!member) return next();
  res.render('admin/member-form', adminLocals(req, { title: 'Ubah Anggota', nav: 'anggota', currentPath: '/admin/anggota', member }));
});

router.post('/anggota/:id', upload.single('foto'), async (req, res) => {
  const id = Number(req.params.id);
  const member = await get('SELECT * FROM members WHERE id = ?', [id]);
  if (!member) return res.status(404).render('admin/404', adminLocals(req, { title: 'Tidak ditemukan', nav: 'anggota' }));
  const b = req.body;
  let foto = member.foto;
  if (req.file) {
    await deleteUpload(member.foto);
    foto = await storeUpload(req.file);
  } else if (b.hapus_foto === '1') {
    await deleteUpload(member.foto);
    foto = '';
  } else if (b.foto_url) {
    foto = b.foto_url;
  }
  await run(`UPDATE members SET name=?, nim=?, prodi=?, fakultas=?, jabatan=?, foto=?, bio=?, instagram=?, urutan=?, updated_at=datetime('now')
       WHERE id=?`,
    [b.name.trim(), b.nim || '', b.prodi || '', b.fakultas || '', b.jabatan || '', foto, b.bio || '', b.instagram || '', Number(b.urutan) || 0, id]);
  flash(req, 'success', 'Data anggota berhasil diperbarui.');
  res.redirect('/admin/anggota');
});

router.post('/anggota/:id/hapus', async (req, res) => {
  const member = await get('SELECT * FROM members WHERE id = ?', [Number(req.params.id)]);
  if (member) {
    await deleteUpload(member.foto);
    await run('DELETE FROM members WHERE id = ?', [member.id]);
    flash(req, 'success', 'Anggota berhasil dihapus.');
  }
  res.redirect('/admin/anggota');
});

// ================= PROGRAM KERJA =================
router.get('/program', async (req, res) => {
  const programs = await all('SELECT * FROM programs ORDER BY urutan ASC, nama ASC');
  res.render('admin/programs', adminLocals(req, { title: 'Kelola Program Kerja', nav: 'program', currentPath: '/admin/program', programs }));
});

router.get('/program/baru', (req, res) => {
  res.render('admin/program-form', adminLocals(req, { title: 'Tambah Program Kerja', nav: 'program', currentPath: '/admin/program', program: null }));
});

function programPayload(b) {
  return [b.nama.trim(), b.tipe || 'Kelompok', b.kategori || '', b.deskripsi || '', b.tujuan || '', b.sasaran || '', b.lokasi || '', b.penanggung_jawab || '', b.status || 'Rencana', Number(b.urutan) || 0];
}

router.post('/program', async (req, res) => {
  const b = req.body;
  if (!b.nama || !b.nama.trim()) {
    flash(req, 'error', 'Nama program kerja wajib diisi.');
    return res.redirect('/admin/program/baru');
  }
  await run(`INSERT INTO programs (nama, tipe, kategori, deskripsi, tujuan, sasaran, lokasi, penanggung_jawab, status, urutan)
       VALUES (?,?,?,?,?,?,?,?,?,?)`, programPayload(b));
  flash(req, 'success', 'Program kerja berhasil ditambahkan.');
  res.redirect('/admin/program');
});

router.get('/program/:id/ubah', async (req, res, next) => {
  const program = await get('SELECT * FROM programs WHERE id = ?', [Number(req.params.id)]);
  if (!program) return next();
  res.render('admin/program-form', adminLocals(req, { title: 'Ubah Program Kerja', nav: 'program', currentPath: '/admin/program', program }));
});

router.post('/program/:id', async (req, res) => {
  const id = Number(req.params.id);
  const program = await get('SELECT * FROM programs WHERE id = ?', [id]);
  if (!program) return res.status(404).render('admin/404', adminLocals(req, { title: 'Tidak ditemukan', nav: 'program' }));
  const b = req.body;
  await run(`UPDATE programs SET nama=?, tipe=?, kategori=?, deskripsi=?, tujuan=?, sasaran=?, lokasi=?, penanggung_jawab=?, status=?, urutan=?, updated_at=datetime('now') WHERE id=?`,
    [...programPayload(b), id]);
  flash(req, 'success', 'Program kerja berhasil diperbarui.');
  res.redirect('/admin/program');
});

router.post('/program/:id/hapus', async (req, res) => {
  await run('DELETE FROM programs WHERE id = ?', [Number(req.params.id)]);
  flash(req, 'success', 'Program kerja berhasil dihapus.');
  res.redirect('/admin/program');
});

// ================= KALENDER / AGENDA =================
router.get('/agenda', async (req, res) => {
  const agendas = await all(`SELECT a.*, p.nama AS program_nama FROM agendas a
                       LEFT JOIN programs p ON p.id = a.program_id ORDER BY a.tanggal_mulai ASC`);
  const programs = await all('SELECT id, nama FROM programs ORDER BY nama ASC');
  res.render('admin/agendas', adminLocals(req, { title: 'Kelola Agenda', nav: 'agenda', currentPath: '/admin/agenda', agendas, programs }));
});

router.get('/agenda/baru', async (req, res) => {
  const programs = await all('SELECT id, nama FROM programs ORDER BY nama ASC');
  res.render('admin/agenda-form', adminLocals(req, { title: 'Tambah Agenda', nav: 'agenda', currentPath: '/admin/agenda', agenda: null, programs }));
});

function agendaPayload(b) {
  return [b.judul.trim(), b.program_id ? Number(b.program_id) : null, b.tanggal_mulai, (b.tanggal_selesai || b.tanggal_mulai), b.waktu || '', b.lokasi || '', b.kategori || 'Program Kelompok', b.deskripsi || '', b.status || 'Rencana'];
}

router.post('/agenda', async (req, res) => {
  const b = req.body;
  if (!b.judul || !b.judul.trim() || !b.tanggal_mulai) {
    flash(req, 'error', 'Judul dan tanggal mulai agenda wajib diisi.');
    return res.redirect('/admin/agenda/baru');
  }
  await run(`INSERT INTO agendas (judul, program_id, tanggal_mulai, tanggal_selesai, waktu, lokasi, kategori, deskripsi, status)
       VALUES (?,?,?,?,?,?,?,?,?)`, agendaPayload(b));
  flash(req, 'success', 'Agenda berhasil ditambahkan.');
  res.redirect('/admin/agenda');
});

router.get('/agenda/:id/ubah', async (req, res, next) => {
  const agenda = await get('SELECT * FROM agendas WHERE id = ?', [Number(req.params.id)]);
  if (!agenda) return next();
  const programs = await all('SELECT id, nama FROM programs ORDER BY nama ASC');
  res.render('admin/agenda-form', adminLocals(req, { title: 'Ubah Agenda', nav: 'agenda', currentPath: '/admin/agenda', agenda, programs }));
});

router.post('/agenda/:id', async (req, res) => {
  const id = Number(req.params.id);
  const agenda = await get('SELECT * FROM agendas WHERE id = ?', [id]);
  if (!agenda) return res.status(404).render('admin/404', adminLocals(req, { title: 'Tidak ditemukan', nav: 'agenda' }));
  const b = req.body;
  await run(`UPDATE agendas SET judul=?, program_id=?, tanggal_mulai=?, tanggal_selesai=?, waktu=?, lokasi=?, kategori=?, deskripsi=?, status=?, updated_at=datetime('now') WHERE id=?`,
    [...agendaPayload(b), id]);
  flash(req, 'success', 'Agenda berhasil diperbarui.');
  res.redirect('/admin/agenda');
});

router.post('/agenda/:id/hapus', async (req, res) => {
  await run('DELETE FROM agendas WHERE id = ?', [Number(req.params.id)]);
  flash(req, 'success', 'Agenda berhasil dihapus.');
  res.redirect('/admin/agenda');
});

// ================= DOKUMENTASI =================
router.get('/dokumentasi', async (req, res) => {
  const gallery = await all('SELECT * FROM gallery ORDER BY urutan ASC, id ASC');
  res.render('admin/gallery', adminLocals(req, { title: 'Kelola Dokumentasi', nav: 'dokumentasi', currentPath: '/admin/dokumentasi', gallery }));
});

router.get('/dokumentasi/baru', (req, res) => {
  res.render('admin/gallery-form', adminLocals(req, { title: 'Tambah Dokumentasi', nav: 'dokumentasi', currentPath: '/admin/dokumentasi', item: null }));
});

router.post('/dokumentasi', upload.single('file'), async (req, res) => {
  const b = req.body;
  const file = req.file ? await storeUpload(req.file) : (b.file_url || '');
  if (!b.judul || !b.judul.trim() || !file) {
    flash(req, 'error', 'Judul dan berkas gambar wajib diisi.');
    return res.redirect('/admin/dokumentasi/baru');
  }
  await run(`INSERT INTO gallery (judul, keterangan, file, tanggal, kegiatan, urutan) VALUES (?,?,?,?,?,?)`,
    [b.judul.trim(), b.keterangan || '', file, b.tanggal || '', b.kegiatan || '', Number(b.urutan) || 0]);
  flash(req, 'success', 'Dokumentasi berhasil ditambahkan.');
  res.redirect('/admin/dokumentasi');
});

router.get('/dokumentasi/:id/ubah', async (req, res, next) => {
  const item = await get('SELECT * FROM gallery WHERE id = ?', [Number(req.params.id)]);
  if (!item) return next();
  res.render('admin/gallery-form', adminLocals(req, { title: 'Ubah Dokumentasi', nav: 'dokumentasi', currentPath: '/admin/dokumentasi', item }));
});

router.post('/dokumentasi/:id', upload.single('file'), async (req, res) => {
  const id = Number(req.params.id);
  const item = await get('SELECT * FROM gallery WHERE id = ?', [id]);
  if (!item) return res.status(404).render('admin/404', adminLocals(req, { title: 'Tidak ditemukan', nav: 'dokumentasi' }));
  const b = req.body;
  let file = item.file;
  if (req.file) {
    await deleteUpload(item.file);
    file = await storeUpload(req.file);
  } else if (b.file_url) {
    file = b.file_url;
  }
  await run(`UPDATE gallery SET judul=?, keterangan=?, file=?, tanggal=?, kegiatan=?, urutan=? WHERE id=?`,
    [b.judul.trim(), b.keterangan || '', file, b.tanggal || '', b.kegiatan || '', Number(b.urutan) || 0, id]);
  flash(req, 'success', 'Dokumentasi berhasil diperbarui.');
  res.redirect('/admin/dokumentasi');
});

router.post('/dokumentasi/:id/hapus', async (req, res) => {
  const item = await get('SELECT * FROM gallery WHERE id = ?', [Number(req.params.id)]);
  if (item) {
    await deleteUpload(item.file);
    await run('DELETE FROM gallery WHERE id = ?', [item.id]);
    flash(req, 'success', 'Dokumentasi berhasil dihapus.');
  }
  res.redirect('/admin/dokumentasi');
});

// ================= KONTEN HALAMAN =================
const CONTENT_FIELDS = [
  { key: 'site_name', label: 'Nama Situs / Kelompok', type: 'text' },
  { key: 'site_short', label: 'Nama Singkat', type: 'text' },
  { key: 'universitas', label: 'Perguruan Tinggi', type: 'text' },
  { key: 'unit', label: 'Unit / Keterangan Universitas', type: 'text' },
  { key: 'tagline', label: 'Tagline', type: 'text' },
  { key: 'lokasi', label: 'Lokasi Pengabdian (lengkap)', type: 'text' },
  { key: 'lokasi_singkat', label: 'Lokasi Singkat', type: 'text' },
  { key: 'periode', label: 'Periode Pelaksanaan', type: 'text' },
  { key: 'maps_query', label: 'Kata Kunci Peta (Google Maps)', type: 'text' },
  { key: 'hero_eyebrow', label: 'Beranda - Label Atas', type: 'text' },
  { key: 'hero_title', label: 'Beranda - Judul Utama', type: 'text' },
  { key: 'hero_desc', label: 'Beranda - Deskripsi', type: 'textarea' },
  { key: 'about_latar', label: 'Profil - Latar Belakang', type: 'textarea' },
  { key: 'about_kelompok', label: 'Profil - Tentang Kelompok', type: 'textarea' },
  { key: 'about_tujuan', label: 'Profil - Tujuan (satu poin per baris)', type: 'textarea' },
  { key: 'about_sasaran', label: 'Profil - Sasaran', type: 'textarea' },
  { key: 'kontak_email', label: 'Kontak - Email', type: 'text' },
  { key: 'kontak_whatsapp', label: 'Kontak - WhatsApp (format 62...)', type: 'text' },
  { key: 'kontak_instagram', label: 'Kontak - Instagram (tanpa @)', type: 'text' },
  { key: 'footer_text', label: 'Teks Footer', type: 'textarea' },
];

router.get('/konten', async (req, res) => {
  const utils = require('../utils');
  res.render('admin/content', adminLocals(req, {
    title: 'Konten Halaman', nav: 'konten', currentPath: '/admin/konten', fields: CONTENT_FIELDS, values: await utils.getSettings(),
  }));
});

router.post('/konten', async (req, res) => {
  for (const f of CONTENT_FIELDS) {
    const value = req.body[f.key] != null ? String(req.body[f.key]) : '';
    await run(`INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [f.key, value]);
  }
  flash(req, 'success', 'Konten halaman berhasil disimpan.');
  res.redirect('/admin/konten');
});

// ================= AKUN =================
router.get('/akun', (req, res) => {
  res.render('admin/account', adminLocals(req, { title: 'Akun', nav: 'akun', currentPath: '/admin/akun' }));
});

router.post('/akun', async (req, res) => {
  const b = req.body;
  const user = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  if (!user || !bcrypt.compareSync(b.password_lama || '', user.password_hash)) {
    flash(req, 'error', 'Kata sandi lama tidak sesuai.');
    return res.redirect('/admin/akun');
  }
  if (!b.password_baru || b.password_baru.length < 8) {
    flash(req, 'error', 'Kata sandi baru minimal 8 karakter.');
    return res.redirect('/admin/akun');
  }
  if (b.password_baru !== b.password_konfirmasi) {
    flash(req, 'error', 'Konfirmasi kata sandi tidak sama.');
    return res.redirect('/admin/akun');
  }
  const hash = bcrypt.hashSync(b.password_baru, 12);
  const newName = b.name || user.name;
  await run('UPDATE users SET password_hash = ?, name = ? WHERE id = ?', [hash, newName, user.id]);
  req.session.user = { id: user.id, username: user.username, name: newName };
  flash(req, 'success', 'Akun berhasil diperbarui. Kata sandi baru telah aktif.');
  res.redirect('/admin/akun');
});

module.exports = router;
