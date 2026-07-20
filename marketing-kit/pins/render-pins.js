/* Renders marketing-kit/pins/pins.html to finished 1000x1500 Pinterest JPGs.
   Run from repo root: node marketing-kit/pins/render-pins.js */
const path = require('path');
const fs = require('fs');

const MODULE_DIRS = [
  '/tmp/claude-0/-home-user-baby-book/ebb146f5-4274-579a-8431-1e6434ba156f/scratchpad/node_modules',
  path.join(__dirname, '..', '..', 'node_modules'),
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
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'pins.html'));
  await page.waitForTimeout(1200);
  const names = await page.$$eval('.pin', els => els.map(e => e.dataset.name));
  for (const name of names) {
    await page.locator(`.pin[data-name="${name}"]`).screenshot({
      path: path.join(outDir, `${name}.jpg`), type: 'jpeg', quality: 86,
    });
    console.log(`${name}.jpg`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
