'use strict';

const crypto = require('crypto');

/** Pastikan pengguna sudah login sebagai administrator. */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

/** Cegah pengguna yang sudah login membuka halaman login lagi. */
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) return res.redirect('/admin');
  return next();
}

/** Sediakan token CSRF pada setiap request (disimpan pada session). */
function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const sent = (req.body && req.body._csrf) || req.query._csrf || req.get('x-csrf-token');
    if (!sent || sent !== req.session.csrfToken) {
      return res.status(403).send('Token keamanan (CSRF) tidak valid atau telah kedaluwarsa. Muat ulang halaman lalu coba lagi.');
    }
  }
  return next();
}

/** Header keamanan dasar tanpa dependensi tambahan. */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

// Pembatasan percobaan login sederhana berbasis memori.
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function loginRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip) || { count: 0, first: now };
  if (now - rec.first > WINDOW_MS) {
    rec.count = 0;
    rec.first = now;
  }
  if (rec.count >= MAX_ATTEMPTS) {
    const sisa = Math.ceil((WINDOW_MS - (now - rec.first)) / 60000);
    return res.status(429).render('admin/login', {
      title: 'Masuk CMS', error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${sisa} menit.`, username: '',
    });
  }
  req._loginAttempt = () => {
    rec.count += 1;
    attempts.set(ip, rec);
  };
  req._loginSuccess = () => attempts.delete(ip);
  next();
}

module.exports = { requireAuth, requireGuest, csrfProtection, securityHeaders, loginRateLimit };
