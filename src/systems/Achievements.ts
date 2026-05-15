// Achievements system. Tracks lifetime stats across sessions (persisted to
// @capacitor/preferences) and emits an "unlock" event the first time each
// achievement's progress reaches its target. Boot sequence calls
// `loadAchievements()` once before the game scene reads progress; gameplay
// code feeds events via the typed methods on `achievements`.

import { Preferences } from '@capacitor/preferences';
import type { StringKey } from '../i18n/locales/en';

const STORAGE_KEY = 'slot-machine:achievements';

export type AchievementId =
  | 'first-spin'
  | 'veteran'
  | 'spin-master'
  | 'big-winner'
  | 'mega-winner'
  | 'lucky-streak'
  | 'hot-streak'
  | 'bonus-hunter'
  | 'bonus-buyer'
  | 'gambler'
  | 'risk-taker'
  | 'big-spender';

export interface LifetimeStats {
  spins: number;
  wagered: number;
  bestWin: number;
  longestStreak: number;
  longestGambleStreak: number;
  bonusTriggered: number;
  bonusBought: number;
  gambleAttempts: number;
  megaWins: number;
}

const ZERO_STATS: LifetimeStats = {
  spins: 0,
  wagered: 0,
  bestWin: 0,
  longestStreak: 0,
  longestGambleStreak: 0,
  bonusTriggered: 0,
  bonusBought: 0,
  gambleAttempts: 0,
  megaWins: 0,
};

export interface AchievementDef {
  id: AchievementId;
  nameKey: StringKey;
  descKey: StringKey;
  /** Emoji icon — keeps the asset pipeline simple. */
  icon: string;
  /** Target value to unlock. */
  target: number;
  /** Read current progress from lifetime stats. */
  progress: (s: LifetimeStats) => number;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: 'first-spin',
    nameKey: 'ach-first-spin',
    descKey: 'ach-first-spin-desc',
    icon: '🎰',
    target: 1,
    progress: (s) => s.spins,
  },
  {
    id: 'veteran',
    nameKey: 'ach-veteran',
    descKey: 'ach-veteran-desc',
    icon: '🎖️',
    target: 100,
    progress: (s) => s.spins,
  },
  {
    id: 'spin-master',
    nameKey: 'ach-spin-master',
    descKey: 'ach-spin-master-desc',
    icon: '🏆',
    target: 1000,
    progress: (s) => s.spins,
  },
  {
    id: 'big-winner',
    nameKey: 'ach-big-winner',
    descKey: 'ach-big-winner-desc',
    icon: '💰',
    target: 500,
    progress: (s) => s.bestWin,
  },
  {
    id: 'mega-winner',
    nameKey: 'ach-mega-winner',
    descKey: 'ach-mega-winner-desc',
    icon: '💎',
    target: 1,
    progress: (s) => s.megaWins,
  },
  {
    id: 'lucky-streak',
    nameKey: 'ach-lucky-streak',
    descKey: 'ach-lucky-streak-desc',
    icon: '🍀',
    target: 5,
    progress: (s) => s.longestStreak,
  },
  {
    id: 'hot-streak',
    nameKey: 'ach-hot-streak',
    descKey: 'ach-hot-streak-desc',
    icon: '🔥',
    target: 8,
    progress: (s) => s.longestStreak,
  },
  {
    id: 'bonus-hunter',
    nameKey: 'ach-bonus-hunter',
    descKey: 'ach-bonus-hunter-desc',
    icon: '🎁',
    target: 1,
    progress: (s) => s.bonusTriggered,
  },
  {
    id: 'bonus-buyer',
    nameKey: 'ach-bonus-buyer',
    descKey: 'ach-bonus-buyer-desc',
    icon: '🛍️',
    target: 1,
    progress: (s) => s.bonusBought,
  },
  {
    id: 'gambler',
    nameKey: 'ach-gambler',
    descKey: 'ach-gambler-desc',
    icon: '🎲',
    target: 1,
    progress: (s) => s.gambleAttempts,
  },
  {
    id: 'risk-taker',
    nameKey: 'ach-risk-taker',
    descKey: 'ach-risk-taker-desc',
    icon: '🃏',
    target: 3,
    progress: (s) => s.longestGambleStreak,
  },
  {
    id: 'big-spender',
    nameKey: 'ach-big-spender',
    descKey: 'ach-big-spender-desc',
    icon: '💸',
    target: 10000,
    progress: (s) => s.wagered,
  },
] as const;

