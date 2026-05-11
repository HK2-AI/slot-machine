// Payout table. Keyed by SymbolDef.id (see symbols.ts).
// Multipliers are applied per-line and multiplied by the per-line bet to get the
// final payout for a matching combination on a single payline.

export type Payout = {
  readonly 3: number;
  readonly 4: number;
  readonly 5: number;
};

// 11 symbols (no separate `crown` in this build — diamond/seven/star carry the high tier).
// Numbers match the spec; multipliers are × per-line bet.
export const PAYOUTS: Record<string, Payout> = {
  SEVEN:   { 3: 50, 4: 200, 5: 1000 },
  STAR:    { 3: 30, 4: 120, 5: 500 },
  WILD:    { 3: 20, 4: 80,  5: 300 }, // diamond
  SCATTER: { 3: 15, 4: 60,  5: 200 }, // bell
  CHERRY:  { 3: 10, 4: 40,  5: 150 },
  LEMON:   { 3: 8,  4: 32,  5: 120 },
  A:       { 3: 5,  4: 20,  5: 80 },
  K:       { 3: 5,  4: 20,  5: 80 },
  Q:       { 3: 3,  4: 12,  5: 50 },
  J:       { 3: 3,  4: 12,  5: 50 },
  '10':    { 3: 2,  4: 8,   5: 30 },
};

// User-facing per-line bet options.
export const BET_OPTIONS = [1, 5, 10, 25, 50, 100] as const;

export const PAYOUT_DISPLAY_ORDER: string[] = [
  'SEVEN', 'STAR', 'WILD', 'SCATTER',
  'CHERRY', 'LEMON',
  'A', 'K', 'Q', 'J', '10',
];

export function getPayout(symbolId: string, count: 3 | 4 | 5): number {
  const row = PAYOUTS[symbolId];
  if (!row) return 0;
  return row[count];
}
