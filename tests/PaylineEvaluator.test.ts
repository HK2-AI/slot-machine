import { describe, it, expect } from 'vitest';
import {
  evaluate,
  countScatters,
  freeSpinsAwarded,
  totalWin,
} from '../src/systems/PaylineEvaluator';
import { PAYLINES } from '../src/data/paylines';
import { getPayout } from '../src/data/payouts';

type Grid = string[][];

function grid(cols: string[][]): Grid {
  return cols.map((c) => [...c]);
}

describe('PaylineEvaluator.evaluate', () => {
  it('returns no wins on a non-matching grid', () => {
    const g = grid([
      ['A', 'K', 'Q'],
      ['J', '10', 'CHERRY'],
      ['A', 'K', 'Q'],
      ['J', '10', 'CHERRY'],
      ['A', 'K', 'Q'],
    ]);
    const wins = evaluate(g, PAYLINES, 20, 1);
    expect(wins).toEqual([]);
  });

  it('detects a 5-of-a-kind on the middle row', () => {
    const g = grid([
      ['A', 'SEVEN', 'Q'],
      ['A', 'SEVEN', 'Q'],
      ['A', 'SEVEN', 'Q'],
      ['A', 'SEVEN', 'Q'],
      ['A', 'SEVEN', 'Q'],
    ]);
    const wins = evaluate(g, PAYLINES, 20, 1);
    const middle = wins.find((w) => w.paylineIndex === 0);
    expect(middle).toBeDefined();
    expect(middle!.symbol).toBe('SEVEN');
    expect(middle!.count).toBe(5);
    expect(middle!.payout).toBe(getPayout('SEVEN', 5));
  });

  it('respects activeLineCount (lines beyond the limit are ignored)', () => {
    const g = grid([
      ['SEVEN', 'A', 'Q'],
      ['SEVEN', 'A', 'Q'],
      ['SEVEN', 'A', 'Q'],
      ['SEVEN', 'A', 'Q'],
      ['SEVEN', 'A', 'Q'],
    ]);
    // Top horizontal payline is index 1 — restrict to 1 to exclude it.
    const wins = evaluate(g, PAYLINES, 1, 1);
    expect(wins.find((w) => w.paylineIndex === 1)).toBeUndefined();
  });

  it('multiplies by per-line bet', () => {
    const g = grid([
      ['STAR', 'A', 'Q'],
      ['STAR', 'A', 'Q'],
      ['STAR', 'A', 'Q'],
      ['A', 'A', 'Q'],
      ['A', 'A', 'Q'],
    ]);
    const wins = evaluate(g, PAYLINES, 20, 5);
    const top = wins.find((w) => w.paylineIndex === 1);
    expect(top).toBeDefined();
    expect(top!.count).toBe(3);
    expect(top!.payout).toBe(getPayout('STAR', 3) * 5);
  });

  it('breaks the run on the first mismatch', () => {
    // Middle row reads CHERRY,CHERRY,CHERRY,SEVEN,CHERRY — a 3-of-a-kind that
    // ends at col 3. Other rows are deliberately mixed so they form no win.
    const g = grid([
      ['Q', 'CHERRY', '10'],
      ['J', 'CHERRY', 'A'],
      ['10', 'CHERRY', 'Q'],
      ['Q', 'SEVEN', '10'],
      ['J', 'CHERRY', 'A'],
    ]);
    const wins = evaluate(g, PAYLINES, 20, 1);
    const middle = wins.find((w) => w.paylineIndex === 0);
    expect(middle).toBeDefined();
    expect(middle!.count).toBe(3);
    expect(middle!.symbol).toBe('CHERRY');
  });

  it('sorts wins by payout descending', () => {
    const g = grid([
      ['SEVEN', 'CHERRY', 'Q'],
      ['SEVEN', 'CHERRY', 'Q'],
      ['SEVEN', 'CHERRY', 'Q'],
      ['SEVEN', 'CHERRY', 'Q'],
      ['SEVEN', 'CHERRY', 'Q'],
    ]);
    const wins = evaluate(g, PAYLINES, 20, 1);
    for (let i = 1; i < wins.length; i++) {
      expect(wins[i - 1].payout).toBeGreaterThanOrEqual(wins[i].payout);
    }
  });

  it('totalWin sums all payouts', () => {
    const g = grid([
      ['SEVEN', 'CHERRY', 'Q'],
      ['SEVEN', 'CHERRY', 'Q'],
      ['SEVEN', 'CHERRY', 'Q'],
      ['Q', 'CHERRY', 'Q'],
      ['Q', 'CHERRY', 'Q'],
    ]);
    const wins = evaluate(g, PAYLINES, 20, 2);
    const sum = wins.reduce((s, w) => s + w.payout, 0);
    expect(totalWin(wins)).toBe(sum);
  });
});

describe('PaylineEvaluator scatter helpers', () => {
  it('countScatters counts SCATTER anywhere on the grid', () => {
    const g = grid([
      ['A', 'SCATTER', 'Q'],
      ['SCATTER', 'A', 'Q'],
      ['A', 'A', 'Q'],
      ['A', 'A', 'SCATTER'],
      ['A', 'A', 'Q'],
    ]);
    expect(countScatters(g)).toBe(3);
  });

  it('freeSpinsAwarded follows the published table', () => {
    expect(freeSpinsAwarded(2)).toBe(0);
    expect(freeSpinsAwarded(3)).toBe(10);
    expect(freeSpinsAwarded(4)).toBe(15);
    expect(freeSpinsAwarded(5)).toBe(20);
    expect(freeSpinsAwarded(7)).toBe(20);
  });
});
