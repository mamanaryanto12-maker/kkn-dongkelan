'use strict';

/**
 * Unggah berkas gambar.
 *
 * - Bila kredensial Cloudinary tersedia (CLOUDINARY_*), gambar diunggah ke
 *   Cloudinary dan URL publik yang dikembalikan. Cocok untuk serverless
 *   (Vercel) yang tidak punya penyimpanan tetap.
 * - Bila tidak, berkas ditulis ke UPLOAD_DIR lokal dan dilayani dari /uploads.
 *
 * Berkas selalu ditahan di memori (multer.memoryStorage) agar backend
 * penyimpanan dapat dipilih saat runtime.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { UPLOAD_DIR } = require('../config');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUD_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUD_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const CLOUD_FOLDER = process.env.CLOUDINARY_FOLDER || 'kkn-dongkelan';
const USE_CLOUD = Boolean(CLOUD_NAME && CLOUD_KEY && CLOUD_SECRET);

let cloudinary = null;
if (USE_CLOUD) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_KEY,
    api_secret: CLOUD_SECRET,
    secure: true,
  });
} else {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function safeName(original) {
  const ext = path.extname(original || '').toLowerCase().slice(0, 6) || '.jpg';
  const base = path.basename(original || 'file', ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file';
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return `${base}-${stamp}${ext}`;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error('Format berkas tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.'));
    }
    return cb(null, true);
  },
});

function uploadToCloud(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: CLOUD_FOLDER, resource_type: 'image' },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/** Simpan berkas unggahan dan kembalikan URL publiknya ('' bila tidak ada berkas). */
async function storeUpload(file) {
  if (!file) return '';
  if (USE_CLOUD) return uploadToCloud(file.buffer);
  const name = safeName(file.originalname);
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
}

/** Hapus berkas unggahan berdasarkan URL-nya (lokal atau Cloudinary). Best-effort. */
async function deleteUpload(url) {
  if (!url || typeof url !== 'string') return;
  try {
    if (url.startsWith('/uploads/')) {
      const abs = path.join(UPLOAD_DIR, url.replace(/^\/uploads\//, ''));
      await fs.promises.unlink(abs);
      return;
    }
    if (USE_CLOUD && /res\.cloudinary\.com/.test(url)) {
      const m = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i);
      if (m && m[1]) await cloudinary.uploader.destroy(decodeURIComponent(m[1]));
    }
  } catch (_) {
    /* abaikan kegagalan penghapusan */
  }
}

module.exports = { upload, UPLOAD_DIR, storeUpload, deleteUpload, USE_CLOUD };
