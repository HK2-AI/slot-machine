import { describe, it, expect } from 'vitest';
import { RNG } from '../src/systems/RNG';

describe('RNG', () => {
  it('seeded RNG is deterministic', () => {
    const a = new RNG(42);
    const b = new RNG(42);
    const seqA = Array.from({ length: 16 }, () => a.rollInt(0, 99));
    const seqB = Array.from({ length: 16 }, () => b.rollInt(0, 99));
    expect(seqA).toEqual(seqB);
  });

  it('rollInt stays within inclusive bounds', () => {
    const r = new RNG(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.rollInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('rollInt(n,n) returns n', () => {
    const r = new RNG(7);
    expect(r.rollInt(5, 5)).toBe(5);
  });

  it('pick throws on empty array', () => {
    const r = new RNG(1);
    expect(() => r.pick([])).toThrow();
  });

  it('pick samples every element with sufficient draws', () => {
    const r = new RNG(99);
    const arr = ['a', 'b', 'c', 'd'] as const;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(r.pick([...arr]));
    expect(seen.size).toBe(4);
  });

  it('seeded RNG is reasonably uniform across the range', () => {
    const r = new RNG(2024);
    const buckets = new Array(10).fill(0);
    for (let i = 0; i < 10000; i++) {
      buckets[r.rollInt(0, 9)]++;
    }
    for (const b of buckets) {
      expect(b).toBeGreaterThan(700);
      expect(b).toBeLessThan(1300);
    }
  });
});
