/* ============================================================
   Our Little Miracle — app.js
   All sections wired, auto-save (text + photos), growth chart,
   memories, backup/restore, print to PDF
============================================================ */

const STORE_KEY = 'olm_baby_book';
let store = {};
let growthChart = null;

/* Asset lookup: repo build uses assets/ paths; the single-file product build
   injects OLM_ASSETS (name -> data URI) before this script. */
function assetUrl(name) {
  return (typeof OLM_ASSETS !== 'undefined' && OLM_ASSETS[name]) ? OLM_ASSETS[name] : 'assets/' + name;
}

/* ── Storage ── */
function loadStore() {
  try { store = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) { store = {}; }
  if (!store.photos) store.photos = {};
  if (!store.memories) store.memories = [];
}
function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    flashSave();
  } catch(e) {
    showToast('Storage is full — use Backup, or remove a photo');
  }
}
function flashSave() {
  const ind = document.getElementById('saveIndicator');
  if (!ind) return;
  ind.classList.add('visible');
  clearTimeout(ind._t);
  ind._t = setTimeout(() => ind.classList.remove('visible'), 1500);
}
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ── Theme ── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-color-theme', t);
  store.theme = t;
  saveStore();
  document.querySelectorAll('.theme-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.setTheme === t);
  });
}

/* ── Font ── */
function applyFont(f) {
  document.documentElement.setAttribute('data-font', f);
  store.font = f;
  saveStore();
  const sel = document.getElementById('fontSelect');
  if (sel) sel.value = f;
}

/* ── Tabs ── */
let flipTimer = null;
const TAB_ORDER = ['home','cover','birth','milestones','letters','growth','photos','family','memories'];

function clearFlip(el) {
  if (!el) return;
  el.classList.remove('flipping-out', 'flipping-in');
}

function showTab(name, opts) {
  const target = document.getElementById('section-' + name);
  if (!target) return;
  const current = document.querySelector('.page-section.active');
  const animate = !(opts && opts.instant) && current && current !== target;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector('.tab-btn[data-tab="' + name + '"]');
  if (btn) btn.classList.add('active');

  if (name === 'home') renderDashboard();

  if (animate) {
    const out = current;
    // settle any turn still in flight so rapid taps can't strand a page
    clearTimeout(flipTimer);
    document.querySelectorAll('.page-section').forEach(el => {
      if (el !== out && el !== target) el.classList.remove('active');
      clearFlip(el);
    });
    out.classList.add('flipping-out');
    target.classList.add('active', 'flipping-in');
    target.scrollTop = 0;
    flipTimer = setTimeout(() => {
      out.classList.remove('active');
      clearFlip(out); clearFlip(target);
    }, 500);
  } else {
    clearTimeout(flipTimer);
    document.querySelectorAll('.page-section').forEach(s => { s.classList.remove('active'); clearFlip(s); });
    target.classList.add('active');
    target.scrollTop = 0;
  }

  store.lastTab = name;
  saveStore();
}

/* Swipe left/right to turn pages */
function bindSwipe() {
  let x0 = null, y0 = null, t0 = 0;
  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    x0 = null;
    if (Date.now() - t0 > 600) return;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const cur = store.lastTab || 'home';
    let i = TAB_ORDER.indexOf(cur);
    if (i < 0) i = 0;
    const ni = dx < 0 ? Math.min(i + 1, TAB_ORDER.length - 1) : Math.max(i - 1, 0);
    if (ni !== i) showTab(TAB_ORDER[ni]);
  }, { passive: true });
}

/* ── Settings tray ── */
function bindSettings() {
  const btn = document.getElementById('settingsBtn');
  const tray = document.getElementById('settingsTray');
  if (btn && tray) {
    btn.addEventListener('click', () => {
      const open = tray.classList.toggle('open');
      tray.setAttribute('aria-hidden', !open);
    });
    document.addEventListener('click', e => {
      if (!tray.contains(e.target) && !btn.contains(e.target)) {
        tray.classList.remove('open');
        tray.setAttribute('aria-hidden', 'true');
      }
    });
  }
  document.querySelectorAll('.theme-pill').forEach(p => {
    p.addEventListener('click', () => applyTheme(p.dataset.setTheme));
  });
  const fontSel = document.getElementById('fontSelect');
  if (fontSel) fontSel.addEventListener('change', () => applyFont(fontSel.value));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });
}

