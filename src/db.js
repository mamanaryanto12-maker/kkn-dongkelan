'use strict';

/**
 * Lapisan database dengan dua backend:
 *
 *  1. Turso (libSQL) — dipakai bila TURSO_DATABASE_URL diset. Cocok untuk
 *     lingkungan serverless (Vercel) karena penyimpanan bersifat eksternal.
 *  2. SQLite bawaan Node (node:sqlite) — dipakai sebagai default untuk
 *     pengembangan lokal. Tanpa kompilasi native, tanpa layanan eksternal.
 *
 * Seluruh fungsi (all/get/run/transaction) bersifat ASYNC agar kedua backend
 * seragam. Fallback lokal membungkus API sinkron ke dalam bentuk Promise.
 */

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./config');

const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const USE_TURSO = Boolean(TURSO_URL);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Administrator',
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  nim         TEXT DEFAULT '',
  prodi       TEXT DEFAULT '',
  fakultas    TEXT DEFAULT '',
  jabatan     TEXT DEFAULT '',
  foto        TEXT DEFAULT '',
  bio         TEXT DEFAULT '',
  instagram   TEXT DEFAULT '',
  urutan      INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS programs (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nama             TEXT NOT NULL,
  tipe             TEXT NOT NULL DEFAULT 'Kelompok',
  kategori         TEXT DEFAULT '',
  deskripsi        TEXT DEFAULT '',
  tujuan           TEXT DEFAULT '',
  sasaran          TEXT DEFAULT '',
  lokasi           TEXT DEFAULT '',
  penanggung_jawab TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'Rencana',
  dokumentasi      TEXT DEFAULT '',
  urutan           INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agendas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  judul           TEXT NOT NULL,
  program_id      INTEGER REFERENCES programs(id) ON DELETE SET NULL,
  tanggal_mulai   TEXT NOT NULL,
  tanggal_selesai TEXT DEFAULT '',
  waktu           TEXT DEFAULT '',
  lokasi          TEXT DEFAULT '',
  kategori        TEXT DEFAULT 'Program Kelompok',
  deskripsi       TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'Rencana',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  judul      TEXT NOT NULL,
  keterangan TEXT DEFAULT '',
  file       TEXT NOT NULL,
  tanggal    TEXT DEFAULT '',
  kegiatan   TEXT DEFAULT '',
  urutan     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_agendas_tanggal ON agendas(tanggal_mulai);
CREATE INDEX IF NOT EXISTS idx_programs_tipe ON programs(tipe);
`;

let DB_PATH = null;
let backend;
let tursoClient = null;

/** Ubah satu baris libSQL (array-like) menjadi objek biasa. */
function libRowToObject(columns, row) {
  const out = {};
  for (let i = 0; i < columns.length; i++) out[columns[i]] = row[i];
  return out;
}

function toNumberOrUndefined(value) {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'bigint' ? Number(value) : value;
}

/** Pilih implementasi klien libSQL: file lokal (native) atau remote (HTTP). */
function createLibsqlClient(url, token) {
  const opts = { url };
  if (token) opts.authToken = token;
  const isLocal = /^file:/i.test(url) || /^:memory:/i.test(url);
  if (isLocal) return require('@libsql/client').createClient(opts);
  try {
    return require('@libsql/client/web').createClient(opts);
  } catch (_) {
    return require('@libsql/client').createClient(opts);
  }
}

if (USE_TURSO) {
  // ---- Backend Turso (libSQL) ----
  const client = createLibsqlClient(TURSO_URL, TURSO_TOKEN);
  tursoClient = client;

  backend = {
    async all(sql, params = []) {
      const rs = await client.execute({ sql, args: params });
      return rs.rows.map((row) => libRowToObject(rs.columns, row));
    },
    async get(sql, params = []) {
      const rs = await client.execute({ sql, args: params });
      return rs.rows[0] ? libRowToObject(rs.columns, rs.rows[0]) : undefined;
    },
    async run(sql, params = []) {
      const rs = await client.execute({ sql, args: params });
      return {
        changes: toNumberOrUndefined(rs.rowsAffected) || 0,
        lastInsertRowid: toNumberOrUndefined(rs.lastInsertRowid),
      };
    },
    // libSQL tidak memerlukan transaksi eksplisit di sini (operasi seed idempoten).
    async transaction(fn) {
      return fn();
    },
  };
} else {
  // ---- Backend SQLite lokal (node:sqlite) ----
  const { DatabaseSync } = require('node:sqlite');
  DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'kkn.sqlite');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  backend = {
    async all(sql, params = []) {
      return db.prepare(sql).all(...params);
    },
    async get(sql, params = []) {
      return db.prepare(sql).get(...params);
    },
    async run(sql, params = []) {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowid: toNumberOrUndefined(r.lastInsertRowid) };
    },
    async transaction(fn) {
      db.exec('BEGIN');
      try {
        const result = await fn();
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

let initialized = !USE_TURSO; // SQLite lokal sudah siap saat modul dimuat.

/** Pastikan skema database sudah dibuat (khusus backend Turso, sekali saja). */
async function init() {
  if (initialized) return;
  await tursoClient.executeMultiple(SCHEMA);
  initialized = true;
}

/** Jalankan query yang mengembalikan banyak baris. */
function all(sql, params = []) {
  return backend.all(sql, params);
}

/** Jalankan query yang mengembalikan satu baris (atau undefined). */
function get(sql, params = []) {
  return backend.get(sql, params);
}

/** Jalankan query tulis (INSERT/UPDATE/DELETE). */
function run(sql, params = []) {
  return backend.run(sql, params);
}

function transaction(fn) {
  return backend.transaction(fn);
}

module.exports = { all, get, run, transaction, init, DB_PATH, USE_TURSO };
