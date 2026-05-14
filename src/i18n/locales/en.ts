// English source-of-truth strings. Keys are kebab-cased semantic identifiers.
// New strings: add here first, then translate in zh-HK.ts.
export const en = {
  // Core actions
  'spin': 'SPIN',
  'spinning': 'SPINNING',
  'stop': 'STOP',
  'max': 'MAX',
  'cancel': 'CANCEL',
  'reset': 'RESET',
  'on': 'ON',
  'off': 'OFF',
  'no-thanks': 'no thanks',
  'share': 'SHARE',

  // HUD
  'credit': 'CREDIT',
  'bet': 'BET',
  'lines': 'LINES',
  'total-bet': 'TOTAL BET',
  'win': 'WIN',
  'last': 'LAST',

  // Streak
  'streak': 'STREAK',

  // Win badges
  'win-badge': 'WIN',
  'mega-win': 'MEGA WIN',
  'big-win': 'BIG WIN',

  // Free spins
  'free-spins-banner': 'FREE SPINS!',
  'free-spins-complete': 'FREE SPINS COMPLETE',
  'total-plus': 'TOTAL +{n}',
  'scatter-trigger': '{count}× SCATTER  →  +{spins} SPINS',
  'free-spin-status': 'FREE SPIN  {used}/{total}   ×{mult}',
  'bonus-purchased': 'BONUS PURCHASED\n{spins} FREE SPINS',

  // Paytable
  'paytable': 'PAYTABLE',
  'paytable-symbol': 'SYMBOL',
  'paytable-x3': 'x3',
  'paytable-x4': 'x4',
  'paytable-x5': 'x5',
  'paytable-hint': 'Multipliers × per-line bet. Match left-to-right, 3+ in a row.',

  // Settings
  'settings': 'SETTINGS',
  'mute': 'MUTE',
  'sfx': 'SFX',
  'music': 'MUSIC',
  'quick-spin': 'QUICK SPIN',
  'gamble': 'GAMBLE',
  'this-session': 'THIS SESSION',
  'spins': 'SPINS',
  'wagered': 'WAGERED',
  'won': 'WON',
  'net': 'NET',
  'top-up': '+ TOP UP',
  'language': 'LANGUAGE',

  // Refill
  'out-of-credits': 'OUT OF CREDITS',
  'refill-broke': 'You ran out — grab a refill?',
  'refill-manual': 'Add {n} credits to your balance.',
  'refill-button': '+{n}  CREDITS',

  // Buy Bonus
  'buy-bonus': 'BUY BONUS',
  'buy-free-spins': 'BUY FREE SPINS',
  'free-spins-award': '{n} FREE SPINS',
  'with-multiplier': 'with ×2 win multiplier',
  'cost': 'COST',
  'balance': 'BALANCE',
  'buy-cta': 'BUY {cost}',
  'not-enough': 'NOT ENOUGH',

  // Gamble
  'double-or-nothing': 'DOUBLE OR NOTHING',
  'gamble-prompt': 'WIN  {win}  →  {doubled}?',
  'red': 'RED',
  'black': 'BLACK',
  'gamble-take': 'tap outside to take winnings',
  'gamble-win': '+{n}  WIN!',
  'gamble-bust': 'BUST',
};

export type StringKey = keyof typeof en;
