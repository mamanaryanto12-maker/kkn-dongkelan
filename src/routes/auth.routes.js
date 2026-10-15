'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { get } = require('../db');
const { requireGuest, loginRateLimit } = require('../middleware/auth');

const router = express.Router();

router.get('/login', requireGuest, (req, res) => {
  res.render('admin/login', { title: 'Masuk CMS', error: null, username: '' });
});

router.post('/login', requireGuest, loginRateLimit, async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const user = await get('SELECT * FROM users WHERE username = ?', [username]);
  const ok = user && bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    if (req._loginAttempt) req._loginAttempt();
    return res.status(401).render('admin/login', {
      title: 'Masuk CMS', error: 'Nama pengguna atau kata sandi salah.', username,
    });
  }
  if (req._loginSuccess) req._loginSuccess();
  req.session.userId = user.id;
  req.session.user = { id: user.id, username: user.username, name: user.name };
  const dest = req.session.returnTo && req.session.returnTo.startsWith('/admin') ? req.session.returnTo : '/admin';
  delete req.session.returnTo;
  return res.redirect(dest);
});

router.post('/logout', (req, res) => {
  req.session = null; // cookie-session: hapus sesi
  res.redirect('/admin/login');
});

module.exports = router;
