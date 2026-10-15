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
    all(`SELECT * FROM agendas WHERE tanggal_selesai >= ? ORDER BY tanggal_mulai ASC LIMIT 4`, [today]),
    all('SELECT * FROM gallery ORDER BY urutan ASC LIMIT 4'),
    getSettings(),
  ]);
  res.render('public/home', await baseLocals({
    nav: 'home', currentPath: '/', title: 'Beranda',
    programHighlights,
    totalProgram: totalProgram.c,
    totalAgenda: totalAgenda.c,
    totalAnggota: totalAnggota.c,
    upcoming: upcoming.map(decorateAgenda),
    galeriSorotan,
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
