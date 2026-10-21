'use strict';

const express = require('express');
const { all, get } = require('../db');
const {
  getSettings, formatTanggal, formatRentang, avatarTone, initials, statusMeta, toISO, decorateAgenda,
} = require('../utils');

const router = express.Router();

// Bangun locals dasar. Bila `settings` sudah diambil (mis. lewat Promise.all),
// gunakan itu agar tidak ada query tambahan yang berurutan.
async function baseLocals(extra = {}, settings) {
  const s = settings || (await getSettings());
  return {
    settings: s,
    nav: 'home',
    currentPath: '',
    formatTanggal,
    formatRentang,
    avatarTone,
    initials,
    statusMeta,
    ...extra,
  };
}

function todayISO() {
  return toISO(new Date());
}

// ---------- Beranda ----------
router.get('/', async (req, res) => {
  const today = todayISO();
  const [programHighlights, totalProgram, totalAgenda, totalAnggota, upcoming, galeriSorotan, settings] = await Promise.all([
    all(`SELECT * FROM programs WHERE status != 'Batal' ORDER BY urutan ASC LIMIT 6`),
    get('SELECT COUNT(*) AS c FROM programs'),
    get('SELECT COUNT(*) AS c FROM agendas'),
    get('SELECT COUNT(*) AS c FROM members'),
    all(`SELECT * FROM agendas WHERE tanggal_selesai >= ? ORDER BY tanggal_mulai ASC LIMIT 6`, [today]),
    all('SELECT * FROM gallery ORDER BY urutan ASC LIMIT 4'),
    getSettings(),
  ]);
  const artikelList = [
    {
      slug: 'penerjunan-kkn',
      judul: 'Penerjunan KKN Dongkelan Nalarasa',
      tanggal: '12 Oktober 2026',
      lokasi: 'Balai Desa Sidorejo',
      kategori: 'Persiapan KKN',
      kutipan: 'Penerjunan ini menjadi titik awal kami berproses bersama warga Dongkelan: belajar, berkolaborasi, dan berkontribusi lewat program-program yang disusun sesuai kebutuhan masyarakat.',
      isi: `Kegiatan penerjunan menjadi awal perjalanan KKN Dongkelan Nalarasa di Padukuhan Dongkelan, Desa Sidorejo, Kecamatan Godean, Kabupaten Sleman. Pada hari Senin, 12 Oktober 2026, kami secara resmi diterjunkan oleh Universitas Negeri Yogyakarta melalui Ibu Aris Martiana, S.Pd., M.Si., bersama Bapak Isharyanto selaku Kepala Desa Sidorejo beserta perangkat desa lainnya.\n\nDalam kegiatan ini, kami diperkenalkan kepada warga dan tokoh masyarakat sekaligus menerima arahan dan harapan untuk pelaksanaan KKN selama dua bulan ke depan. Penerjunan ini menjadi titik awal kami berproses bersama warga Dongkelan: belajar, berkolaborasi, dan berkontribusi lewat program-program yang disusun sesuai kebutuhan masyarakat.\n\nTerima kasih kepada seluruh warga, perangkat padukuhan, dan semua pihak yang telah menyambut kami dengan hangat. Mohon bimbingan dan dukungannya selama kami mengabdi di Dongkelan.`,
      sampul: '/img/dokumentasi/penerjunan-kkn/penerjunan-01.jpg',
      galeri: [
        { src: '/img/dokumentasi/penerjunan-kkn/penerjunan-01.jpg', alt: 'Penyerahan mahasiswa KKN oleh perwakilan UNY di Balai Desa Sidorejo' },
        { src: '/img/dokumentasi/penerjunan-kkn/penerjunan-02.heic', alt: 'Penerjunan KKN Dongkelan Nalarasa di Balai Desa Sidorejo' }
      ]
    }
  ];
  res.render('public/home', await baseLocals({
    nav: 'home', currentPath: '/', title: 'Beranda',
    programHighlights,
    totalProgram: totalProgram.c,
    totalAgenda: totalAgenda.c,
    totalAnggota: totalAnggota.c,
    upcoming: upcoming.map(decorateAgenda),
    galeriSorotan,
    galeri: galeriSorotan,
    artikelList,
  }, settings));
});

// ---------- Profil KKN ----------
router.get('/profil', async (req, res) => {
  res.render('public/profil', await baseLocals({
    nav: 'profil', currentPath: '/profil', title: 'Profil KKN',
  }));
});

// ---------- Struktur & Anggota ----------
router.get('/anggota', async (req, res) => {
  const [members, settings] = await Promise.all([
    all('SELECT * FROM members ORDER BY urutan ASC, name ASC'),
    getSettings(),
  ]);
  res.render('public/anggota', await baseLocals({
    nav: 'anggota', currentPath: '/anggota', title: 'Profil Anggota', members,
  }, settings));
});

router.get('/anggota/:id', async (req, res, next) => {
  const [member, settings] = await Promise.all([
    get('SELECT * FROM members WHERE id = ?', [Number(req.params.id)]),
    getSettings(),
  ]);
  if (!member) return next();
  const others = await all('SELECT * FROM members WHERE id != ? ORDER BY urutan ASC LIMIT 4', [member.id]);
  res.render('public/anggota-detail', await baseLocals({
    nav: 'anggota', currentPath: '/anggota', title: member.name, member, others,
  }, settings));
});

// ---------- Program Kerja ----------
router.get('/program', async (req, res) => {
  const [programs, settings] = await Promise.all([
    all('SELECT * FROM programs ORDER BY urutan ASC, nama ASC'),
    getSettings(),
  ]);
  const grouped = {
    kelompok: programs.filter((p) => p.tipe === 'Kelompok'),
    individu: programs.filter((p) => p.tipe === 'Individu'),
  };
  const kategoriKelompok = [...new Set(grouped.kelompok.map((p) => p.kategori))];
  const kategoriIndividu = [...new Set(grouped.individu.map((p) => p.kategori))];
  res.render('public/program', await baseLocals({
    nav: 'program', currentPath: '/program', title: 'Program Kerja',
    programs, grouped, kategoriKelompok, kategoriIndividu,
  }, settings));
});

// ---------- Dokumentasi ----------
router.get('/dokumentasi', async (req, res) => {
  const [galeri, settings] = await Promise.all([
    all('SELECT * FROM gallery ORDER BY urutan ASC, id ASC'),
    getSettings(),
  ]);
  const kegiatan = [...new Set(galeri.map((g) => g.kegiatan).filter(Boolean))];
  res.render('public/dokumentasi', await baseLocals({
    nav: 'dokumentasi', currentPath: '/dokumentasi', title: 'Dokumentasi Kegiatan', galeri, kegiatan,
  }, settings));
});

// ---------- Informasi / Kontak ----------
router.get('/kontak', async (req, res) => {
  const [members, settings] = await Promise.all([
    all('SELECT * FROM members ORDER BY urutan ASC'),
    getSettings(),
  ]);
  res.render('public/kontak', await baseLocals({
    nav: 'kontak', currentPath: '/kontak', title: 'Informasi & Kontak', members,
  }, settings));
});

module.exports = router;