/* ── Backup / Restore / Print ── */
function exportBackup() {
  const name = (store.coverName || 'baby').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const blob = new Blob([JSON.stringify(store)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'our-little-miracle-' + name + '-backup.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  showToast('Backup downloaded — keep it somewhere safe!');
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object') throw new Error('bad');
      store = data;
      if (!store.photos) store.photos = {};
      if (!store.memories) store.memories = [];
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      showToast('Book restored! Reloading…');
      setTimeout(() => location.reload(), 900);
    } catch(e) {
      showToast("That doesn't look like a backup file");
    }
  };
  reader.readAsText(file);
}
function bindBackup() {
  const exp = document.getElementById('backupBtn');
  if (exp) exp.addEventListener('click', exportBackup);
  const impBtn = document.getElementById('restoreBtn');
  const impInput = document.getElementById('restoreInput');
  if (impBtn && impInput) {
    impBtn.addEventListener('click', () => impInput.click());
    impInput.addEventListener('change', () => {
      if (impInput.files[0]) importBackup(impInput.files[0]);
      impInput.value = '';
    });
  }
  const printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
}

/* ── Cover lock ── */
function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  return months[parseInt(m, 10) - 1] + ' ' + parseInt(d, 10) + ', ' + y;
}
function lockCover() {
  const nameVal = document.getElementById('coverName').value.trim();
  const dobVal = document.getElementById('coverDob').value;
  if (!nameVal) { showToast("Please enter your baby's name first!"); return; }
  store.coverName = nameVal;
  store.coverDob = dobVal;
  store.coverLocked = true;
  saveStore();
  document.getElementById('lockedName').textContent = nameVal;
  document.getElementById('lockedDob').textContent = dobVal ? formatDateDisplay(dobVal) : '';
  document.getElementById('coverZone').classList.add('is-locked');
  showToast('Cover saved');
}
function unlockCover() {
  document.getElementById('coverZone').classList.remove('is-locked');
}
function bindCoverLock() {
  const saveBtn = document.getElementById('coverSaveBtn');
  const editBtn = document.getElementById('coverEditBtn');
  if (saveBtn) saveBtn.addEventListener('click', lockCover);
  if (editBtn) editBtn.addEventListener('click', unlockCover);
  if (store.coverName) document.getElementById('coverName').value = store.coverName;
  if (store.coverDob) document.getElementById('coverDob').value = store.coverDob;
  if (store.coverLocked) {
    document.getElementById('lockedName').textContent = store.coverName || '';
    document.getElementById('lockedDob').textContent = store.coverDob ? formatDateDisplay(store.coverDob) : '';
    document.getElementById('coverZone').classList.add('is-locked');
  }
}

/* ── Generic field auto-save ── */
function bindFields(fieldList) {
  fieldList.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const storeKey = key || id;
    if (store[storeKey]) el.value = store[storeKey];
    el.addEventListener('input', () => {
      store[storeKey] = el.value;
      saveStore();
    });
    el.addEventListener('change', () => {
      store[storeKey] = el.value;
      saveStore();
    });
  });
}

