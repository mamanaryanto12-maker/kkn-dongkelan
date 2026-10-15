'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieSession = require('cookie-session');

const { DATA_DIR, UPLOAD_DIR } = require('./src/config');
const seed = require('./src/seed');
const { csrfProtection, securityHeaders } = require('./src/middleware/auth');
const publicRoutes = require('./src/routes/public.routes');
const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Inisialisasi skema + data awal sekali per proses (aman untuk cold start serverless).
// Setelah seed pertama, cold start hanya melakukan satu query berkat penanda _seed_done.
let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await seed.ensureSeed();
    })().catch((err) => {
      readyPromise = null; // izinkan percobaan ulang pada request berikutnya
      throw err;
    });
  }
  return readyPromise;
}

// Secret sesi stabil: dari env, atau dibuat sekali lalu disimpan lokal.
function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, 'session-secret.txt');
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
    const secret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, secret);
    return secret;
  } catch (_) {
    return crypto.randomBytes(32).toString('hex');
  }
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(securityHeaders);
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '1mb' }));
// Berkas unggahan disajikan dari UPLOAD_DIR (bisa di luar folder publik, mis. disk permanen).
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

app.use(cookieSession({
  name: 'kkn.sid',
  keys: [sessionSecret()],
  maxAge: 1000 * 60 * 60 * 8,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' && process.env.FORCE_HTTP !== '1',
  signed: true,
}));

// CSRF berlaku untuk seluruh POST pada area CMS + fallback untuk form multipart.
app.use(csrfProtection);

// Versi aset untuk cache-busting (ubah nilai ini atau restart untuk memaksa muat ulang CSS/JS).
const ASSET_VERSION = process.env.ASSET_VERSION || String(Date.now());

// Pindahkan pesan flash dari session ke locals sekali pakai.
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.user = req.session.user || null;
  res.locals.assetV = ASSET_VERSION;
  next();
});

// Tunggu kesiapan database sebelum menangani permintaan yang butuh data.
app.use((req, res, next) => {
  ready().then(() => next()).catch(next);
});

app.use('/admin', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// 404
app.use(async (req, res) => {
  const utils = require('./src/utils');
  res.status(404).render('public/404', {
    title: 'Halaman tidak ditemukan', nav: '', currentPath: req.path,
    settings: await utils.getSettings(),
    formatTanggal: utils.formatTanggal,
    formatRentang: utils.formatRentang,
    avatarTone: utils.avatarTone,
    initials: utils.initials,
    statusMeta: utils.statusMeta,
    csrfToken: req.session && req.session.csrfToken,
    flash: null, user: null,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  const isUpload = err && (err.code === 'LIMIT_FILE_SIZE' || /berkas|format|File too large/i.test(err.message || ''));
  const status = err.status || (isUpload ? 400 : 500);
  const message = err.code === 'LIMIT_FILE_SIZE'
    ? 'Ukuran berkas melebihi batas 6 MB.'
    : (err.message || 'Terjadi kesalahan pada server.');
  if (req.path.startsWith('/admin')) {
    res.status(status).render('admin/error', { title: 'Terjadi Kesalahan', nav: '', message, user: req.session && req.session.user });
  } else {
    res.status(status).send(`<pre style="font:14px/1.6 monospace;padding:24px">Terjadi kesalahan: ${message}</pre>`);
  }
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`\n  Website KKN Dongkelan Asoy berjalan di:`);
    console.log(`    Publik : http://localhost:${PORT}/`);
    console.log(`    CMS    : http://localhost:${PORT}/admin\n`);
  });
}

module.exports = app;
