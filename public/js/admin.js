'use strict';

document.addEventListener('DOMContentLoaded', function () {
  // Buka/tutup sidebar pada layar kecil
  var burger = document.getElementById('adminBurger');
  var sidebar = document.getElementById('adminSidebar');
  if (burger && sidebar) {
    burger.addEventListener('click', function () {
      var open = sidebar.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && e.target !== burger && !burger.contains(e.target)) {
        sidebar.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Konfirmasi sebelum menghapus
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.confirm(form.getAttribute('data-confirm'))) {
        e.preventDefault();
      }
    });
  });

  // Sembunyikan notifikasi otomatis
  document.querySelectorAll('.alert').forEach(function (alert) {
    setTimeout(function () {
      alert.style.transition = 'opacity .4s ease';
      alert.style.opacity = '0';
      setTimeout(function () { alert.remove(); }, 400);
    }, 6000);
  });

  // Pratinjau nama berkas yang dipilih
  document.querySelectorAll('input[type="file"]').forEach(function (input) {
    input.addEventListener('change', function () {
      var label = input.parentElement.querySelector('.file-name');
      if (!label) {
        label = document.createElement('small');
        label.className = 'file-name muted';
        input.parentElement.appendChild(label);
      }
      label.textContent = input.files && input.files.length ? 'Dipilih: ' + input.files[0].name : '';
    });
  });
});
