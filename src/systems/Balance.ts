// Player credit balance, persisted to localStorage. Single source of truth.

const STORAGE_KEY = 'slot-machine:balance';
const INITIAL_BALANCE = 1000;

function safeRead(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return INITIAL_BALANCE;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return INITIAL_BALANCE;
    return Math.floor(n);
  } catch {
    return INITIAL_BALANCE;
  }
}

function safeWrite(n: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(n))));
  } catch {
    // ignore
  }
}

export const Balance = {
  getBalance(): number {
    return safeRead();
  },
  setBalance(n: number): void {
    safeWrite(n);
  },
  deduct(n: number): boolean {
    const cur = safeRead();
    if (n > cur) return false;
    safeWrite(cur - n);
    return true;
  },
  add(n: number): void {
    safeWrite(safeRead() + n);
  },
  reset(): void {
    safeWrite(INITIAL_BALANCE);
  },
};
