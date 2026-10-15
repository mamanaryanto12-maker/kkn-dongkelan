'use strict';

/**
 * Konfigurasi jalur penyimpanan agar aplikasi dapat dijalankan di host mana pun.
 *
 * - DATA_DIR   : lokasi database SQLite + berkas rahasia sesi.
 * - UPLOAD_DIR : lokasi berkas gambar yang diunggah lewat CMS.
 *
 * Di lingkungan produksi (mis. Render/Railway/Fly.io) arahkan keduanya ke
 * direktori disk permanen, contoh:
 *   DATA_DIR=/var/data
 *   UPLOAD_DIR=/var/data/uploads
 * Bila tidak diset, default ke folder `data` dan `public/uploads` di proyek.
 */

const path = require('path');

const ROOT = path.join(__dirname, '..');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, 'data');

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(ROOT, 'public', 'uploads');

module.exports = { ROOT, DATA_DIR, UPLOAD_DIR };
