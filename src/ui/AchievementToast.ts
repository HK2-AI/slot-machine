import Phaser from 'phaser';
import { i18n } from '../systems/I18n';
import type { AchievementDef } from '../systems/Achievements';

const TOAST_W = 300;
const TOAST_H = 64;
const SLIDE_DURATION = 320;
const HOLD_DURATION = 2800;

/**
 * Per-scene helper that slides in a small unlock pill from the top-right when
 * an achievement triggers. Multiple unlocks (e.g. "first spin" + "veteran" on
 * the same spin) stack vertically and dismiss independently.
 */
export class AchievementToastQueue {
  private active: Phaser.GameObjects.Container[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  show(def: AchievementDef): void {
    const W = this.scene.scale.width;
    const slot = this.active.length;
    const targetY = 12 + slot * (TOAST_H + 8);
    const startX = W + TOAST_W;
    const targetX = W - TOAST_W / 2 - 12;

    const wrap = this.scene.add.container(startX, targetY + TOAST_H / 2);
    wrap.setDepth(420);
    this.active.push(wrap);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x07071a, 0.96);
    bg.fillRoundedRect(-TOAST_W / 2, -TOAST_H / 2, TOAST_W, TOAST_H, 12);
    bg.lineStyle(2, 0xffd700, 1);
    bg.strokeRoundedRect(-TOAST_W / 2, -TOAST_H / 2, TOAST_W, TOAST_H, 12);
    bg.lineStyle(1, 0xffd700, 0.35);
    bg.strokeRoundedRect(-TOAST_W / 2 + 4, -TOAST_H / 2 + 4, TOAST_W - 8, TOAST_H - 8, 9);
    wrap.add(bg);

    const iconT = this.scene.add
      .text(-TOAST_W / 2 + 24, 0, def.icon, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
      })
      .setOrigin(0.5);
    wrap.add(iconT);

    const head = this.scene.add
      .text(-TOAST_W / 2 + 50, -12, i18n.t('achievement-unlocked'), {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0, 0.5);
    wrap.add(head);

    const name = this.scene.add
      .text(-TOAST_W / 2 + 50, 10, i18n.t(def.nameKey), {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);
    wrap.add(name);

    this.scene.tweens.add({
      targets: wrap,
      x: targetX,
      duration: SLIDE_DURATION,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: wrap,
      x: startX,
      alpha: 0,
      duration: SLIDE_DURATION,
      delay: SLIDE_DURATION + HOLD_DURATION,
      ease: 'Cubic.In',
      onComplete: () => {
        const idx = this.active.indexOf(wrap);
        if (idx >= 0) this.active.splice(idx, 1);
        wrap.destroy();
        this.reflow();
      },
    });
  }

  /** Slide remaining toasts up after one above them dismisses. */
  private reflow(): void {
    for (let i = 0; i < this.active.length; i++) {
      const wrap = this.active[i];
      const targetY = 12 + i * (TOAST_H + 8) + TOAST_H / 2;
      this.scene.tweens.add({
        targets: wrap,
        y: targetY,
        duration: 240,
        ease: 'Sine.Out',
      });
    }
  }

  destroy(): void {
    for (const w of this.active) w.destroy();
    this.active.length = 0;
  }
}
