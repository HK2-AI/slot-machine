// Screenshot capture support. Off by default. When the URL contains
// `?screenshot=1`, the game forces a locale, suppresses the daily-reward
// auto-popup, exposes a preset switcher on `window.__screenshot__`, and
// fires a `screenshot-ready` event once the requested preset is fully
// rendered. The Playwright harness uses this to capture deterministic
// frames for the app store.

import type { MainScene } from '../scenes/MainScene';

export type Preset =
  | 'default'
  | 'mega-win'
  | 'free-spins'
  | 'gamble'
  | 'daily-reward';

const PRESETS: ReadonlyArray<Preset> = [
  'default',
  'mega-win',
  'free-spins',
  'gamble',
  'daily-reward',
];

export interface ScreenshotParams {
  enabled: boolean;
  preset: Preset;
  locale: 'en' | 'zh-HK';
}

export function getScreenshotParams(): ScreenshotParams {
  if (typeof window === 'undefined') {
    return { enabled: false, preset: 'default', locale: 'en' };
  }
  const url = new URL(window.location.href);
  const enabled = url.searchParams.get('screenshot') === '1';
  const presetRaw = (url.searchParams.get('preset') ?? 'default') as Preset;
  const preset: Preset = PRESETS.includes(presetRaw) ? presetRaw : 'default';
  const localeRaw = url.searchParams.get('locale');
  const locale: 'en' | 'zh-HK' = localeRaw === 'zh-HK' ? 'zh-HK' : 'en';
  return { enabled, preset, locale };
}

/**
 * Call BEFORE `i18n.init()`. Forces the locale (via the Capacitor Preferences
 * web shim → localStorage) and disables the daily-reward auto-popup so
 * screenshots never accidentally land on the welcome modal.
 */
export function setupScreenshotBoot(): void {
  const p = getScreenshotParams();
  if (!p.enabled) return;
  try {
    window.localStorage.setItem('CapacitorStorage.slot-machine:locale', p.locale);
    // For the daily-reward preset, prime storage so today's open lands on
    // Day 5 (high streak) and shows the popup as available.
    if (p.preset === 'daily-reward') {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86_400_000);
      const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      window.localStorage.setItem(
        'CapacitorStorage.slot-machine:daily-reward',
        JSON.stringify({ lastClaimDate: yKey, streak: 4 }),
      );
    } else {
      // Ensure other presets don't accidentally show daily-reward.
      window.localStorage.removeItem('CapacitorStorage.slot-machine:daily-reward');
    }
  } catch { /* ignore */ }
  (window as any).__DAILY_REWARD_SHOWN__ = true;
}

/**
 * Once MainScene finishes its create(), the scene calls this with itself.
 * We run the requested preset, then dispatch `screenshot-ready` so the
 * capture harness can `page.screenshot()`.
 */
export function announceSceneReady(scene: MainScene): void {
  const p = getScreenshotParams();
  if (!p.enabled) return;

  // Expose for ad-hoc tinkering in DevTools.
  (window as any).__screenshot__ = {
    apply: (name: Preset) => scene.runScreenshotPreset(name),
  };

  void scene.runScreenshotPreset(p.preset).then(() => {
    window.dispatchEvent(new CustomEvent('screenshot-ready', { detail: { preset: p.preset } }));
  });
}
