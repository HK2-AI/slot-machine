import Phaser from 'phaser';

const CHIP_W = 92;
const CHIP_H = 22;

/** Streak-tier styling. Climbs in intensity as the chain grows. */
function tierForStreak(n: number): { color: number; glow: number; flame: string } {
  if (n >= 8) return { color: 0xff3355, glow: 0xff3355, flame: '🔥🔥' };
  if (n >= 5) return { color: 0xff8a3a, glow: 0xff8a3a, flame: '🔥' };
  if (n >= 3) return { color: 0xffd700, glow: 0xffd700, flame: '✦' };
  return { color: 0x88889e, glow: 0x000000, flame: '·' };
}

/**
 * Compact "consecutive wins" indicator. Shown only when streak >= 2; the
 * chip ramps up its color/intensity at 3, 5, 8 to telegraph the
 * incoming streak bonus on the next win.
 */
export class StreakChip extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly halo: Phaser.GameObjects.Graphics;
  private readonly text: Phaser.GameObjects.Text;
  private streak = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setSize(CHIP_W, CHIP_H);
    this.setDepth(170);

    this.halo = scene.add.graphics();
    this.halo.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.halo);

    this.bg = scene.add.graphics();
    this.add(this.bg);

    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5);
    this.add(this.text);

    this.setVisible(false);
  }

  /** Update the chip to reflect the new streak count. Animates on increase. */
  setStreak(n: number): void {
    const prev = this.streak;
    this.streak = n;
    if (n < 2) {
      this.setVisible(false);
      return;
    }
    const tier = tierForStreak(n);
    const colorHex = '#' + tier.color.toString(16).padStart(6, '0');

    this.bg.clear();
    this.bg.fillStyle(0x0a0a18, 0.92);
    this.bg.fillRoundedRect(-CHIP_W / 2, -CHIP_H / 2, CHIP_W, CHIP_H, CHIP_H / 2);
    this.bg.lineStyle(1.5, tier.color, 0.95);
    this.bg.strokeRoundedRect(-CHIP_W / 2, -CHIP_H / 2, CHIP_W, CHIP_H, CHIP_H / 2);

    this.halo.clear();
    if (n >= 3) {
      this.halo.fillStyle(tier.glow, 0.18);
      this.halo.fillRoundedRect(
        -CHIP_W / 2 - 4,
        -CHIP_H / 2 - 4,
        CHIP_W + 8,
        CHIP_H + 8,
        (CHIP_H + 8) / 2,
      );
    }

    this.text.setText(`${tier.flame} STREAK ×${n}`);
    this.text.setColor(colorHex);
    this.setVisible(true);

    if (n > prev) {
      this.setScale(0.6);
      this.scene.tweens.add({
        targets: this,
        scale: 1,
        duration: 240,
        ease: 'Back.Out',
      });
    }
  }

  reset(): void {
    if (this.streak === 0) return;
    this.streak = 0;
    this.setVisible(false);
  }
}
