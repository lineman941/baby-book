/* Renders sales-kit/listing-images.html slides to 2000x1500 JPGs in sales-kit/images/.
   Run from repo root: node sales-kit/render-listing-images.js
   Needs playwright-core + a chromium (pre-installed in Claude Code cloud env). */
const path = require('path');
const fs = require('fs');

const MODULE_DIRS = [
  '/tmp/claude-0/-home-user-baby-book/ebb146f5-4274-579a-8431-1e6434ba156f/scratchpad/node_modules',
  path.join(__dirname, '..', 'node_modules'),
];
const pwDir = MODULE_DIRS.find(d => fs.existsSync(path.join(d, 'playwright-core')));
const { chromium } = require(path.join(pwDir, 'playwright-core'));

const EXECUTABLES = [
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
];

(async () => {
  const outDir = path.join(__dirname, 'images');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath: EXECUTABLES.find(p => fs.existsSync(p)),
  });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'listing-images.html'));
  await page.waitForTimeout(1200); // fonts + images
  for (const id of ['s1', 's2', 's3', 's4', 's5']) {
    const el = page.locator('#' + id);
    await el.screenshot({
      path: path.join(outDir, `listing-${id.slice(1)}.jpg`),
      type: 'jpeg', quality: 88,
    });
    console.log(`listing-${id.slice(1)}.jpg`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
