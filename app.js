/* ============================================================
   Baby Book — app.js
   ============================================================ */

const STORE_KEY = 'olm_baby_book';
let store = {};

/* ---- Storage ---- */
function loadStore() {
  try { store = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch(e) { store = {}; }
}
function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch(e) {}
}

/* ---- Theme ---- */
function applyTheme(t) {
  document.documentElement.setAttribute('data-color-theme', t);
  store.theme = t;
  saveStore();
  // Highlight active pill
  document.querySelectorAll('.theme-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.setTheme === t);
  });
}

/* ---- Font ---- */
function applyFont(f) {
  document.documentElement.setAttribute('data-font', f);
  store.font = f;
  saveStore();
  const sel = document.getElementById('fontSelect');
  if (sel) sel.value = f;
}

/* ---- Tabs ---- */
function showTab(name) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector(`.tab-btn[data-tab="${name}"]`);
  if (btn) btn.classList.add('active');
  store.lastTab = name;
  saveStore();
}

/* ---- Cover lock ---- */
function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  return months[parseInt(m, 10) - 1] + ' ' + parseInt(d, 10) + ', ' + y;
}

function lockCover() {
  const nameVal = document.getElementById('coverName').value.trim();
  const dobVal  = document.getElementById('coverDob').value;
  if (!nameVal) { alert("Please enter your baby's name first."); return; }
  store.coverName   = nameVal;
  store.coverDob    = dobVal;
  store.coverLocked = true;
  saveStore();
  document.getElementById('lockedName').textContent = nameVal;
  document.getElementById('lockedDob').textContent  = dobVal ? formatDateDisplay(dobVal) : '';
  document.getElementById('coverZone').classList.add('is-locked');
}

function unlockCover() {
  document.getElementById('coverZone').classList.remove('is-locked');
}

function bindCoverLock() {
  document.getElementById('coverSaveBtn').addEventListener('click', lockCover);
  document.getElementById('coverEditBtn').addEventListener('click', unlockCover);
  if (store.coverName) document.getElementById('coverName').value = store.coverName;
  if (store.coverDob)  document.getElementById('coverDob').value  = store.coverDob;
  if (store.coverLocked) {
    document.getElementById('lockedName').textContent = store.coverName || '';
    document.getElementById('lockedDob').textContent  = store.coverDob ? formatDateDisplay(store.coverDob) : '';
    document.getElementById('coverZone').classList.add('is-locked');
  }
}

/* ---- Photo uploads ---- */
function bindPhotoUploads() {
  document.querySelectorAll('.photo-upload-area, .milestone-photo-upload').forEach(area => {
    const input = area.querySelector('input[type=file]');
    const img   = area.querySelector('img');
    area.addEventListener('click', (e) => {
      if (e.target !== input) input && input.click();
    });
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => {
      e.preventDefault();
      area.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && img) {
        img.src = URL.createObjectURL(file);
        area.classList.add('has-photo');
      }
    });
    if (input) {
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (file && img) {
          img.src = URL.createObjectURL(file);
          area.classList.add('has-photo');
        }
      });
    }
  });
}

/* ---- Auto-save birth fields ---- */
function bindBirthFields() {
  const fields = [
    { id: 'birthFullName',    key: 'birthFullName'    },
    { id: 'birthDate',        key: 'birthDate'        },
    { id: 'birthTime',        key: 'birthTime'        },
    { id: 'birthWeight',      key: 'birthWeight'      },
    { id: 'birthLength',      key: 'birthLength'      },
    { id: 'birthHospital',    key: 'birthHospital'    },
    { id: 'birthStoryText',   key: 'birthStoryText'   },
  ];
  fields.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (store[key]) el.value = store[key];
    el.addEventListener('input', () => {
      store[key] = el.value;
      saveStore();
    });
  });
}

/* ---- Auto-save milestone dates ---- */
function bindMilestoneFields() {
  document.querySelectorAll('.milestone-date-input').forEach(input => {
    const key = 'milestone_' + input.dataset.milestone;
    if (store[key]) input.value = store[key];
    input.addEventListener('change', () => {
      store[key] = input.value;
      saveStore();
    });
  });
}

