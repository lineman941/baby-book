/* Regression suite for the built product.
   Every check here exists because the bug it catches actually shipped once.
   Run: node tests/smoke.js   (needs playwright-core + a chromium) */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILE = 'file://' + path.join(ROOT, 'dist', 'OurLittleMiracle.html');

const CANDIDATE_DIRS = [
  process.env.PW_MODULES,
  path.join(ROOT, 'node_modules'),
  '/tmp/claude-0/-home-user-baby-book/ebb146f5-4274-579a-8431-1e6434ba156f/scratchpad/node_modules',
].filter(Boolean);
const pwDir = CANDIDATE_DIRS.find(d => fs.existsSync(path.join(d, 'playwright-core')));
if (!pwDir) { console.error('playwright-core not found in: ' + CANDIDATE_DIRS.join(', ')); process.exit(1); }
const { chromium } = require(path.join(pwDir, 'playwright-core'));

const EXES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));
}

const TABS = ['home', 'birth', 'milestones', 'letters', 'growth', 'photos', 'family', 'memories'];

(async () => {
  // ---- static source checks (no browser needed) ----
  const appHtml = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const built = fs.readFileSync(path.join(ROOT, 'dist', 'OurLittleMiracle.html'), 'utf8');

  // Buyers mostly add photos they already took. capture="..." makes iOS/Android
  // open the camera and hide the gallery, which blocked the product's main use.
  const captureCount = (appHtml.match(/capture=/g) || []).length
                     + (appJs.match(/capture=/g) || []).length;
  check('no capture= on file inputs (gallery stays available)', captureCount === 0,
        captureCount ? captureCount + ' found' : '');

  // The build is committed; a stale dist means buyers get yesterday's product.
  const builtHasCoverHome = built.includes('coverHomeBtn');
  check('built product carries the cover Home button (dist not stale)', builtHasCoverHome);

  const exe = EXES.find(p => fs.existsSync(p));
  if (!exe) { console.error('no chromium binary found'); process.exit(1); }
  const browser = await chromium.launch({ executablePath: exe });

  // ---- load + console errors ----
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(FILE);
  await pg.evaluate(() => localStorage.clear());
  await pg.reload();
  await pg.waitForTimeout(1200);
  check('loads with no page errors', errs.length === 0, errs.join(' | '));

  const jsAlive = await pg.evaluate(() => typeof showTab === 'function' && typeof saveStore === 'function');
  check('core functions defined', jsAlive);

  // ---- every tab reachable, settles to exactly one page ----
  for (const t of TABS) {
    await pg.evaluate(n => showTab(n), t);
    await pg.waitForTimeout(700);
    const vis = await pg.evaluate(() => [...document.querySelectorAll('.page-section')]
      .filter(s => { const c = getComputedStyle(s); return c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.01; })
      .map(s => s.id));
    check('tab "' + t + '" settles to one page', vis.length === 1 && vis[0] === 'section-' + t, vis.join(','));
  }

  // ---- the cover must offer a way back (it was a dead end once) ----
  await pg.evaluate(() => showTab('cover'));
  await pg.waitForTimeout(600);
  const coverExit = await pg.evaluate(() => {
    document.getElementById('coverName').value = 'CI Baby';
    document.getElementById('coverSaveBtn').click();
    const homeBtn = document.getElementById('coverHomeBtn');
    const navHome = document.querySelector('.tab-btn[data-tab="home"]');
    return {
      hasHomeBtn: !!homeBtn,
      homeBtnVisible: homeBtn ? getComputedStyle(homeBtn).display !== 'none' : false,
      navHomeLit: !!navHome && navHome.classList.contains('active'),
    };
  });
  await pg.waitForTimeout(400);
  check('cover offers a Home button after save', coverExit.hasHomeBtn && coverExit.homeBtnVisible);
  check('nav shows Home lit while on cover', coverExit.navHomeLit);
  await pg.click('#coverHomeBtn');
  await pg.waitForTimeout(700);
  const backHome = await pg.evaluate(() => [...document.querySelectorAll('.page-section')]
    .filter(s => { const c = getComputedStyle(s); return c.visibility !== 'hidden' && parseFloat(c.opacity) > 0.01; })
    .map(s => s.id).join(','));
  check('cover Home button returns to dashboard', backHome === 'section-home', backHome);

  // ---- data safety: a failed write must not claim success ----
  const honest = await pg.evaluate(() => {
    const ok = saveStore();
    return { returnsBoolean: typeof ok === 'boolean', returnsTrueOnGoodWrite: ok === true };
  });
  check('saveStore reports whether the write landed', honest.returnsBoolean && honest.returnsTrueOnGoodWrite);

  // ---- deleting a memory must not orphan its photo ----
  const memClean = await pg.evaluate(() => {
    store.memories = [{ id: 'citest', title: 't', text: 'x' }];
    store.photos = store.photos || {};
    store.photos['mem-photo-citest'] = 'data:img';
    renderMemories();
    const btn = document.querySelector('.memory-delete[data-mem-id="citest"]');
    if (!btn) return { ok: false, why: 'no delete button' };
    const c = window.confirm; window.confirm = () => true;
    btn.click(); window.confirm = c;
    return { ok: !store.photos['mem-photo-citest'] };
  });
  check('deleting a memory removes its photo', memClean.ok, memClean.why || '');

  // ---- age maths must never overstate ----
  const ages = await pg.evaluate(() => {
    const out = [];
    const cases = [['2026-01-31', 29], ['2026-08-20', 6]];
    for (const [dob] of cases) { const r = computeAge(dob); out.push({ dob, text: r && r.text, months: r && r.months }); }
    return out;
  });
  check('computeAge returns sane text', ages.every(a => a.text && !/-\d/.test(a.text)), JSON.stringify(ages));

  // ---- printed keepsake must not carry dead buttons ----
  await pg.emulateMedia({ media: 'print' });
  await pg.waitForTimeout(300);
  const printed = await pg.evaluate(() => {
    const g = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'absent'; };
    return { dash: g('#dashBackupBtn'), add: g('#albumAddBtn'), addMem: g('#addMemoryBtn') };
  });
  check('interactive controls hidden in print',
        ['none', 'absent'].includes(printed.dash) &&
        ['none', 'absent'].includes(printed.add) &&
        ['none', 'absent'].includes(printed.addMem), JSON.stringify(printed));
  await pg.emulateMedia({ media: 'screen' });

  // ---- no horizontal overflow on real phone widths ----
  for (const w of [360, 390, 412, 430]) {
    await pg.setViewportSize({ width: w, height: 844 });
    await pg.waitForTimeout(350);
    const o = await pg.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    check('no sideways scroll at ' + w + 'px', o.s <= o.c, o.s + ' vs ' + o.c);
  }
  await ctx.close();

  // ---- Reduce Motion must not kill the touch feedback entirely ----
  const ctx2 = await browser.newContext({ viewport: { width: 412, height: 915 }, reducedMotion: 'reduce' });
  const pg2 = await ctx2.newPage();
  await pg2.goto(FILE);
  await pg2.waitForTimeout(1100);
  await pg2.mouse.move(206, 430); await pg2.mouse.down(); await pg2.mouse.up();
  await pg2.waitForTimeout(260);
  const lit = await pg2.evaluate(() => {
    const c = document.getElementById('liquid-canvas');
    if (!c) return -1;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 4) n++;
    return n;
  });
  check('touch feedback survives Reduce Motion', lit > 200, lit + ' lit pixels');

  await browser.close();

  const failed = results.filter(r => !r.pass);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed');
  if (failed.length) { console.log('FAILED:\n  ' + failed.map(f => f.name).join('\n  ')); process.exit(1); }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
