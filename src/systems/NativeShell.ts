// Native-shell bootstrap — wires up Capacitor plugins (status bar, keep-awake,
// lifecycle hooks). Safe to call on web; plugins no-op when no native bridge
// is present. Scene code subscribes to `appEvents` for backgrounding signals.
import { App, type AppState } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';

type Listener = (active: boolean) => void;
const listeners = new Set<Listener>();

export const appEvents = {
  /** Subscribe to foreground/background transitions. Returns unsubscribe fn. */
  onActiveChange(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function notify(active: boolean): void {
  for (const fn of listeners) {
    try { fn(active); } catch { /* keep going */ }
  }
}

let initialized = false;
export function initNativeShell(): void {
  if (initialized) return;
  initialized = true;

  if (!Capacitor.isNativePlatform()) return;

  // Hide status bar for fully-immersive landscape gameplay.
  StatusBar.hide().catch(() => { /* ignore */ });
  StatusBar.setOverlaysWebView({ overlay: true }).catch(() => { /* ignore */ });
  StatusBar.setStyle({ style: Style.Dark }).catch(() => { /* ignore */ });

  // Keep the screen on while the player is playing.
  KeepAwake.keepAwake().catch(() => { /* ignore */ });

  App.addListener('appStateChange', (state: AppState) => {
    notify(state.isActive);
    if (state.isActive) {
      KeepAwake.keepAwake().catch(() => { /* ignore */ });
      StatusBar.hide().catch(() => { /* ignore */ });
    } else {
      KeepAwake.allowSleep().catch(() => { /* ignore */ });
    }
  });
}

export const haptics = {
  light(): void { void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {}); },
  medium(): void { void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {}); },
  heavy(): void { void Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}); },
  success(): void { void Haptics.notification({ type: NotificationType.Success }).catch(() => {}); },
  warning(): void { void Haptics.notification({ type: NotificationType.Warning }).catch(() => {}); },
};

/**
 * Native share sheet (iOS/Android). Falls back silently on web if Web Share API
 * isn't supported. Returns true if the share dialog was presented.
 */
export async function shareWin(amount: number): Promise<boolean> {
  const text = `I just won ${amount} on Lucky Slot! 🎰`;
  try {
    const can = await Share.canShare();
    if (!can.value) return false;
    await Share.share({
      title: 'Lucky Slot',
      text,
      dialogTitle: 'Share your win',
    });
    return true;
  } catch {
    return false;
  }
}
