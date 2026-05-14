// Player credit balance. Backed by @capacitor/preferences on native (durable
// across cache wipes), falls back to localStorage on web. Synchronous facade —
// boot sequence loads the persisted value into memory before the scene starts;
// writes happen in-memory immediately and are flushed asynchronously.

import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'slot-machine:balance';
const INITIAL_BALANCE = 1000;

let current: number = INITIAL_BALANCE;
let loaded = false;

function clamp(n: number): number {
  return Math.max(0, Math.floor(n));
}

function parseStoredValue(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * Load balance from native preferences (or localStorage fallback). Migrates
 * legacy localStorage values on first run when running natively. Must be
 * called once at app boot before the game scene reads balance.
 */
export async function loadBalance(): Promise<void> {
  if (loaded) return;
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    let parsed = parseStoredValue(value);
    if (parsed == null) {
      // First run on native — migrate any legacy localStorage value so users
      // who upgraded from a web build don't lose their credits.
      try {
        const legacy = localStorage.getItem(STORAGE_KEY);
        parsed = parseStoredValue(legacy);
      } catch {
        /* localStorage may be unavailable in some webviews */
      }
    }
    current = parsed ?? INITIAL_BALANCE;
  } catch {
    current = INITIAL_BALANCE;
  }
  loaded = true;
}

let writeTimer: ReturnType<typeof setTimeout> | undefined;
function flushSoon(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = undefined;
    void Preferences.set({ key: STORAGE_KEY, value: String(current) });
  }, 50);
}

export const Balance = {
  getBalance(): number {
    return current;
  },
  setBalance(n: number): void {
    current = clamp(n);
    flushSoon();
  },
  deduct(n: number): boolean {
    if (n > current) return false;
    current = clamp(current - n);
    flushSoon();
    return true;
  },
  add(n: number): void {
    current = clamp(current + n);
    flushSoon();
  },
  reset(): void {
    current = INITIAL_BALANCE;
    flushSoon();
  },
};
