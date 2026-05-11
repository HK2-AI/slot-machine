import Phaser from 'phaser';

const GOLD_LIGHT = 0xf5d76e;
const GOLD_DARK = 0xb8860b;
const GOLD_BRIGHT = 0xffd700;
const GOLD_DEEP = 0x996515;
const PANEL_DARK = 0x0a0a18;
const GAP_DARK = 0x1a1a2e;

export interface CabinetHandles {
  halo: Phaser.GameObjects.Graphics;
}

export function buildCabinet(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
): CabinetHandles {
  // Pulsing outer glow halo (depth 50 — behind cabinet).
  const halo = scene.add.graphics();
  halo.setPosition(x + w / 2, y + h / 2);
  halo.fillStyle(GOLD_BRIGHT, 0.2);
  halo.fillRoundedRect(-w / 2 - 28, -h / 2 - 28, w + 56, h + 56, 26);
  halo.setBlendMode(Phaser.BlendModes.ADD);
  halo.setDepth(50);
  scene.tweens.add({
    targets: halo,
    scaleX: 1.03,
    scaleY: 1.03,
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });

  // Side cabinet pillars — flanking the reel viewport.
  drawSidePillar(scene, x - 38, y - 8, 22, h + 16);
  drawSidePillar(scene, x + w + 16, y - 8, 22, h + 16);

  const frame = scene.add.graphics();
  frame.setDepth(100);

  // Outer thick gold gradient border (8px effective).
  frame.fillGradientStyle(GOLD_LIGHT, GOLD_LIGHT, GOLD_DARK, GOLD_DARK, 1);
  frame.fillRoundedRect(x - 8, y - 8, w + 16, h + 16, 16);

  // Thin dark inner line (2px gap, inset 6px from outer).
  frame.fillStyle(GAP_DARK, 1);
  frame.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 14);

  // Inner deep navy panel.
  frame.fillStyle(PANEL_DARK, 1);
  frame.fillRoundedRect(x, y, w, h, 12);

  // Subtle inner shadow lines for depth.
  frame.lineStyle(2, 0x000000, 0.55);
  frame.beginPath();
  frame.moveTo(x + 6, y + 3);
  frame.lineTo(x + w - 6, y + 3);
  frame.strokePath();

  frame.lineStyle(1, 0xffffff, 0.08);
  frame.beginPath();
  frame.moveTo(x + 6, y + h - 3);
  frame.lineTo(x + w - 6, y + h - 3);
  frame.strokePath();

  // Metallic sliding shine overlay on the top frame edge — adds polished-metal feel.
  const shine = scene.add.graphics();
  shine.fillGradientStyle(
    0xffffff,
    0xffffff,
    0xffffff,
    0xffffff,
    0.0,
    0.55,
    0.0,
    0.0,
  );
  shine.fillRect(0, 0, 130, 18);
  shine.setBlendMode(Phaser.BlendModes.ADD);
  shine.setDepth(102);
  // Geometry mask clips the sliding shine to the top frame band.
  const shineMask = scene.make.graphics({ x: 0, y: 0 }, false);
  shineMask.fillStyle(0xffffff);
  shineMask.fillRoundedRect(x - 8, y - 8, w + 16, 18, 12);
  shine.setMask(shineMask.createGeometryMask());
  shine.x = x - 130;
  shine.y = y - 8;
  scene.tweens.add({
    targets: shine,
    x: x + w + 16,
    duration: 4200,
    repeat: -1,
    ease: 'Sine.InOut',
    repeatDelay: 1200,
  });

  // Corner ornaments: small gold diamonds.
  const ornaments = scene.add.graphics();
  ornaments.setDepth(103);
  const corners: Array<[number, number]> = [
    [x - 8, y - 8],
    [x + w + 8, y - 8],
    [x - 8, y + h + 8],
    [x + w + 8, y + h + 8],
  ];
  for (const [cx, cy] of corners) {
    drawDiamond(ornaments, cx, cy, 11);
  }

  // Floor reflection — a faint flipped copy of the bottom of the cabinet.
  const refl = scene.add.graphics();
  refl.setDepth(40);
  refl.fillGradientStyle(GOLD_DARK, GOLD_DARK, GOLD_LIGHT, GOLD_LIGHT, 0.18, 0.18, 0, 0);
  refl.fillRoundedRect(x - 8, y + h + 22, w + 16, 60, 14);

  return { halo };
}

/** Backwards-compatible class wrapper (kept so existing callers using `new CabinetFrame(...)` still work). */
export class CabinetFrame {
  public readonly handles: CabinetHandles;
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    this.handles = buildCabinet(scene, x, y, w, h);
  }
}

function drawSidePillar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const g = scene.add.graphics();
  g.setDepth(99);
  // Pillar body — light center, dark edges via two stacked rects.
  g.fillGradientStyle(GOLD_DARK, GOLD_BRIGHT, GOLD_DARK, GOLD_BRIGHT, 1, 1, 1, 1);
  g.fillRoundedRect(x, y, w, h, 6);
  // Dark left edge.
  g.fillStyle(0x4a3206, 0.4);
  g.fillRect(x, y, 3, h);
  // Bright right highlight.
  g.fillStyle(0xfff4b3, 0.35);
  g.fillRect(x + w - 2, y, 2, h);

  // Three evenly-spaced jewels.
  const jewelColors = [0xff4444, 0x44aaff, 0x44dd66];
  for (let i = 0; i < 3; i++) {
    const cy = y + h * (0.18 + 0.32 * i);
    const cx = x + w / 2;
    g.fillStyle(0x000000, 0.6);
    g.fillCircle(cx, cy + 1, 5.5);
    g.fillStyle(jewelColors[i % jewelColors.length], 1);
    g.fillCircle(cx, cy, 5);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(cx - 1.5, cy - 1.5, 1.8);
  }
}

function drawDiamond(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
): void {
  g.fillGradientStyle(GOLD_BRIGHT, GOLD_BRIGHT, GOLD_DEEP, GOLD_DEEP, 1);
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r, cy);
  g.closePath();
  g.fillPath();

  g.lineStyle(2, GOLD_DEEP, 1);
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r, cy);
  g.closePath();
  g.strokePath();

  // Small highlight dot.
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(cx - r * 0.35, cy - r * 0.35, 1.5);
}

export function drawReelSeparator(
  scene: Phaser.Scene,
  x: number,
  yTop: number,
  yBottom: number,
): void {
  const sep = scene.add.graphics();
  sep.setDepth(105);
  sep.fillGradientStyle(GOLD_BRIGHT, GOLD_BRIGHT, GOLD_DEEP, GOLD_DEEP, 1);
  sep.fillRect(x - 1.5, yTop, 3, yBottom - yTop);

  // Thin white highlight on the left edge — adds dimensional gleam.
  sep.fillStyle(0xffffff, 0.45);
  sep.fillRect(x - 1.5, yTop, 0.8, yBottom - yTop);

  // Diamond cap top + bottom.
  drawDiamond(sep, x, yTop - 1, 5);
  drawDiamond(sep, x, yBottom + 1, 5);
}
