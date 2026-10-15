'use strict';

const { all } = require('./db');

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function parseDate(value) {
  if (!value) return null;
  const d = new Date(String(value).slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function formatTanggal(value, withDay = false) {
  const d = parseDate(value);
  if (!d) return value || '-';
  const base = `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
  return withDay ? `${HARI[d.getDay()]}, ${base}` : base;
}

function formatRentang(mulai, selesai) {
  const a = parseDate(mulai);
  const b = parseDate(selesai);
  if (!a) return '-';
  if (!b || mulai === selesai || a.getTime() === b.getTime()) return formatTanggal(mulai);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} - ${b.getDate()} ${BULAN[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${formatTanggal(mulai)} - ${formatTanggal(selesai)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function initials(name) {
  if (!name) return '?';
  const parts = name.replace(/[^\p{L}\s.']/gu, ' ').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_TONES = [
  { bg: '#14483C', fg: '#F6F3EA' },
  { bg: '#7A2E2E', fg: '#F6F3EA' },
  { bg: '#B8841C', fg: '#20180A' },
  { bg: '#2F5D50', fg: '#F6F3EA' },
  { bg: '#4A5540', fg: '#F6F3EA' },
  { bg: '#8A5A2B', fg: '#FBF6EC' },
];

function avatarTone(name) {
  let h = 0;
  const s = String(name || '?');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

async function getSettings() {
  const rows = await all('SELECT key, value FROM settings');
  const out = {};
  for (const r of rows) {
    if (r.key && r.key[0] === '_') continue; // lewati kunci internal (mis. penanda seed)
    out[r.key] = r.value;
  }
  return out;
}

function statusMeta(status) {
  const map = {
    'Rencana': { key: 'rencana', label: 'Rencana' },
    'Berjalan': { key: 'berjalan', label: 'Berjalan' },
    'Selesai': { key: 'selesai', label: 'Selesai' },
    'Batal': { key: 'batal', label: 'Batal' },
  };
  return map[status] || map['Rencana'];
}

/** Bangun objek agenda siap pakai untuk kalender & tampilan. */
function decorateAgenda(a) {
  return {
    ...a,
    tanggal_mulai: (a.tanggal_mulai || '').slice(0, 10),
    tanggal_selesai: (a.tanggal_selesai || '').slice(0, 10) || (a.tanggal_mulai || '').slice(0, 10),
  };
}

module.exports = {
  BULAN, HARI, parseDate, formatTanggal, formatRentang, toISO, initials,
  avatarTone, getSettings, statusMeta, decorateAgenda,
};
