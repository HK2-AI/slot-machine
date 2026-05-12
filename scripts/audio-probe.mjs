import { chromium } from 'playwright';

const URL = 'http://localhost:4173/';

(async () => {
  const allowAutoplay = process.env.ALLOW_AUTOPLAY === '1';
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      ...(allowAutoplay ? ['--autoplay-policy=no-user-gesture-required'] : []),
    ],
  });
  console.log(`autoplay flag: ${allowAutoplay ? 'ALLOWED' : 'BLOCKED (default browser policy)'}`);
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLines = [];
  page.on('console', (msg) => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleLines.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => consoleLines.push(`[reqfail] ${req.url()} :: ${req.failure()?.errorText}`));
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      consoleLines.push(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  // Instrument before page scripts run.
  await page.addInitScript(() => {
    const origAdd = AudioContext.prototype.createBufferSource;
    window.__playCalls = [];
    // Wrap AudioBufferSourceNode.start
    const origStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(...args) {
      window.__playCalls.push({ when: performance.now(), args });
      console.log('[AudioBufferSourceNode.start] called', JSON.stringify(args));
      return origStart.apply(this, args);
    };
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Tap audio.play to log what's actually being played.
  await page.evaluate(() => {
    // Hook deeper: log every BaseSound.play invocation.
    const game = window.__PHASER_GAME__;
    const sm = game?.sound;
    if (sm) {
      const origAdd = sm.add.bind(sm);
      sm.add = function (key, cfg) {
        const s = origAdd(key, cfg);
        const origPlay = s.play.bind(s);
        s.play = function (...args) {
          console.log(`▶ Sound.play key="${key}" ctxState=${sm.context?.state}`);
          return origPlay(...args);
        };
        return s;
      };
    }
  });

  // Probe state.
  const state1 = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const sound = game?.sound;
    const ctx = sound?.context;
    return {
      hasGame: !!game,
      soundManagerType: sound?.constructor?.name,
      ctxState: ctx?.state ?? 'no-ctx',
      muted: sound?.mute,
    };
  });
  console.log('STATE BEFORE CLICK:', JSON.stringify(state1, null, 2));

  // Find canvas and simulate click on the SPIN button area (center, btnY = 140 + 288 + 90 = 518 in game coords).
  // But canvas is FIT-scaled; we need page coordinates. Get canvas bounding rect.
  const canvasBox = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  console.log('CANVAS:', canvasBox);

  // Game design is 1280x720. SPIN button is at (640, 518).
  const sx = canvasBox.x + (640 / 1280) * canvasBox.w;
  const sy = canvasBox.y + (518 / 720) * canvasBox.h;

  console.log(`Clicking SPIN at (${sx.toFixed(0)}, ${sy.toFixed(0)})`);
  await page.mouse.click(sx, sy);
  await page.waitForTimeout(500);

  const state2 = await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const sound = game?.sound;
    const ctx = sound?.context;
    return {
      ctxState: ctx?.state ?? 'no-ctx',
      muted: sound?.mute,
      playCallCount: window.__playCalls?.length || 0,
    };
  });
  console.log('STATE AFTER CLICK 1:', JSON.stringify(state2, null, 2));

  // Wait for spin animation to play (longest reel duration ~ 1200 + 4*250 = 2200ms).
  await page.waitForTimeout(3000);

  const state3 = await page.evaluate(() => ({
    ctxState: window.__PHASER_GAME__?.sound?.context?.state,
    playCallCount: window.__playCalls?.length || 0,
  }));
  console.log('STATE AFTER SPIN:', JSON.stringify(state3, null, 2));

  console.log('\n=== CONSOLE ===');
  for (const l of consoleLines) console.log(l);

  await browser.close();
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