/* ── Photo uploads (persisted) ── */
function resizeImageFile(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1000;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        const scale = MAX / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => showToast("Couldn't read that photo");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function setAreaPhoto(area, dataUrl, persist) {
  const img = area.querySelector('img');
  if (!img) return;
  img.src = dataUrl;
  area.classList.add('has-photo');
  if (persist && area.id) {
    store.photos[area.id] = dataUrl;
    saveStore();
  }
}
function handlePhotoFile(area, file) {
  if (!file || !file.type || file.type.indexOf('image') !== 0) return;
  resizeImageFile(file, dataUrl => setAreaPhoto(area, dataUrl, true));
}
function bindPhotoUploads() {
  document.querySelectorAll('.photo-upload-area, .milestone-photo-upload').forEach(area => {
    if (area._photoBound) return;
    area._photoBound = true;
    const input = area.querySelector('input[type=file]');
    if (!input) return;
    if (area.id && store.photos[area.id]) setAreaPhoto(area, store.photos[area.id], false);
    area.addEventListener('click', e => {
      if (e.target !== input) input.click();
    });
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      handlePhotoFile(area, e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => handlePhotoFile(area, input.files[0]));
  });
}



/* ── Liquid touch ripple + sparkle (theme-tinted, respects reduced-motion) ── */
function initLiquidCanvas() {
  const canvas = document.getElementById('liquid-canvas');
  if (!canvas || !canvas.getContext) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, ripples = [], sparks = [], idle = 0, last = { x: 0, y: 0 };

  function themeRGB() {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--tp').trim() || '#5ee7e7';
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v);
    return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [94,231,231];
  }
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function addRipple(x, y, op, maxR, sp) {
    if (ripples.length > 22) return;
    ripples.push({ x, y, r: 0, maxR: maxR || 110 + Math.random() * 70,
                   opacity: op || 0.16, speed: sp || 1.3 + Math.random() * 0.7 });
  }
  function addSparks(x, y, n) {
    for (let i = 0; i < (n || 6); i++) {
      const a = Math.random() * Math.PI * 2, d = 12 + Math.random() * 30;
      sparks.push({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6,
                    vx: Math.cos(a) * (0.5 + Math.random()), vy: Math.sin(a) * (0.5 + Math.random()) - 0.35,
                    life: 1, size: 1.2 + Math.random() * 2.2, tw: Math.random() * 6.283 });
    }
  }
  function touchAt(x, y) { addRipple(x, y, 0.22, 150, 2.0); addSparks(x, y, 7); }

  document.addEventListener('pointerdown', e => touchAt(e.clientX, e.clientY), { passive: true });
  document.addEventListener('pointermove', e => {
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (dx * dx + dy * dy > 400) { addRipple(e.clientX, e.clientY); last = { x: e.clientX, y: e.clientY }; }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    const t = e.touches[0]; if (!t) return;
    const dx = t.clientX - last.x, dy = t.clientY - last.y;
    if (dx * dx + dy * dy > 900) { addRipple(t.clientX, t.clientY); last = { x: t.clientX, y: t.clientY }; }
  }, { passive: true });

  function ambient() { addRipple(W * (0.1 + Math.random() * 0.8), H * (0.1 + Math.random() * 0.8), 0.09, 70 + Math.random() * 50, 0.5); }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const [r, g, bl] = themeRGB();
    ripples = ripples.filter(p => p.opacity > 0.005 && p.r < p.maxR * 1.4);
    for (const p of ripples) {
      p.r += p.speed; p.opacity *= 0.975;
      const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.15, p.x, p.y, Math.max(p.r, 1));
      grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + bl + ',0)');
      grad.addColorStop(0.55, 'rgba(' + r + ',' + g + ',' + bl + ',' + (p.opacity * 0.85) + ')');
      grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + bl + ',0)');
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(p.r, 1), 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();
    }
    sparks = sparks.filter(s => s.life > 0.02);
    for (const s of sparks) {
      s.x += s.vx; s.y += s.vy; s.vy += 0.012; s.life *= 0.955; s.tw += 0.35;
      const tw = 0.55 + 0.45 * Math.sin(s.tw);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * s.life * tw, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (s.life * 0.85 * tw) + ')';
      ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + bl + ',' + s.life + ')';
      ctx.fill(); ctx.shadowBlur = 0;
    }
    if (++idle % 150 === 0) ambient();
    requestAnimationFrame(draw);
  }
  for (let i = 0; i < 3; i++) setTimeout(ambient, i * 700);
  draw();
}

