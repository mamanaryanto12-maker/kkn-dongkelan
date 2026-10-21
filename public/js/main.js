'use strict';

document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header, bilah gulir & tombol ke atas ---------- */
  var header = document.getElementById('siteHeader');
  var progress = document.getElementById('scrollProgress');
  var toTop = document.getElementById('toTop');

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (progress) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
    }
    if (toTop) toTop.classList.toggle('is-visible', y > 640);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Menu seluler ---------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Muncul saat digulir (dengan stagger) ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (revealEls.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      revealEls.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var groups = new Map();
      revealEls.forEach(function (el) {
        var parent = el.parentElement;
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent).push(el);
      });
      groups.forEach(function (list) {
        list.forEach(function (el, i) {
          var delay = Math.min(i, 6) * 85;
          el.style.transitionDelay = delay + 'ms';
        });
      });

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.classList.add('is-in');
          var delay = parseFloat(el.style.transitionDelay) || 0;
          setTimeout(function () { el.style.transitionDelay = ''; }, delay + 1150);
          io.unobserve(el);
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -46px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- Parallax halus ---------- */
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (parallaxEls.length && !reduce) {
    var ticking = false;
    var applyParallax = function () {
      var mid = window.innerHeight / 2;
      parallaxEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var factor = parseFloat(el.getAttribute('data-parallax')) || 0.08;
        var delta = (mid - (rect.top + rect.height / 2)) * factor;
        el.style.transform = 'translate3d(0,' + delta.toFixed(2) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(applyParallax); }
    }, { passive: true });
    applyParallax();
  }

  /* ---------- Sorot kursor di hero ---------- */
  var hero = document.querySelector('.hero');
  if (hero && !reduce && window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  /* ---------- Hero editorial slider ---------- */
  var heroSlider = document.querySelector('[data-hero-slider]');
  if (heroSlider && !reduce) {
    var heroTrack = heroSlider.querySelector('[data-hero-track]');
    var heroSlides = Array.prototype.slice.call(heroSlider.querySelectorAll('.hero-slide'));
    var heroPrev = heroSlider.querySelector('[data-hero-prev]');
    var heroNext = heroSlider.querySelector('[data-hero-next]');
    var heroDots = heroSlider.querySelector('[data-hero-dots]');
    if (heroTrack && heroSlides.length) {
      var heroIndex = 0;
      var heroTimer = null;
      if (heroDots) {
        heroSlides.forEach(function (_, i) {
          var dot = document.createElement('button');
          dot.className = 'hero-dot' + (i === 0 ? ' is-active' : '');
          dot.setAttribute('aria-label', 'Ke slide ' + (i + 1));
          dot.addEventListener('click', function () { goHero(i); });
          heroDots.appendChild(dot);
        });
      }
      var heroDotsList = heroDots ? Array.prototype.slice.call(heroDots.querySelectorAll('.hero-dot')) : [];
      function goHero(i) {
        heroIndex = (i + heroSlides.length) % heroSlides.length;
        heroTrack.style.transform = 'translateX(-' + (heroIndex * 100) + '%)';
        heroSlides.forEach(function (s, idx) { s.classList.toggle('is-active', idx === heroIndex); });
        heroDotsList.forEach(function (d, idx) { d.classList.toggle('is-active', idx === heroIndex); });
        resetHero();
      }
      function resetHero() {
        if (heroTimer) clearInterval(heroTimer);
        heroTimer = setInterval(function () { goHero(heroIndex + 1); }, 6200);
      }
      if (heroPrev) heroPrev.addEventListener('click', function () { goHero(heroIndex - 1); });
      if (heroNext) heroNext.addEventListener('click', function () { goHero(heroIndex + 1); });
      heroSlider.addEventListener('mouseenter', function () { if (heroTimer) clearInterval(heroTimer); });
      heroSlider.addEventListener('mouseleave', resetHero);
      resetHero();
    }
  }

  /* ---------- Dokumentasi editorial carousel ---------- */
  var galleryWrap = document.querySelector('[data-gallery-track]');
  if (galleryWrap && !reduce) {
    var galleryTrack = galleryWrap;
    var galleryPrev = document.querySelector('[data-gallery-prev]');
    var galleryNext = document.querySelector('[data-gallery-next]');
    var galleryCards = Array.prototype.slice.call(galleryTrack.querySelectorAll('.gallery-editorial-card'));
    if (galleryCards.length) {
      var gIndex = 0;
      function updateGallery() {
        var card = galleryCards[0];
        var gap = parseFloat(getComputedStyle(galleryTrack).gap) || 24;
        var step = card.getBoundingClientRect().width + gap;
        galleryTrack.style.transform = 'translateX(-' + (gIndex * step) + 'px)';
        if (galleryPrev) galleryPrev.disabled = gIndex <= 0;
        if (galleryNext) galleryNext.disabled = gIndex >= galleryCards.length - 1;
      }
      if (galleryPrev) galleryPrev.addEventListener('click', function () { gIndex = Math.max(0, gIndex - 1); updateGallery(); });
      if (galleryNext) galleryNext.addEventListener('click', function () { gIndex = Math.min(galleryCards.length - 1, gIndex + 1); updateGallery(); });
      window.addEventListener('resize', updateGallery);
      updateGallery();
    }
  }

  /* ---------- Angka statistik naik ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  if (counters.length) {
    var runCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var start = null;
      var dur = 1400;
      var step = function (ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(2, -10 * p);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      window.requestAnimationFrame(step);
    };
    if (reduce || !('IntersectionObserver' in window)) {
      counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { runCount(entry.target); cio.unobserve(entry.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- Saringan (program & dokumentasi) ---------- */
  document.querySelectorAll('.filter-bar').forEach(function (bar) {
    var buttons = bar.querySelectorAll('.filter-btn');
    var section = bar.closest('section') || document;
    var columns = section.querySelectorAll('[data-group]');
    var items = section.querySelectorAll('.gallery-item');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var target = btn.getAttribute('data-target');

        if (columns.length) {
          columns.forEach(function (col) {
            col.style.display = (target === 'semua' || col.getAttribute('data-group') === target) ? '' : 'none';
          });
        }
        if (items.length) {
          items.forEach(function (item) {
            var keg = item.getAttribute('data-kegiatan');
            item.style.display = (target === 'semua' || keg === target) ? '' : 'none';
          });
        }
      });
    });
  });

  /* ---------- Lightbox galeri ---------- */
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var imgEl = document.getElementById('lightboxImg');
    var titleEl = document.getElementById('lightboxTitle');
    var capEl = document.getElementById('lightboxCaption');
    var closeBtn = document.getElementById('lightboxClose');
    var hideTimer = null;

    var open = function (thumb) {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      imgEl.src = thumb.getAttribute('data-full');
      imgEl.alt = thumb.getAttribute('data-title') || '';
      titleEl.textContent = thumb.getAttribute('data-title') || '';
      capEl.textContent = thumb.getAttribute('data-caption') || '';
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      window.requestAnimationFrame(function () { lightbox.classList.add('is-open'); });
      closeBtn.focus();
    };
    var close = function () {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
      hideTimer = setTimeout(function () { lightbox.hidden = true; hideTimer = null; }, reduce ? 0 : 340);
    };

    document.querySelectorAll('.gallery-thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () { open(thumb); });
    });
    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lightbox.hidden) close();
    });
  }
});
