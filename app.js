/* ============================================================
   Our Little Miracle — app.js  (COMPLETE REBUILD)
   All sections wired, auto-save, growth chart, photo uploads
============================================================ */

const STORE_KEY = 'olm_baby_book';
let store = {};
let growthChart = null;

/* ── Storage ── */
function loadStore() {
  try { store = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) { store = {}; }
}
function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    flashSave();
  } catch(e) {}
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
  setTimeout(() => t.classList.remove('show'), 2200);
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
function showTab(name) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector('.tab-btn[data-tab="' + name + '"]');
  if (btn) btn.classList.add('active');
  store.lastTab = name;
  saveStore();
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
      if (!tray.contains(e.target) && e.target !== btn) {
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
  showToast('Cover saved! 💗');
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
  fieldList.forEach(({ id, key, type }) => {
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

/* ── Photo uploads ── */
function bindPhotoUploads() {
  document.querySelectorAll('.photo-upload-area, .milestone-photo-upload').forEach(area => {
    const input = area.querySelector('input[type=file]');
    const img = area.querySelector('img');
    if (!input) return;
    area.addEventListener('click', e => {
      if (e.target !== input) input.click();
    });
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && img) { img.src = URL.createObjectURL(file); area.classList.add('has-photo'); }
    });
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file && img) { img.src = URL.createObjectURL(file); area.classList.add('has-photo'); }
    });
  });
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
    showToast('Growth entry added! 📊');
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
    card.innerHTML = '<div class="milestone-label">📸 ' + month + '</div>' +
      '<div class="milestone-photo-upload" id="yr-photo-' + idx + '">' +
      '<div class="ms-placeholder">📷</div>' +
      '<img alt="Month ' + (idx+1) + ' photo">' +
      '<input type="file" accept="image/*" capture="environment">' +
      '</div>' +
      '<input type="text" id="yr-note-' + idx + '" placeholder="Memory from ' + month + '…" autocomplete="off" style="margin-top:8px;">';
    grid.appendChild(card);
    // Bind note field
    const noteField = document.getElementById('yr-note-' + idx);
    if (noteField) {
      const storeKey = 'yr-note-' + idx;
      if (store[storeKey]) noteField.value = store[storeKey];
      noteField.addEventListener('input', () => { store[storeKey] = noteField.value; saveStore(); });
    }
  });
  bindPhotoUploads();
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
  bindCoverLock();
  bindPhotoUploads();
  bindGrowthForm();
  buildPhotoYearGrid();
  buildGrowthChart();

  // Restore last tab
  if (store.lastTab) showTab(store.lastTab);
  else showTab('cover');

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
    { id: 'gmMom' }, { id: 'gpMom' },
    { id: 'gmDad' }, { id: 'gpDad' },
    { id: 'siblings' }, { id: 'pets' }
  ]);

  // Holidays
  bindFields([
    { id: 'hol-christmas' }, { id: 'hol-christmas-note' },
    { id: 'hol-halloween' }, { id: 'hol-halloween-note' },
    { id: 'hol-easter' }, { id: 'hol-easter-note' },
    { id: 'hol-thanksgiving' }, { id: 'hol-thanksgiving-note' },
    { id: 'hol-july4' }, { id: 'hol-july4-note' },
    { id: 'hol-birthday' }, { id: 'hol-birthday-note' }
  ]);

  // Name story
  bindFields([
    { id: 'nameStory' }, { id: 'nameMeaning' },
    { id: 'nameOrigin' }, { id: 'nameNicknames' }
  ]);

  // More
  bindFields([
    { id: 'personalityNotes' }, { id: 'favoriteSong' },
    { id: 'favoriteActivity' }, { id: 'birthZodiac' },
    { id: 'birthstone' }, { id: 'worldEvents' }, { id: 'anythingElse' }
  ]);
});
