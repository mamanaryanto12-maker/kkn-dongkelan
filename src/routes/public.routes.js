'use strict';

const express = require('express');
const { all, get } = require('../db');
const {
  getSettings, formatTanggal, formatRentang, avatarTone, initials, statusMeta, toISO, decorateAgenda,
} = require('../utils');

const router = express.Router();

async function baseLocals(extra = {}) {
  const settings = await getSettings();
  return {
    settings,
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
  const programHighlights = await all(
    `SELECT * FROM programs WHERE status != 'Batal' ORDER BY urutan ASC LIMIT 6`
  );
  const totalProgram = (await get('SELECT COUNT(*) AS c FROM programs')).c;
  const totalAgenda = (await get('SELECT COUNT(*) AS c FROM agendas')).c;
  const totalAnggota = (await get('SELECT COUNT(*) AS c FROM members')).c;
  const upcoming = (await all(
    `SELECT * FROM agendas WHERE tanggal_selesai >= ? ORDER BY tanggal_mulai ASC LIMIT 4`,
    [todayISO()]
  )).map(decorateAgenda);
  const galeriSorotan = await all('SELECT * FROM gallery ORDER BY urutan ASC LIMIT 4');
  res.render('public/home', await baseLocals({
    nav: 'home', currentPath: '/', title: 'Beranda',
    programHighlights, totalProgram, totalAgenda, totalAnggota, upcoming, galeriSorotan,
  }));
});

// ---------- Profil KKN ----------
router.get('/profil', async (req, res) => {
  res.render('public/profil', await baseLocals({
    nav: 'profil', currentPath: '/profil', title: 'Profil KKN',
  }));
});

// ---------- Struktur & Anggota ----------
router.get('/anggota', async (req, res) => {
  const members = await all('SELECT * FROM members ORDER BY urutan ASC, name ASC');
  res.render('public/anggota', await baseLocals({
    nav: 'anggota', currentPath: '/anggota', title: 'Profil Anggota', members,
  }));
});

router.get('/anggota/:id', async (req, res, next) => {
  const member = await get('SELECT * FROM members WHERE id = ?', [Number(req.params.id)]);
  if (!member) return next();
  const others = await all('SELECT * FROM members WHERE id != ? ORDER BY urutan ASC LIMIT 4', [member.id]);
  res.render('public/anggota-detail', await baseLocals({
    nav: 'anggota', currentPath: '/anggota', title: member.name, member, others,
  }));
});

// ---------- Program Kerja ----------
router.get('/program', async (req, res) => {
  const programs = await all('SELECT * FROM programs ORDER BY urutan ASC, nama ASC');
  const grouped = {
    kelompok: programs.filter((p) => p.tipe === 'Kelompok'),
    individu: programs.filter((p) => p.tipe === 'Individu'),
  };
  const kategoriKelompok = [...new Set(grouped.kelompok.map((p) => p.kategori))];
  const kategoriIndividu = [...new Set(grouped.individu.map((p) => p.kategori))];
  res.render('public/program', await baseLocals({
    nav: 'program', currentPath: '/program', title: 'Program Kerja',
    programs, grouped, kategoriKelompok, kategoriIndividu,
  }));
});

// ---------- Dokumentasi ----------
router.get('/dokumentasi', async (req, res) => {
  const galeri = await all('SELECT * FROM gallery ORDER BY urutan ASC, id ASC');
  const kegiatan = [...new Set(galeri.map((g) => g.kegiatan).filter(Boolean))];
  res.render('public/dokumentasi', await baseLocals({
    nav: 'dokumentasi', currentPath: '/dokumentasi', title: 'Dokumentasi Kegiatan', galeri, kegiatan,
  }));
});

// ---------- Informasi / Kontak ----------
router.get('/kontak', async (req, res) => {
  const members = await all('SELECT * FROM members ORDER BY urutan ASC');
  res.render('public/kontak', await baseLocals({
    nav: 'kontak', currentPath: '/kontak', title: 'Informasi & Kontak', members,
  }));
});

module.exports = router;
