/* Page behaviour: search, category filter, cards, dialogs, forms, mobile menu. */
(function () {
  'use strict';
  var PV = window.PV, CATS = PV.CATEGORIES, icon = PV.icon;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var state = { q: new URLSearchParams(location.search).get('q') || '', cat: new URLSearchParams(location.search).get('c') || '' };
  if (!CATS.some(function (c) { return c.slug === state.cat; })) state.cat = '';

  /* ---------- Cards ---------- */
  function cardHTML(c, i) {
    return '<article class="card" style="animation-delay:' + Math.min(i, 8) * 40 + 'ms">' +
      '<div class="card-img"><img src="assets/images/categories/' + c.slug + '.svg" alt="' + c.title + ' prompt category illustration" width="350" height="210" loading="lazy"></div>' +
      '<div class="card-head"><span class="tile">' + icon(c.icon) + '</span><h3>' + c.title + '</h3></div>' +
      '<p>' + c.desc + '</p>' +
      '<div class="card-foot"><button class="btn-view" type="button" data-open="' + c.slug + '" aria-label="View prompt: ' + c.title + '">View prompt ' + icon('arrow') + '</button></div></article>';
  }

  function render() {
    var grid = $('#grid'); if (!grid) return;
    var q = state.q.trim().toLowerCase();
    var list = CATS.filter(function (c) {
      return (!state.cat || c.slug === state.cat) && (!q || (c.title + ' ' + c.desc).toLowerCase().indexOf(q) !== -1);
    });
    grid.innerHTML = list.map(cardHTML).join('');
    var empty = $('#empty'); if (empty) empty.hidden = list.length > 0;
    $$('[data-filter],[data-cat]').forEach(function (b) {
      var slug = b.dataset.filter !== undefined ? b.dataset.filter : b.dataset.cat;
      if (slug) b.setAttribute('aria-pressed', String(slug === state.cat));
    });
  }

  function setCategory(slug) {
    state.cat = (state.cat === slug) ? '' : slug;
    render();
  }

  var list = $('#cat-list');
  if (list) {
    list.innerHTML = CATS.map(function (c) {
      return '<li><button type="button" data-cat="' + c.slug + '" aria-pressed="false">' + icon(c.icon) + '<span>' + c.title + '</span></button></li>';
    }).join('');
    list.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) setCategory(b.dataset.cat); });
  }
  var search = $('#q');
  if (search) {
    search.value = state.q;
    $('#search-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!$('#grid')) location.href = 'categories.html' + (search.value.trim() ? '?q=' + encodeURIComponent(search.value.trim()) : '');
    });
    search.addEventListener('input', function () { state.q = search.value; render(); });
  }

  /* ---------- Header: filter dropdown, mobile menu ---------- */
  var fbtn = $('#filter-btn'), fmenu = $('#filter-menu');
  function toggleFilter(open) {
    if (!fbtn) return;
    fmenu.hidden = !open; fbtn.setAttribute('aria-expanded', String(open));
  }
  if (fbtn) {
    fbtn.addEventListener('click', function () { toggleFilter(fmenu.hidden); });
    fmenu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      state.cat = b.dataset.filter; render(); toggleFilter(false);
      if (!$('#grid')) location.href = 'categories.html' + (state.cat ? '?c=' + state.cat : '');
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.filter')) toggleFilter(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !fmenu.hidden) { toggleFilter(false); fbtn.focus(); } });
  }
  var mbtn = $('#menu-btn'), nav = $('#nav');
  if (mbtn) mbtn.addEventListener('click', function () {
    var open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    mbtn.setAttribute('aria-expanded', String(open));
    mbtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  /* ---------- Dialogs ---------- */
  var promptD = $('#prompt-dialog');
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]');
    if (o) openPrompt(o.dataset.open);
    if (e.target.closest('[data-close]')) e.target.closest('dialog').close();
    if (e.target.tagName === 'DIALOG') e.target.close(); /* backdrop click */
    var cp = e.target.closest('[data-copy]');
    if (cp) copyText(cp);
  });
  function openPrompt(slug) {
    var c = CATS.filter(function (x) { return x.slug === slug; })[0]; if (!c) return;
    $('#prompt-title').textContent = c.title;
    $('#prompt-img').src = 'assets/images/categories/' + c.slug + '.svg';
    $('#prompt-img').alt = c.title + ' prompt category illustration';
    $('#prompt-desc').textContent = c.desc;
    var ul = $('#prompt-list');
    ul.innerHTML = '';
    c.prompts.forEach(function (p) {
      var li = document.createElement('li');
      var span = document.createElement('span'); span.textContent = p;
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-view'; btn.dataset.copy = p;
      btn.style.width = 'auto'; btn.style.padding = '0 14px'; btn.style.background = 'var(--blue)';
      btn.innerHTML = 'Copy ' + icon('copy');
      li.appendChild(span); li.appendChild(btn); ul.appendChild(li);
    });
    promptD.showModal();
  }
  function copyText(btn) {
    var t = btn.dataset.copy;
    var done = function () { var old = btn.innerHTML; btn.textContent = 'Copied'; setTimeout(function () { btn.innerHTML = old; }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, done); else done();
  }

  /* ---------- Forms ---------- */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function fail(input, errEl, msg) { input.setAttribute('aria-invalid', 'true'); errEl.textContent = msg; }
  function pass(input, errEl) { input.removeAttribute('aria-invalid'); errEl.textContent = ''; }
  function simulate(btn, cb) { btn.setAttribute('aria-busy', 'true'); btn.disabled = true; setTimeout(function () { btn.removeAttribute('aria-busy'); btn.disabled = false; cb(); }, 700); }

  var review = $('#review-form');
  if (review) {
    review.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = review.email, msg = review.message, ok = true, st = $('.status', review);
      st.textContent = '';
      if (!emailRe.test(em.value)) { fail(em, $('#review-email-err'), 'Enter a valid email address.'); ok = false; } else pass(em, $('#review-email-err'));
      if (msg.value.trim().length < 3) { fail(msg, $('#review-msg-err'), 'Please write a message or feedback.'); ok = false; } else pass(msg, $('#review-msg-err'));
      if (!ok) { (review.querySelector('[aria-invalid="true"]') || em).focus(); return; }
      simulate($('button[type="submit"]', review), function () { st.textContent = 'Message sent.'; review.reset(); });
    });
  }
  var sug = $('#suggest-form');
  if (sug) {
    sug.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = sug.idea, err = $('#suggest-err'), st = $('#suggest-status');
      st.textContent = '';
      if (inp.value.trim().length < 3) { fail(inp, err, 'Share an idea first.'); inp.focus(); return; }
      pass(inp, err);
      simulate($('button', sug), function () { st.textContent = 'Idea sent.'; sug.reset(); });
    });
  }

  render();
})();
