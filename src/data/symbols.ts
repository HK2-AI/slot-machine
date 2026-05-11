export interface SymbolDef {
  id: string;
  glyph: string;
  color: number;
  // PNG asset key (filename without extension under public/symbols/).
  // Loaded by PreloadScene; ReelView falls back to glyph if the texture is missing.
  key: string;
}

export const SYMBOLS: SymbolDef[] = [
  // Low (5)
  { id: '10', glyph: '10', color: 0xe6f0ff, key: 'bar' },
  { id: 'J', glyph: 'J', color: 0xb8e0ff, key: 'jack' },
  { id: 'Q', glyph: 'Q', color: 0xffd6a8, key: 'queen' },
  { id: 'K', glyph: 'K', color: 0xffc26b, key: 'king' },
  { id: 'A', glyph: 'A', color: 0xff9a4a, key: 'ace' },
  // High (4)
  { id: 'CHERRY', glyph: '🍒', color: 0xff5566, key: 'cherry' },
  { id: 'LEMON', glyph: '🍋', color: 0xfde047, key: 'lemon' },
  { id: 'STAR', glyph: '⭐', color: 0xffd700, key: 'star' },
  { id: 'SEVEN', glyph: '7️⃣', color: 0xff3060, key: 'seven' },
  // Special (2)
  { id: 'WILD', glyph: 'WILD', color: 0xff44ff, key: 'diamond' },
  { id: 'SCATTER', glyph: 'SCATTER', color: 0x44eaff, key: 'bell' },
];

const BY_ID: Record<string, SymbolDef> = Object.fromEntries(
  SYMBOLS.map((s) => [s.id, s] as const),
);

export function getSymbol(id: string): SymbolDef {
  const def = BY_ID[id];
  if (!def) throw new Error(`Unknown symbol id: ${id}`);
  return def;
}