/* ── Live age ── */
function computeAge(dob) {
  if (!dob) return null;
  const b = new Date(dob + 'T00:00:00'), now = new Date();
  if (isNaN(b) || b > now) return null;
  let y = now.getFullYear() - b.getFullYear();
  let m = now.getMonth() - b.getMonth();
  let d = now.getDate() - b.getDate();
  if (d < 0) { m--; const pm = new Date(now.getFullYear(), now.getMonth(), 0).getDate(); d += pm; }
  if (m < 0) { y--; m += 12; }
  const months = y * 12 + m;
  const parts = [];
  if (y > 0) parts.push(y + (y === 1 ? ' year' : ' years'));
  if (m > 0) parts.push(m + (m === 1 ? ' month' : ' months'));
  if (parts.length < 2 && d > 0) parts.push(d + (d === 1 ? ' day' : ' days'));
  const totalDays = Math.floor((now - b) / 86400000);
  return { text: parts.length ? parts.join(', ') + ' old' : 'Born today', months, totalDays };
}

/* ── Dashboard ── */
const MILESTONE_LIST = [
  { key: 'ms-smile-date', name: 'First Smile' },
  { key: 'ms-roll-date',  name: 'First Crawl' },
  { key: 'ms-tooth-date', name: 'First Tooth' },
  { key: 'ms-steps-date', name: 'First Steps' },
  { key: 'ms-sleep-date', name: 'Sleeping Through the Night' },
  { key: 'ms-food-date',  name: 'First Solid Food' },
  { key: 'ms-word-date',  name: 'First Word' },
  { key: 'ms-toy-name',   name: 'Favorite Toy' },
];

function renderDashboard() {
  const grid = document.getElementById('bentoGrid');
  if (!grid) return;
  const name = store.coverName || '';
  const age = computeAge(store.coverDob);
  const photoKeys = Object.keys(store.photos || {});
  const lastPhoto = photoKeys.length ? store.photos[photoKeys[photoKeys.length - 1]] : null;
  const done = MILESTONE_LIST.filter(m => store[m.key]);
  const next = MILESTONE_LIST.find(m => !store[m.key]);
  const g = (store.growthEntries || []).slice(-1)[0];
  const memCount = (store.memories || []).length;
  const pct = Math.round((done.length / MILESTONE_LIST.length) * 100);

  const esc = escapeHtml;
  let html = '';

  // Hero tile
  html += '<div class="tile hero-tile" data-goto="cover">';
  if (name) {
    html += '<div class="hero-name">' + esc(name) + '</div>';
    if (age) {
      html += '<div class="hero-age">' + esc(age.text) + '</div>';
      html += '<div class="hero-dob">' + esc(formatDateDisplay(store.coverDob)) + ' &middot; day ' + age.totalDays + '</div>';
      html += '<div class="tile-cta">Open the cover &rarr;</div>';
    } else {
      html += '<div class="hero-age">Add a birth date to see their age</div>';
    }
  } else {
    html += '<div class="hero-name">Welcome</div>';
    html += '<div class="hero-age">Start with your baby\'s name</div>';
    html += '<div class="tile-cta" data-goto="cover">Open the cover &rarr;</div>';
  }
  html += '</div>';

  // Latest photo
  html += '<div class="tile tile-photo" data-goto="photos">';
  html += lastPhoto ? '<img src="' + lastPhoto + '" alt="Latest photo">'
                    : '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="#c8c8d0" stroke-width="1.5" width="30" height="30"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Add a photo</span></div>';
  html += '</div>';

  // Milestones progress
  html += '<div class="tile" data-goto="milestones">';
  html += '<div class="tile-label">Firsts</div>';
  html += '<div class="tile-stat">' + done.length + '<span style="font-size:15px;color:#b0b0ba;font-weight:800;">/' + MILESTONE_LIST.length + '</span></div>';
  html += '<div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div>';
  html += '<div class="tile-sub">' + (next ? 'Next: ' + esc(next.name) : 'All captured!') + '</div>';
  html += '</div>';

  // Growth
  html += '<div class="tile" data-goto="growth">';
  html += '<div class="tile-label">Growth</div>';
  if (g) {
    html += '<div class="tile-stat">' + esc(String(g.weight || '—')) + '<span style="font-size:14px;color:#b0b0ba;"> lbs</span></div>';
    html += '<div class="tile-sub">' + esc(String(g.height || '—')) + ' in &middot; month ' + esc(String(g.age)) + '</div>';
  } else {
    html += '<div class="tile-stat" style="color:#c8c8d0;">—</div><div class="tile-sub">Log weight &amp; height</div>';
  }
  html += '</div>';

  // Memories
  html += '<div class="tile" data-goto="memories">';
  html += '<div class="tile-label">Memories</div>';
  html += '<div class="tile-stat">' + memCount + '</div>';
  html += '<div class="tile-sub">' + (memCount ? 'moments saved' : 'Write your first') + '</div>';
  html += '</div>';

  // Photos count
  html += '<div class="tile" data-goto="photos">';
  html += '<div class="tile-label">Photos</div>';
  html += '<div class="tile-stat">' + photoKeys.length + '</div>';
  html += '<div class="tile-sub">added so far</div>';
  html += '</div>';

  grid.innerHTML = html;
  grid.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => showTab(el.dataset.goto));
  });

  const greet = document.getElementById('homeGreeting');
  if (greet && name) greet.textContent = 'Every first, in one place';
}

