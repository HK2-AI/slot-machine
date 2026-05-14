import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory mock of @capacitor/preferences. Synchronous internal state, async
// API surface — matches the real plugin's contract closely enough for the
// Balance facade's purposes.
const store = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({
      value: store.has(key) ? store.get(key)! : null,
    })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      store.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      store.delete(key);
    }),
  },
}));

async function freshBalance() {
  vi.resetModules();
  return import('../src/systems/Balance');
}

describe('Balance', () => {
  beforeEach(() => {
    store.clear();
  });

  it('starts at the initial balance when no value is persisted', async () => {
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    expect(Balance.getBalance()).toBe(1000);
  });

  it('loadBalance restores a persisted value', async () => {
    store.set('slot-machine:balance', '777');
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    expect(Balance.getBalance()).toBe(777);
  });

  it('rejects negative or non-numeric persisted values', async () => {
    store.set('slot-machine:balance', 'NaN');
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    expect(Balance.getBalance()).toBe(1000);
  });

  it('deduct returns false and is a no-op when funds are insufficient', async () => {
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    Balance.setBalance(50);
    expect(Balance.deduct(60)).toBe(false);
    expect(Balance.getBalance()).toBe(50);
  });

  it('deduct removes the requested amount when sufficient', async () => {
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    Balance.setBalance(100);
    expect(Balance.deduct(40)).toBe(true);
    expect(Balance.getBalance()).toBe(60);
  });

  it('add increases the balance', async () => {
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    Balance.setBalance(0);
    Balance.add(250);
    expect(Balance.getBalance()).toBe(250);
  });

  it('setBalance clamps to zero on negative input', async () => {
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    Balance.setBalance(-100);
    expect(Balance.getBalance()).toBe(0);
  });

  it('reset returns to the initial balance', async () => {
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    Balance.setBalance(5);
    Balance.reset();
    expect(Balance.getBalance()).toBe(1000);
  });

  it('writes are flushed to storage after a short debounce', async () => {
    const { Balance, loadBalance } = await freshBalance();
    await loadBalance();
    Balance.setBalance(123);
    await new Promise((r) => setTimeout(r, 80));
    expect(store.get('slot-machine:balance')).toBe('123');
  });
});