interface PersistedState {
  stats: LifetimeStats;
  unlocked: AchievementId[];
}

type UnlockListener = (def: AchievementDef) => void;

class AchievementsImpl {
  private stats: LifetimeStats = { ...ZERO_STATS };
  private unlocked = new Set<AchievementId>();
  private gambleStreak = 0;
  private listeners = new Set<UnlockListener>();
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const parsed = JSON.parse(value) as Partial<PersistedState>;
        if (parsed.stats && typeof parsed.stats === 'object') {
          this.stats = { ...ZERO_STATS, ...parsed.stats };
        }
        if (Array.isArray(parsed.unlocked)) {
          for (const id of parsed.unlocked) this.unlocked.add(id);
        }
      }
    } catch {
      /* preferences unavailable — keep defaults */
    }
    this.loaded = true;
  }

  /** Snapshot of current lifetime stats (read-only consumers). */
  getStats(): Readonly<LifetimeStats> {
    return this.stats;
  }

  isUnlocked(id: AchievementId): boolean {
    return this.unlocked.has(id);
  }

  unlockedCount(): number {
    return this.unlocked.size;
  }

  /** Subscribe to unlock events. Returns an unsubscribe fn. */
  onUnlock(fn: UnlockListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Record a completed paid spin (free spins are excluded from `wagered`). */
  recordSpin(opts: { bet: number; win: number; isFree: boolean; streak: number }): void {
    this.stats.spins += 1;
    if (!opts.isFree) this.stats.wagered += opts.bet;
    if (opts.win > this.stats.bestWin) this.stats.bestWin = opts.win;
    if (opts.streak > this.stats.longestStreak) this.stats.longestStreak = opts.streak;
    this.evaluate();
  }

  recordMegaWin(): void {
    this.stats.megaWins += 1;
    this.evaluate();
  }

  recordFreeSpinsTrigger(): void {
    this.stats.bonusTriggered += 1;
    this.evaluate();
  }

  recordBonusBuy(): void {
    this.stats.bonusBought += 1;
    this.evaluate();
  }

  /** Gamble outcome: `won` true means doubled; false means bust. */
  recordGamble(won: boolean): void {
    this.stats.gambleAttempts += 1;
    if (won) {
      this.gambleStreak += 1;
      if (this.gambleStreak > this.stats.longestGambleStreak) {
        this.stats.longestGambleStreak = this.gambleStreak;
      }
    } else {
      this.gambleStreak = 0;
    }
    this.evaluate();
  }

  /** Test-only: wipe all progress + unlocks. */
  reset(): void {
    this.stats = { ...ZERO_STATS };
    this.unlocked.clear();
    this.gambleStreak = 0;
    this.persistSoon();
  }

  private evaluate(): void {
    for (const def of ACHIEVEMENTS) {
      if (this.unlocked.has(def.id)) continue;
      if (def.progress(this.stats) >= def.target) {
        this.unlocked.add(def.id);
        for (const fn of this.listeners) {
          try { fn(def); } catch { /* keep going */ }
        }
      }
    }
    // Persist on every evaluate — stats progress matters even without unlocks.
    this.persistSoon();
  }

  private writeTimer?: ReturnType<typeof setTimeout>;
  private persistSoon(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.writeTimer = undefined;
      const payload: PersistedState = {
        stats: this.stats,
        unlocked: [...this.unlocked],
      };
      void Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(payload) });
    }, 100);
  }
}

export const achievements = new AchievementsImpl();
export const loadAchievements = (): Promise<void> => achievements.load();
