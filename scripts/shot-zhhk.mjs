import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 1,
  locale: 'zh-HK',
});
const page = await ctx.newPage();
await page.goto('http://localhost:3001/', { waitUntil: 'load' });
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/slot-zhhk-landscape.png' });
console.log('captured zh-HK landscape');
await ctx.close();
await browser.close();