/* ── Growth chart ── */
function buildGrowthChart() {
  const canvas = document.getElementById('growthChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const entries = store.growthEntries || [];
  if (growthChart) growthChart.destroy();
  growthChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: entries.map(e => 'Mo ' + e.age),
      datasets: [
        { label: 'Weight (lbs)', data: entries.map(e => parseFloat(e.weight) || null),
          borderColor: '#1aafaf', backgroundColor: 'rgba(94,231,231,.15)',
          tension: .4, fill: true, pointRadius: 5 },
        { label: 'Height (in)', data: entries.map(e => parseFloat(e.height) || null),
          borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,.1)',
          tension: .4, fill: false, pointRadius: 5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: true, position: 'bottom' } },
      scales: { y: { beginAtZero: false }, x: { grid: { display: false } } }
    }
  });
}
function bindGrowthForm() {
  const addBtn = document.getElementById('addGrowthBtn');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    const age = document.getElementById('growthAge').value;
    const weight = document.getElementById('currentWeight').value;
    const height = document.getElementById('currentHeight').value;
    const headCirc = document.getElementById('headCirc').value;
    if (!age) { showToast('Please enter the age in months'); return; }
    if (!store.growthEntries) store.growthEntries = [];
    store.growthEntries.push({ age, weight, height, headCirc, date: new Date().toISOString().split('T')[0] });
    store.growthEntries.sort((a, b) => Number(a.age) - Number(b.age));
    saveStore();
    buildGrowthChart();
    document.getElementById('growthAge').value = '';
    document.getElementById('currentWeight').value = '';
    document.getElementById('currentHeight').value = '';
    document.getElementById('headCirc').value = '';
    showToast('Growth entry added');
  });
}

/* ── First Year Photo Grid ── */
function buildPhotoYearGrid() {
  const grid = document.getElementById('photoYearGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  months.forEach((month, idx) => {
    const card = document.createElement('div');
    card.className = 'milestone-card';
    card.innerHTML = '<div class="milestone-label">' + month + '</div>' +
      '<div class="milestone-photo-upload" id="yr-photo-' + idx + '">' +
      '<div class="ms-placeholder"><img src="' + '' + '" alt=""></div>' +
      '<img alt="Month ' + (idx+1) + ' photo">' +
      '<input type="file" accept="image/*" capture="environment">' +
      '</div>' +
      '<input type="text" id="yr-note-' + idx + '" placeholder="Memory from ' + month + '…" autocomplete="off" style="margin-top:8px;">';
    grid.appendChild(card);
    const noteField = document.getElementById('yr-note-' + idx);
    if (noteField) {
      const storeKey = 'yr-note-' + idx;
      if (store[storeKey]) noteField.value = store[storeKey];
      noteField.addEventListener('input', () => { store[storeKey] = noteField.value; saveStore(); });
    }
  });
  bindPhotoUploads();
}

