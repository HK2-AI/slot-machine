import Phaser from 'phaser';

const GOLD_LIGHT = 0xf5d76e;
const GOLD_DARK = 0xb8860b;
const GOLD_BRIGHT = 0xffd700;
const GOLD_DEEP = 0x996515;
const PANEL_DARK = 0x0a0a18;
const GAP_DARK = 0x1a1a2e;

export class CabinetFrame {
  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number) {
    // Pulsing outer glow halo, behind everything else.
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

    // Corner ornaments: small gold diamonds.
    const ornaments = scene.add.graphics();
    ornaments.setDepth(101);
    const corners: Array<[number, number]> = [
      [x - 8, y - 8],
      [x + w + 8, y - 8],
      [x - 8, y + h + 8],
      [x + w + 8, y + h + 8],
    ];
    for (const [cx, cy] of corners) {
      drawDiamond(ornaments, cx, cy, 11);
    }
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

  // Diamond cap top + bottom.
  drawDiamond(sep, x, yTop - 1, 5);
  drawDiamond(sep, x, yBottom + 1, 5);
}
