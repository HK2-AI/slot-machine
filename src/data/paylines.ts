// 20 classic 5x3 paylines. Each payline is a tuple of row indices for
// columns [reel0, reel1, reel2, reel3, reel4]. Row 0 = top, 1 = middle, 2 = bottom.

export type Payline = readonly [number, number, number, number, number];

export interface PaylineDef {
  readonly index: number; // 0-based
  readonly cells: Payline;
  readonly color: number; // hex
}

const RAW: Payline[] = [
  [1, 1, 1, 1, 1], // 1  middle horizontal
  [0, 0, 0, 0, 0], // 2  top horizontal
  [2, 2, 2, 2, 2], // 3  bottom horizontal
  [0, 1, 2, 1, 0], // 4  V
  [2, 1, 0, 1, 2], // 5  inverted V
  [0, 0, 1, 2, 2], // 6
  [2, 2, 1, 0, 0], // 7
  [1, 0, 0, 0, 1], // 8
  [1, 2, 2, 2, 1], // 9
  [1, 0, 1, 2, 1], // 10
  [1, 2, 1, 0, 1], // 11
  [0, 1, 1, 1, 0], // 12
  [2, 1, 1, 1, 2], // 13
  [0, 1, 0, 1, 0], // 14
  [2, 1, 2, 1, 2], // 15
  [1, 1, 0, 1, 1], // 16
  [1, 1, 2, 1, 1], // 17
  [0, 0, 1, 0, 0], // 18
  [2, 2, 1, 2, 2], // 19
  [0, 2, 0, 2, 0], // 20
];

function hslToHex(h: number, s: number, l: number): number {
  // h: 0-360, s/l: 0-1
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh >= 0 && hh < 1) { r = c; g = x; b = 0; }
  else if (hh < 2) { r = x; g = c; b = 0; }
  else if (hh < 3) { r = 0; g = c; b = x; }
  else if (hh < 4) { r = 0; g = x; b = c; }
  else if (hh < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const m = l - c / 2;
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}

export const PAYLINES: PaylineDef[] = RAW.map((cells, i) => ({
  index: i,
  cells,
  color: hslToHex((360 / RAW.length) * i, 0.85, 0.6),
}));

export const PAYLINE_COUNT = PAYLINES.length;

// User-facing line-count options (subset of 1..20 to keep UX clean).
export const LINE_OPTIONS = [1, 5, 10, 15, 20] as const;
