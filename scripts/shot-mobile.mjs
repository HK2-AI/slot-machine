import { chromium } from 'playwright';

const sizes = [
  { name: 'iphone-portrait', w: 390, h: 844 },
  { name: 'iphone-landscape', w: 844, h: 390 },
  { name: 'small-portrait', w: 360, h: 640 },
];

const browser = await chromium.launch();
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3001/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `/tmp/slot-${s.name}.png` });
  console.log(`captured ${s.name}`);
  await ctx.close();
}
await browser.close();
