import type { PaylineDef } from '../data/paylines';
import { getPayout } from '../data/payouts';

export type SymbolId = string;

export interface WinLine {
  paylineIndex: number; // 0..PAYLINES.length-1
  symbol: SymbolId;
  count: 3 | 4 | 5;
  cells: Array<[number, number]>; // [col, row] for the matching run
  payout: number; // already multiplied by betPerLine
  color: number; // payline color (for highlight)
}

/**
 * Evaluate a 5x3 reel result against the first `activeLineCount` paylines.
 * Returns one WinLine per payline that produced a payout, sorted by payout desc.
 *
 * Match rule: left-to-right, contiguous same-symbol run from reel0, at least 3.
 * (No wild substitution in P3 — added in a later phase.)
 *
 * @param reelResult [col][row], length 5, each column length 3
 */
export function evaluate(
  reelResult: SymbolId[][],
  paylines: PaylineDef[],
  activeLineCount: number,
  betPerLine: number,
): WinLine[] {
  const wins: WinLine[] = [];
  const limit = Math.min(activeLineCount, paylines.length);

  for (let li = 0; li < limit; li++) {
    const line = paylines[li];
    const first = reelResult[0][line.cells[0]];
    if (!first) continue;

    let count = 1;
    const cells: Array<[number, number]> = [[0, line.cells[0]]];
    for (let col = 1; col < 5; col++) {
      const sym = reelResult[col][line.cells[col]];
      if (sym === first) {
        count++;
        cells.push([col, line.cells[col]]);
      } else {
        break;
      }
    }

    if (count < 3) continue;
    const c = count as 3 | 4 | 5;
    const mult = getPayout(first, c);
    if (mult <= 0) continue;
    const payout = mult * betPerLine;
    wins.push({
      paylineIndex: li,
      symbol: first,
      count: c,
      cells,
      payout,
      color: line.color,
    });
  }

  wins.sort((a, b) => b.payout - a.payout);
  return wins;
}

export function totalWin(wins: WinLine[]): number {
  let sum = 0;
  for (const w of wins) sum += w.payout;
  return sum;
}
