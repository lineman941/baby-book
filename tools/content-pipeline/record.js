/* Generic scene runner for the TikTok script bank.
   Reads one recipe from scenes.json, drives the built product in a real
   browser, records it, and hands off a raw .webm for encode.sh to finish.

   Usage: node record.js <scene-id> <output-dir>
   Needs: playwright-core + a chromium binary (see PW_MODULES / CHROME_PATH
   below — these point at this session's scratchpad install; override with
   env vars on a machine where deps live elsewhere). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const sceneId = parseInt(process.argv[2], 10);
const outDir = process.argv[3] || path.join(ROOT, 'tools', 'content-pipeline', 'out');
if (!sceneId) { console.error('Usage: node record.js <scene-id> [out-dir]'); process.exit(1); }

const scenes = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenes.json'), 'utf8'));
const scene = scenes.find(s => s.id === sceneId);
if (!scene) { console.error('No scene with id ' + sceneId + ' in scenes.json'); process.exit(1); }

const PW_MODULES = process.env.PW_MODULES ||
  '/tmp/claude-0/-home-user-baby-book/ebb146f5-4274-579a-8431-1e6434ba156f/scratchpad/node_modules';
const { chromium } = require(path.join(PW_MODULES, 'playwright-core'));
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find(p => fs.existsSync(p));
if (!chromePath) { console.error('No chromium binary found. Set CHROME_PATH.'); process.exit(1); }

const FILE = 'file://' + path.join(ROOT, 'dist', 'OurLittleMiracle.html');
const W = 720, H = 1280;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromePath });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1,
    recordVideo: { dir: outDir, size: { width: W, height: H } },
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  // Write the seed into localStorage via addInitScript, which runs before
  // any page script on every navigation. This means the very first paint
  // already shows the filled-in book - no empty-dashboard flash while a
  // post-load reload catches up, which the recording would otherwise
  // capture as 2+ unbranded seconds of a ten-second clip.
  const STORE_KEY = 'olm_baby_book';
  if (scene.seed) {
    await page.addInitScript(({ key, seed }) => {
      let store;
      try { store = JSON.parse(window.localStorage.getItem(key)) || {}; }
      catch (e) { store = {}; }
      Object.assign(store, seed);
      window.localStorage.setItem(key, JSON.stringify(store));
    }, { key: STORE_KEY, seed: scene.seed });
  } else {
    await page.addInitScript(key => window.localStorage.removeItem(key), STORE_KEY);
  }

  await page.goto(FILE);
  await sleep(1300);

  for (const step of scene.steps) {
    switch (step.action) {
      case 'showTab':
        await page.evaluate(t => showTab(t), step.tab);
        break;
      case 'wait':
        await sleep(step.ms);
        continue; // already waited; skip the default below
      case 'scrollTo':
        await page.evaluate(({ sel, top }) => {
          const el = document.querySelector(sel);
          if (el) el.scrollTo({ top, behavior: 'smooth' });
        }, { sel: step.selector, top: step.top });
        break;
      case 'typeInto':
        for (const ch of step.text) {
          await page.evaluate(({ sel, c }) => {
            const el = document.querySelector(sel);
            if (!el) return;
            el.value += c;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }, { sel: step.selector, c: ch });
          await sleep(step.charDelay || 70);
        }
        break;
      case 'click':
        await page.click(step.selector);
        break;
      default:
        console.error('Unknown step action: ' + step.action);
        process.exit(1);
    }
    await sleep(250); // small settle between steps
  }

  await ctx.close();
  await browser.close();

  if (pageErrors.length) {
    console.error('PAGE ERRORS during recording:', pageErrors.join(' | '));
    process.exit(1);
  }

  const raw = fs.readdirSync(outDir).filter(f => f.endsWith('.webm'))
    .map(f => path.join(outDir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  console.log(JSON.stringify({ scene: scene.id, raw, title: scene.title, caption: scene.caption }));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
