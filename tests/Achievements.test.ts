import { describe, it, expect, beforeEach, vi } from 'vitest';

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

async function freshAchievements() {
  vi.resetModules();
  return import('../src/systems/Achievements');
}

describe('Achievements', () => {
  beforeEach(() => {
    store.clear();
  });

  it('starts with zero stats and no unlocks', async () => {
    const { achievements, loadAchievements, ACHIEVEMENTS } = await freshAchievements();
    await loadAchievements();
    expect(achievements.unlockedCount()).toBe(0);
    for (const def of ACHIEVEMENTS) {
      expect(achievements.isUnlocked(def.id)).toBe(false);
    }
    expect(achievements.getStats().spins).toBe(0);
  });

  it('unlocks "first-spin" on the first recorded spin', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    const seen: string[] = [];
    achievements.onUnlock((def) => seen.push(def.id));

    achievements.recordSpin({ bet: 10, win: 0, isFree: false, streak: 0 });

    expect(achievements.isUnlocked('first-spin')).toBe(true);
    expect(seen).toContain('first-spin');
  });

  it('does not re-fire an already-unlocked achievement', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    let count = 0;
    achievements.onUnlock((def) => {
      if (def.id === 'first-spin') count++;
    });

    achievements.recordSpin({ bet: 10, win: 0, isFree: false, streak: 0 });
    achievements.recordSpin({ bet: 10, win: 0, isFree: false, streak: 0 });
    achievements.recordSpin({ bet: 10, win: 0, isFree: false, streak: 0 });

    expect(count).toBe(1);
  });

  it('unlocks "lucky-streak" when streak hits 5 and "hot-streak" at 8', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    for (let s = 1; s <= 5; s++) {
      achievements.recordSpin({ bet: 1, win: 1, isFree: false, streak: s });
    }
    expect(achievements.isUnlocked('lucky-streak')).toBe(true);
    expect(achievements.isUnlocked('hot-streak')).toBe(false);
    for (let s = 6; s <= 8; s++) {
      achievements.recordSpin({ bet: 1, win: 1, isFree: false, streak: s });
    }
    expect(achievements.isUnlocked('hot-streak')).toBe(true);
  });

  it('"big-spender" excludes free-spin wagers', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    // Wager 9999 in free spins (shouldn't count towards big-spender).
    achievements.recordSpin({ bet: 9999, win: 0, isFree: true, streak: 0 });
    expect(achievements.isUnlocked('big-spender')).toBe(false);
    // Then a single paid spin of 10000 — unlocks.
    achievements.recordSpin({ bet: 10000, win: 0, isFree: false, streak: 0 });
    expect(achievements.isUnlocked('big-spender')).toBe(true);
  });

  it('"mega-winner" unlocks on first mega win recorded', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    achievements.recordMegaWin();
    expect(achievements.isUnlocked('mega-winner')).toBe(true);
  });

  it('"risk-taker" requires 3 gamble wins in a row, busts reset streak', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    achievements.recordGamble(true);
    achievements.recordGamble(true);
    achievements.recordGamble(false); // bust resets
    achievements.recordGamble(true);
    achievements.recordGamble(true);
    expect(achievements.isUnlocked('risk-taker')).toBe(false);
    achievements.recordGamble(true); // 3rd consecutive win → unlock
    expect(achievements.isUnlocked('risk-taker')).toBe(true);
  });

  it('"bonus-buyer" only fires from recordBonusBuy, not from recordFreeSpinsTrigger', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    achievements.recordFreeSpinsTrigger();
    expect(achievements.isUnlocked('bonus-hunter')).toBe(true);
    expect(achievements.isUnlocked('bonus-buyer')).toBe(false);
    achievements.recordBonusBuy();
    expect(achievements.isUnlocked('bonus-buyer')).toBe(true);
  });

  it('persists stats and unlocks across reload', async () => {
    {
      const { achievements, loadAchievements } = await freshAchievements();
      await loadAchievements();
      achievements.recordSpin({ bet: 50, win: 200, isFree: false, streak: 1 });
      achievements.recordMegaWin();
      // Allow the debounced write to flush.
      await new Promise((r) => setTimeout(r, 150));
    }
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    expect(achievements.getStats().spins).toBe(1);
    expect(achievements.getStats().wagered).toBe(50);
    expect(achievements.isUnlocked('first-spin')).toBe(true);
    expect(achievements.isUnlocked('mega-winner')).toBe(true);
  });

  it('reset wipes stats and unlocks', async () => {
    const { achievements, loadAchievements } = await freshAchievements();
    await loadAchievements();
    achievements.recordSpin({ bet: 1, win: 1, isFree: false, streak: 1 });
    expect(achievements.unlockedCount()).toBeGreaterThan(0);
    achievements.reset();
    expect(achievements.unlockedCount()).toBe(0);
    expect(achievements.getStats().spins).toBe(0);
  });
});