/* ── Memories ── */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function renderMemories() {
  const grid = document.getElementById('memoriesGrid');
  if (!grid) return;
  grid.innerHTML = '';
  (store.memories || []).forEach(mem => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.style.width = '100%';
    card.innerHTML =
      '<div class="memory-title">' + escapeHtml(mem.title || 'Memory') +
        (mem.date ? ' · ' + escapeHtml(formatDateDisplay(mem.date)) : '') + '</div>' +
      '<div style="font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap;">' + escapeHtml(mem.text || '') + '</div>' +
      '<button class="memory-delete" data-mem-id="' + mem.id + '" aria-label="Delete memory" ' +
        'style="background:none;border:none;color:#c97b8a;font-size:12px;font-weight:700;cursor:pointer;margin-top:10px;padding:0;">Remove</button>';
    grid.appendChild(card);
  });
  grid.querySelectorAll('.memory-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Remove this memory?')) return;
      store.memories = store.memories.filter(m => String(m.id) !== btn.dataset.memId);
      saveStore();
      renderMemories();
    });
  });
}
function bindMemories() {
  const addBtn = document.getElementById('addMemoryBtn');
  const form = document.getElementById('memoryForm');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    if (form) { form.style.display = form.style.display === 'none' ? 'block' : 'none'; return; }
  });
  const saveBtn = document.getElementById('memorySaveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const title = document.getElementById('memoryTitle').value.trim();
      const date = document.getElementById('memoryDate').value;
      const text = document.getElementById('memoryText').value.trim();
      if (!title && !text) { showToast('Write a little something first'); return; }
      store.memories.push({ id: Date.now(), title, date, text });
      saveStore();
      document.getElementById('memoryTitle').value = '';
      document.getElementById('memoryDate').value = '';
      document.getElementById('memoryText').value = '';
      if (form) form.style.display = 'none';
      renderMemories();
      showToast('Memory saved');
    });
  }
  renderMemories();
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  loadStore();

  // Apply saved theme/font
  if (store.theme) applyTheme(store.theme);
  else applyTheme('teal-dream');
  if (store.font) applyFont(store.font);

  // Bind UI
  bindSettings();
  bindBackup();
  bindCoverLock();
  bindGrowthForm();
  buildPhotoYearGrid();
  buildGrowthChart();
  bindMemories();
  bindPhotoUploads();

  // Restore last tab
  renderDashboard();
  bindSwipe();
  initLiquidCanvas();
  showTab(store.lastTab && document.getElementById('section-' + store.lastTab) ? store.lastTab : 'home', { instant: true });

  // Birth fields
  bindFields([
    { id: 'birthFullName' }, { id: 'birthDate' }, { id: 'birthTime' },
    { id: 'birthWeight' }, { id: 'birthLength' }, { id: 'birthHospital' },
    { id: 'birthStoryText' }
  ]);

  // Milestone fields
  bindFields([
    { id: 'ms-smile-date' }, { id: 'ms-smile-note' },
    { id: 'ms-sleep-date' }, { id: 'ms-sleep-note' },
    { id: 'ms-food-date' }, { id: 'ms-food-note' },
    { id: 'ms-tooth-date' }, { id: 'ms-tooth-note' },
    { id: 'ms-word-date' }, { id: 'ms-word-note' },
    { id: 'ms-steps-date' }, { id: 'ms-steps-note' },
    { id: 'ms-roll-date' }, { id: 'ms-roll-note' },
    { id: 'ms-toy-name' }, { id: 'ms-toy-note' }
  ]);

  // Letters
  bindFields([
    { id: 'letterToBaby' }, { id: 'firstImpressions' },
    { id: 'dreamsWishes' }, { id: 'funnyMoments' }
  ]);

  // Family
  bindFields([
    { id: 'momName' }, { id: 'momFact' },
    { id: 'dadName' }, { id: 'dadFact' },
    { id: 'gp1Name' }, { id: 'gp2Name' },
    { id: 'gp3Name' }, { id: 'gp4Name' },
    { id: 'siblingsNote' }
  ]);
});