/* ---- Auto-save letter fields ---- */
function bindLetterFields() {
  document.querySelectorAll('.letter-date-input, .letter-text-input').forEach(el => {
    const key = el.dataset.letterKey;
    if (!key) return;
    if (store[key]) el.value = store[key];
    el.addEventListener('input', () => {
      store[key] = el.value;
      saveStore();
    });
  });
}

/* ============================================================
   GROWTH CHART
   ============================================================ */
let growthChart = null;
let growthEntries = [];

function renderGrowthTable() {
  const tbody = document.getElementById('growthTableBody');
  if (!tbody) return;
  if (growthEntries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="growth-table-empty">No entries yet. Add your first measurement above.</td></tr>';
    return;
  }
  tbody.innerHTML = growthEntries.map(e =>
    `<tr>
      <td>${e.month}</td>
      <td>${e.weight ? e.weight + ' lbs' : '—'}</td>
      <td>${e.height ? e.height + ' in' : '—'}</td>
    </tr>`
  ).join('');
}

function renderGrowthChart() {
  const canvas = document.getElementById('growthChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels  = growthEntries.map(e => e.month);
  const weights = growthEntries.map(e => parseFloat(e.weight) || null);
  const heights = growthEntries.map(e => parseFloat(e.height) || null);

  const accent  = getComputedStyle(document.documentElement)
                    .getPropertyValue('--theme-accent').trim() || '#3dbfbf';
  const primary = getComputedStyle(document.documentElement)
                    .getPropertyValue('--theme-primary').trim() || '#7ee8e8';

  if (growthChart) {
    growthChart.data.labels         = labels;
    growthChart.data.datasets[0].data = weights;
    growthChart.data.datasets[1].data = heights;
    growthChart.update();
    return;
  }

  growthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weight (lbs)',
          data: weights,
          borderColor: accent,
          backgroundColor: accent + '20',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: accent,
          yAxisID: 'yWeight',
        },
        {
          label: 'Height (in)',
          data: heights,
          borderColor: primary,
          backgroundColor: primary + '20',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: primary,
          yAxisID: 'yHeight',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { font: { size: 12 }, boxWidth: 14 } }
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 } }
        },
        yWeight: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 11 } },
          title: { display: true, text: 'lbs', font: { size: 10 } }
        },
        yHeight: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { font: { size: 11 } },
          title: { display: true, text: 'in', font: { size: 10 } }
        }
      }
    }
  });
}

function addGrowthEntry() {
  const monthEl  = document.getElementById('growthMonth');
  const weightEl = document.getElementById('growthWeight');
  const heightEl = document.getElementById('growthHeight');

  const month  = monthEl  ? monthEl.value.trim()  : '';
  const weight = weightEl ? weightEl.value.trim() : '';
  const height = heightEl ? heightEl.value.trim() : '';

  if (!month) { alert('Please enter a month label (e.g. "Month 1" or "June 2025").'); return; }

  growthEntries.push({ month, weight, height });
  store.growthEntries = growthEntries;
  saveStore();

  if (monthEl)  monthEl.value  = '';
  if (weightEl) weightEl.value = '';
  if (heightEl) heightEl.value = '';

  renderGrowthTable();
  renderGrowthChart();
}

function bindGrowthForm() {
  growthEntries = store.growthEntries || [];

  const addBtn = document.getElementById('growthAddBtn');
  if (addBtn) addBtn.addEventListener('click', addGrowthEntry);

  renderGrowthTable();
  if (growthEntries.length > 0) renderGrowthChart();
}

/* ============================================================
   DOMContentLoaded
   ============================================================ */

