import Phaser from 'phaser';
import { audio } from '../systems/AudioManager';
import { Balance } from '../systems/Balance';
import { i18n } from '../systems/I18n';
import { makeButton } from './containerInput';

const DEPTH = 410;
export const REFILL_AMOUNT = 1000;

interface RefillOpts {
  /** Called after credits are added so the scene can refresh HUD/buy-bonus state. */
  onRefilled: () => void;
}

/**
 * Centered "out of credits" prompt with a single tap to add 1000 credits.
 * Auto-opens when the player tries to spin while broke. Also surfaceable
 * from the Settings drawer for any-time top-ups.
 */
export class RefillModal {
  private container?: Phaser.GameObjects.Container;
  private isOpen = false;

  constructor(private readonly scene: Phaser.Scene, private readonly opts: RefillOpts) {}

  public open(reason: 'broke' | 'manual' = 'manual'): void {
    if (this.isOpen) return;
    this.isOpen = true;

    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const MODAL_W = Math.min(340, W - 24);
    const MODAL_H = Math.min(220, H - 24);

    const container = this.scene.add.container(0, 0);
    container.setDepth(DEPTH);
    this.container = container;

    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.78);
    backdrop.fillRect(0, 0, W, H);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
    backdrop.on('pointerdown', () => {
      audio.play('click');
      this.close();
    });
    container.add(backdrop);

    const mx = (W - MODAL_W) / 2;
    const my = (H - MODAL_H) / 2;
    const cx = W / 2;

    const panel = this.scene.add.graphics();
    panel.fillGradientStyle(0x141430, 0x141430, 0x07071a, 0x07071a, 1);
    panel.fillRoundedRect(mx, my, MODAL_W, MODAL_H, 14);
    panel.lineStyle(3, 0xffd700, 1);
    panel.strokeRoundedRect(mx, my, MODAL_W, MODAL_H, 14);
    panel.lineStyle(1, 0xffd700, 0.3);
    panel.strokeRoundedRect(mx + 6, my + 6, MODAL_W - 12, MODAL_H - 12, 10);
    panel.setInteractive(
      new Phaser.Geom.Rectangle(mx, my, MODAL_W, MODAL_H),
      Phaser.Geom.Rectangle.Contains,
    );
    panel.on('pointerdown', (
      _p: Phaser.Input.Pointer,
      _lx: number,
      _ly: number,
      e: Phaser.Types.Input.EventData,
    ) => e.stopPropagation());
    container.add(panel);

    const title = this.scene.add
      .text(cx, my + 28, reason === 'broke' ? i18n.t('out-of-credits') : i18n.t('top-up').replace('+ ', ''), {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: reason === 'broke' ? '#ff5566' : '#ffd700',
      })
      .setOrigin(0.5);
    title.setShadow(0, 2, '#000000', 4, false, true);
    container.add(title);

    const sub = this.scene.add
      .text(cx, my + 64,
        reason === 'broke' ? i18n.t('refill-broke') : i18n.t('refill-manual', { n: REFILL_AMOUNT }),
        {
          fontFamily: '"Arial", sans-serif',
          fontSize: '13px',
          color: '#bcbcd6',
        })
      .setOrigin(0.5);
    container.add(sub);

    // Big REFILL button.
    const btnW = 200;
    const btnH = 52;
    const btnY = my + MODAL_H - 60;
    const btn = makeButton(this.scene, cx, btnY, {
      shape: 'rect',
      w: btnW,
      h: btnH,
      hoverScale: 1.06,
      pressScale: 0.94,
      onClick: () => {
        audio.play('win-medium');
        Balance.add(REFILL_AMOUNT);
        this.opts.onRefilled();
        this.flashAndClose(cx, btnY);
      },
    });
    const bg = this.scene.add.graphics();
    bg.fillGradientStyle(0xffe98a, 0xffe98a, 0xffd700, 0xc9920a, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    bg.lineStyle(2.5, 0xfff4b3, 1);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    btn.add(bg);
    const t = this.scene.add
      .text(0, 0, i18n.t('refill-button', { n: REFILL_AMOUNT }), {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#1a0a00',
      })
      .setOrigin(0.5);
    btn.add(t);
    container.add(btn);

    // Soft pulse to draw the eye.
    this.scene.tweens.add({
      targets: btn,
      scale: { from: 1, to: 1.04 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Tiny dismiss link.
    const dismiss = this.scene.add
      .text(cx, my + MODAL_H - 16, i18n.t('no-thanks'), {
        fontFamily: '"Arial", sans-serif',
        fontSize: '11px',
        color: '#88889e',
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    dismiss.on('pointerdown', () => {
      audio.play('click');
      this.close();
    });
    container.add(dismiss);

    container.setAlpha(0);
    this.scene.tweens.add({ targets: container, alpha: 1, duration: 180, ease: 'Sine.Out' });
  }

  private flashAndClose(cx: number, cy: number): void {
    // Coin-burst hint: small "+1000" floats up before the modal fades.
    const flash = this.scene.add
      .text(cx, cy - 50, `+${REFILL_AMOUNT}`, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#4be84b',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 5);
    flash.setShadow(0, 0, '#4be84b', 12, false, true);
    flash.setAlpha(0);
    flash.setScale(0.4);
    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.4, to: 1.1 },
      duration: 220,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: flash,
      y: flash.y - 30,
      alpha: 0,
      duration: 380,
      delay: 250,
      ease: 'Sine.Out',
      onComplete: () => flash.destroy(),
    });
    this.scene.time.delayedCall(420, () => this.close());
  }

  public close(): void {
    if (!this.isOpen || !this.container) return;
    const c = this.container;
    this.isOpen = false;
    this.container = undefined;
    this.scene.tweens.add({
      targets: c,
      alpha: 0,
      duration: 140,
      ease: 'Sine.In',
      onComplete: () => c.destroy(),
    });
  }
}
