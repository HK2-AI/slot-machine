import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  locale: 'zh-HK',
});
const page = await ctx.newPage();
await page.goto('http://localhost:3001/', { waitUntil: 'load' });
await page.waitForTimeout(3500);
// Dismiss the daily reward modal — click the claim button (centered).
await page.mouse.click(422, 290);
await page.waitForTimeout(1200);
// Click the gear button (top-right). Coords approx 818,21 in 844x390.
await page.mouse.click(818, 21);
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/slot-zhhk-settings.png' });
console.log('captured settings modal zh-HK');
await ctx.close();
await browser.close();
