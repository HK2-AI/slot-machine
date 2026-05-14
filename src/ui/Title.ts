import Phaser from 'phaser';
import { SPARKLE_TEXTURE } from './Background';

export const TITLE_BAR_PAD_V = 10;

/**
 * Casino marquee top bar: dark bezel pill with gold trim, chase-light marquee
 * bulbs along top + bottom edges, ruby diamond ornaments on each side, and a
 * chrome-gold "LUCKY SLOT" wordmark with a sweeping shine band.
 *
 * `barWidth` controls the pill width; if omitted it auto-sizes to ~18× the
 * font height (clamped to scene width).
 */
export function createTitle(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  fontSize: number,
  options?: { width?: number },
): Phaser.GameObjects.Container {
  const root = scene.add.container(centerX, centerY);
  root.setDepth(60);

  const barH = fontSize + TITLE_BAR_PAD_V * 2;
  const desiredW = options?.width ?? Math.min(scene.scale.width - 24, fontSize * 17);
  const barW = Math.max(fontSize * 9, desiredW);
  const r = barH / 2; // pill ends

  // ── Bezel: dark gradient body + brushed top highlight + double gold trim ──
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x14142a, 0x14142a, 0x05050e, 0x05050e, 1);
  bg.fillRoundedRect(-barW / 2, -barH / 2, barW, barH, r);
  bg.fillStyle(0xffd700, 0.07);
  bg.fillRoundedRect(-barW / 2, -barH / 2, barW, Math.min(7, barH * 0.28), {
    tl: r, tr: r, bl: 0, br: 0,
  });
  bg.lineStyle(2, 0xffd700, 1);
  bg.strokeRoundedRect(-barW / 2, -barH / 2, barW, barH, r);
  bg.lineStyle(1, 0xffd700, 0.45);
  bg.strokeRoundedRect(-barW / 2 + 3, -barH / 2 + 3, barW - 6, barH - 6, r - 2);
  root.add(bg);

  // ── Marquee chase-light bulbs along top + bottom rims ──
  // Skip the rounded ends so bulbs hug the straight edge.
  const bulbY = barH / 2 - 3.2;
  const bulbR = Math.max(1.2, barH * 0.06);
  const inset = r + 4;
  const usableW = barW - inset * 2;
  const bulbCount = Math.max(8, Math.floor(usableW / 14));
  const bulbStep = usableW / (bulbCount - 1);
  const bulbs: Phaser.GameObjects.Arc[] = [];
  for (let i = 0; i < bulbCount; i++) {
    const bx = -barW / 2 + inset + i * bulbStep;
    for (const sign of [-1, 1]) {
      const dot = scene.add.circle(bx, sign * bulbY, bulbR, 0xfff4b3, 1);
      dot.setBlendMode(Phaser.BlendModes.ADD);
      dot.setAlpha(0.35);
      root.add(dot);
      bulbs.push(dot);
    }
  }
  // Chase pattern: each bulb pulses with a phase offset (creates a moving wave).
  scene.tweens.add({
    targets: bulbs,
    alpha: 1,
    duration: 480,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
    delay: scene.tweens.stagger(80, { start: 0 }),
  });

  // ── Ruby-diamond ornaments tucked inside the rounded ends ──
  const drawDiamond = (x: number): Phaser.GameObjects.Graphics => {
    const o = scene.add.graphics();
    const sx = Math.min(6, barH * 0.22);
    const sy = Math.min(8, barH * 0.32);
    o.fillStyle(0xff3355, 1);
    o.beginPath();
    o.moveTo(x, -sy);
    o.lineTo(x + sx, 0);
    o.lineTo(x, sy);
    o.lineTo(x - sx, 0);
    o.closePath();
    o.fillPath();
    o.lineStyle(1.5, 0xffd700, 1);
    o.strokePath();
    // Inner highlight facet
    o.fillStyle(0xffffff, 0.45);
    o.beginPath();
    o.moveTo(x, -sy + 1.5);
    o.lineTo(x + sx * 0.45, -sy * 0.15);
    o.lineTo(x - sx * 0.15, -sy * 0.4);
    o.closePath();
    o.fillPath();
    return o;
  };
  const ornX = barW / 2 - r * 0.55;
  root.add(drawDiamond(-ornX));
  root.add(drawDiamond(ornX));

  // ── Chrome-gold wordmark ──
  const word = scene.add
    .text(0, 0, 'LUCKY  SLOT', {
      fontFamily: '"Impact", "Arial Black", "Helvetica Neue", sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#1a0a00',
      strokeThickness: Math.max(2, Math.round(fontSize * 0.1)),
      letterSpacing: 1,
    } as Phaser.Types.GameObjects.Text.TextStyle)
    .setOrigin(0.5);
  word.setShadow(0, 2, '#000000', 4, false, true);
  const grad = word.context.createLinearGradient(0, 0, 0, word.height);
  grad.addColorStop(0, '#fff8d0');
  grad.addColorStop(0.45, '#ffd700');
  grad.addColorStop(0.55, '#a3760a');
  grad.addColorStop(1, '#ffe98a');
  word.setFill(grad);
  root.add(word);

  // Subtle additive glow ghost behind wordmark.
  const glow = scene.add
    .text(0, 0, 'LUCKY  SLOT', {
      fontFamily: '"Impact", "Arial Black", "Helvetica Neue", sans-serif',
      fontSize: `${fontSize}px`,
      fontStyle: 'bold',
      color: '#ffd700',
    })
    .setOrigin(0.5)
    .setAlpha(0.28)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(1.04);
  root.addAt(glow, root.list.indexOf(word));

  // ── Sweeping shine across the wordmark, masked to the bar ──
  const shineW = Math.max(40, barW * 0.18);
  const shine = scene.add.graphics();
  shine.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0, 0.6, 0, 0);
  shine.fillRect(-shineW / 2, -barH / 2 + 2, shineW, barH - 4);
  shine.setBlendMode(Phaser.BlendModes.ADD);
  shine.setAlpha(0.55);
  const mask = scene.make.graphics({ x: 0, y: 0 }, false);
  mask.fillStyle(0xffffff);
  mask.fillRoundedRect(centerX - barW / 2, centerY - barH / 2, barW, barH, r);
  shine.setMask(mask.createGeometryMask());
  shine.x = -barW / 2 - shineW;
  root.add(shine);
  scene.tweens.add({
    targets: shine,
    x: barW / 2 + shineW,
    duration: 1500,
    repeat: -1,
    repeatDelay: 2400,
    ease: 'Sine.InOut',
  });

  // Sparkle glints on top of the bar (only if asset loaded).
  if (scene.textures.exists(SPARKLE_TEXTURE)) {
    const glintXs = [-barW * 0.32, -barW * 0.1, barW * 0.1, barW * 0.32];
    glintXs.forEach((gx, i) => {
      const glint = scene.add.image(gx, (i % 2 === 0 ? -1 : 1) * barH * 0.25, SPARKLE_TEXTURE);
      glint.setBlendMode(Phaser.BlendModes.ADD);
      glint.setTint(0xffe98a);
      glint.setAlpha(0);
      glint.setScale(0.9);
      root.add(glint);
      scene.tweens.add({
        targets: glint,
        alpha: { from: 0, to: 0.85 },
        scale: { from: 0.5, to: 1.3 },
        duration: 540,
        yoyo: true,
        delay: 300 + i * 480,
        repeat: -1,
        repeatDelay: 1900 + i * 220,
        ease: 'Sine.InOut',
      });
    });
  }

  return root;
}