// ── FIRST YEAR IN PHOTOS ──
function buildPhotoYearGrid() {
  const grid = document.getElementById('photoYearGrid');
  if (!grid) return;
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  months.forEach((month, i) => {
    const card = document.createElement('div');
    card.className = 'month-photo-card';
    card.innerHTML = `
      <div class="month-photo-label">Month ${i+1} &middot; ${month}</div>
      <div class="month-photo-upload" id="mpu-${i}">
        <div class="mpu-placeholder">
          <div class="mpu-camera">📷</div>
          <div class="mpu-tap">Tap to add photo</div>
        </div>
        <img src="" alt="${month}" style="display:none">
        <input type="file" accept="image/*" style="display:none">
      </div>
      <input type="date" class="month-date-input" autocomplete="off" title="${month} date">
      <input type="text" class="month-caption-input" placeholder="A note about this month..." autocomplete="new-password">
    `;
    grid.appendChild(card);

    // Bind upload
    const area  = card.querySelector('.month-photo-upload');
    const input = card.querySelector('input[type=file]');
    const img   = card.querySelector('img');
    const ph    = card.querySelector('.mpu-placeholder');

    area.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (file) {
        img.src = URL.createObjectURL(file);
        img.style.display = 'block';
        ph.style.display  = 'none';
      }
    });
  });
}


// ── SPARKLE BURST ON TAB CLICK ──
function spawnSparkles(x, y) {
  const colors = ['#7ee8e8','#f4a7b9','#c4b5fd','#a8c5a0','#fde68a','#fb7185','#67e8f9'];
  const container = document.createElement('div');
  container.className = 'sparkle-container';
  document.body.appendChild(container);

  const count = 12;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'sparkle';
    const angle = (360 / count) * i + (Math.random() * 20 - 10);
    const dist  = 32 + Math.random() * 36;
    const rad   = angle * Math.PI / 180;
    const dx    = Math.cos(rad) * dist;
    const dy    = Math.sin(rad) * dist;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = 4 + Math.random() * 5;
    s.style.cssText = `
      left:${x}px; top:${y}px;
      width:${size}px; height:${size}px;
      background:${color};
      --dx:${dx}px; --dy:${dy}px;
      box-shadow: 0 0 6px ${color};
    `;
    container.appendChild(s);
  }
  setTimeout(() => container.remove(), 650);
}


document.addEventListener('DOMContentLoaded', () => {
  loadStore();

  applyTheme(store.theme || 'teal-dream');
  applyFont(store.font   || 'soft');

  bindCoverLock();
  bindPhotoUploads();
  bindBirthFields();
  bindMilestoneFields();
  bindLetterFields();
  bindGrowthForm();
  buildPhotoYearGrid();

  showTab(store.lastTab || 'cover');

  // Theme pills
  document.querySelectorAll('[data-set-theme]').forEach(btn =>
    btn.addEventListener('click', () => applyTheme(btn.dataset.setTheme))
  );

  // Font buttons (if any)
  document.querySelectorAll('[data-set-font]').forEach(btn =>
    btn.addEventListener('click', () => applyFont(btn.dataset.setFont))
  );

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn =>
    btn.addEventListener('click', () => showTab(btn.dataset.tab))
  );

  // Font select
  const fontSel = document.getElementById('fontSelect');
  if (fontSel) {
    fontSel.addEventListener('change', () => applyFont(fontSel.value));
  }

  // ── SETTINGS TRAY ──
  const settingsBtn  = document.getElementById('settingsBtn');
  const settingsTray = document.getElementById('settingsTray');
  if (settingsBtn && settingsTray) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = settingsTray.classList.toggle('open');
      settingsTray.setAttribute('aria-hidden', String(!isOpen));
      settingsBtn.textContent = isOpen ? '✕' : '⚙️';
    });
    // Close tray when tapping anywhere outside it
    document.addEventListener('click', (e) => {
      if (!settingsTray.contains(e.target) && e.target !== settingsBtn) {
        settingsTray.classList.remove('open');
        settingsTray.setAttribute('aria-hidden', 'true');
        settingsBtn.textContent = '⚙️';
      }
    });
    // Close tray when a theme or font is picked
    settingsTray.addEventListener('click', () => {
      setTimeout(() => {
        settingsTray.classList.remove('open');
        settingsTray.setAttribute('aria-hidden', 'true');
        settingsBtn.textContent = '⚙️';
      }, 300);
    });
  }


});
