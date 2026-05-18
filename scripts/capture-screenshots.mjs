#!/usr/bin/env node
// App store screenshot capture. Boots `vite preview`, then drives a
// headless Chromium across (preset × locale × device) combos. Each frame
// is deterministic — driven by ?screenshot=1 query params + the in-game
// hook in src/systems/ScreenshotMode.ts.
//
// Output layout matches store-screenshots.yaml expectations:
//   screenshots/iphone/{en,zh-HK}/NN_<preset>.png   (2796x1290 landscape)
//   screenshots/android/{en,zh-HK}/NN_<preset>.png  (2560x1440 landscape)
//   screenshots/ipad/{en,zh-HK}/NN_<preset>.png     (2732x2048 landscape)
//
// All shots are LANDSCAPE — the app is landscape-only (see capacitor.config.ts
// + iOS Info.plist + AndroidManifest screenOrientation).

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'screenshots');

const PRESETS = [
  { id: 'default',      order: '01' },
  { id: 'mega-win',     order: '02' },
  { id: 'free-spins',   order: '03' },
  { id: 'gamble',       order: '04' },
  { id: 'daily-reward', order: '05' },
];

const LOCALES = ['en', 'zh-HK'];

// Emulate the real device's CSS-pixel viewport + DPR so the in-game responsive
// layout sees realistic dimensions (e.g. iPhone landscape h ≈ 430 CSS px, NOT
// 1290). The output PNG is still CSS×DPR = required store resolution.
//   iPhone 15 Pro Max  932×430  @3  → 2796×1290
//   Android phone     1280×720  @2  → 2560×1440
//   iPad Pro 12.9"    1366×1024 @2  → 2732×2048
const DEVICES = [
  { id: 'iphone',  cssWidth:  932, cssHeight:  430, dpr: 3 },
  { id: 'android', cssWidth: 1280, cssHeight:  720, dpr: 2 },
  { id: 'ipad',    cssWidth: 1366, cssHeight: 1024, dpr: 2 },
];

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 15000;

function startPreview() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'pnpm',
      ['exec', 'vite', 'preview', '--port', String(PORT), '--strictPort'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let resolved = false;
    proc.stdout.on('data', (b) => {
      const s = b.toString();
      if (!resolved && /Local:/.test(s)) {
        resolved = true;
        resolve(proc);
      }
    });
    proc.stderr.on('data', (b) => process.stderr.write(b));
    proc.on('exit', (code) => {
      if (!resolved) reject(new Error(`vite preview exited with ${code} before ready`));
    });
    setTimeout(() => {
      if (!resolved) reject(new Error('vite preview did not start within 10s'));
    }, 10000);
  });
}

async function capture(browser, device, locale, preset) {
  const context = await browser.newContext({
    viewport: { width: device.cssWidth, height: device.cssHeight },
    deviceScaleFactor: device.dpr,
    isMobile: false,
  });
  const page = await context.newPage();
  // Quiet page console noise so the run log stays readable.
  page.on('pageerror', (err) => console.error(`  [page error] ${err.message}`));

  const url = `${BASE_URL}/?screenshot=1&preset=${preset.id}&locale=${encodeURIComponent(locale)}`;
  await page.goto(url, { waitUntil: 'load' });

  // Wait for the in-game hook to dispatch `screenshot-ready` once the
  // requested preset is fully laid out.
  await page.evaluate(
    (timeout) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('screenshot-ready timeout')), timeout);
        window.addEventListener(
          'screenshot-ready',
          () => { clearTimeout(t); resolve(); },
          { once: true },
        );
      }),
    READY_TIMEOUT_MS,
  );

  // Settle frame.
  await page.waitForTimeout(200);

  const dir = join(OUT_DIR, device.id, locale);
  await mkdir(dir, { recursive: true });
  const filename = `${preset.order}_${preset.id}.png`;
  const outPath = join(dir, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  await context.close();
  return outPath;
}

async function main() {
  console.log('Starting vite preview…');
  const preview = await startPreview();
  console.log(`vite preview ready at ${BASE_URL}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    let total = 0;
    let ok = 0;
    for (const device of DEVICES) {
      for (const locale of LOCALES) {
        for (const preset of PRESETS) {
          total++;
          const label = `${device.id}/${locale}/${preset.id}`;
          process.stdout.write(`  [${total}/30] ${label} … `);
          try {
            const path = await capture(browser, device, locale, preset);
            ok++;
            console.log(`✓ ${path.replace(ROOT + '/', '')}`);
          } catch (err) {
            console.log(`✗ ${err.message}`);
          }
        }
      }
    }
    console.log(`\nDone. ${ok}/${total} captured.`);
  } finally {
    if (browser) await browser.close();
    preview.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
