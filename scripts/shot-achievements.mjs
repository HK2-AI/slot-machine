import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  locale: 'zh-HK',
});
const page = await ctx.newPage();
await page.goto('http://localhost:3001/', { waitUntil: 'load' });
await page.waitForTimeout(2500);
// Open settings (gear at ~818, 21).
await page.mouse.click(818, 21);
await page.waitForTimeout(700);
// Click trophy button (left of close X) — settings modal places it ~62px left of close.
// Modal width = 380, mx = (844-380)/2 = 232; trophy x = mx + 380 - 62 = 550
await page.mouse.click(550, 21 + 26);
await page.waitForTimeout(700);
await page.screenshot({ path: '/tmp/slot-achievements-zhhk.png' });
console.log('captured achievements modal zh-HK');
await ctx.close();
await browser.close();
