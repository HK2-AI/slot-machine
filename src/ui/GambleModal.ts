import Phaser from 'phaser';
import { audio } from '../systems/AudioManager';
import { rng } from '../systems/RNG';
import { i18n } from '../systems/I18n';
import { makeButton } from './containerInput';

const DEPTH = 405;

interface GambleOpts {
  /** Called with the final amount the player walks away with (0 if lost). */
  onResolve: (finalAmount: number, didDouble: boolean) => void;
}

/**
 * Classic post-win risk modal. Player picks RED or BLACK; a 50/50 reveal
 * either doubles their last win or zeroes it. Single shot — no consecutive
 * gambling, to keep the loop tight. Triggered only when settings.gamble is on.
 */
export class GambleModal {
  private container?: Phaser.GameObjects.Container;
  private isOpen = false;
  private resolved = false;

  constructor(private readonly scene: Phaser.Scene) {}

  public open(winAmount: number, opts: GambleOpts): void {
    if (this.isOpen) {
      opts.onResolve(winAmount, false);
      return;
    }
    this.isOpen = true;
    this.resolved = false;

    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const MODAL_W = Math.min(360, W - 24);
    const MODAL_H = Math.min(240, H - 24);

    const container = this.scene.add.container(0, 0);
    container.setDepth(DEPTH);
    this.container = container;

    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.78);
    backdrop.fillRect(0, 0, W, H);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, W, H), Phaser.Geom.Rectangle.Contains);
    backdrop.on('pointerdown', () => {
      // Backdrop tap = take winnings (skip gamble).
      if (this.resolved) return;
      this.resolveAndClose(winAmount, false, opts);
    });
    container.add(backdrop);

    const mx = (W - MODAL_W) / 2;
    const my = (H - MODAL_H) / 2;
    const cx = W / 2;

    const panel = this.scene.add.graphics();
    panel.fillGradientStyle(0x1a0a14, 0x1a0a14, 0x07071a, 0x07071a, 1);
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
      .text(cx, my + 22, i18n.t('double-or-nothing'), {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5);
    title.setShadow(0, 2, '#000000', 4, false, true);
    container.add(title);

    const winLabel = this.scene.add
      .text(cx, my + 56, i18n.t('gamble-prompt', { win: winAmount, doubled: winAmount * 2 }), {
        fontFamily: '"Courier New", monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffe98a',
      })
      .setOrigin(0.5);
    container.add(winLabel);

    // Two card buttons: RED and BLACK.
    const cardW = 90;
    const cardH = 100;
    const gap = 24;
    const cardY = my + MODAL_H / 2 + 22;
    const redX = cx - (cardW + gap) / 2;
    const blackX = cx + (cardW + gap) / 2;

    const makeCard = (x: number, color: 'red' | 'black') => {
      const c = makeButton(this.scene, x, cardY, {
        shape: 'rect',
        w: cardW,
        h: cardH,
        hoverScale: 1.06,
        pressScale: 0.94,
        onClick: () => {
          if (this.resolved) return;
          audio.play('click');
          this.handlePick(color, winAmount, opts);
        },
      });
      const fill = color === 'red' ? 0xc41a2b : 0x111122;
      const stroke = color === 'red' ? 0xff5566 : 0xffffff;
      const g = this.scene.add.graphics();
      g.fillStyle(fill, 1);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
      g.lineStyle(2, stroke, 1);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
      g.lineStyle(1, 0xffd700, 0.4);
      g.strokeRoundedRect(-cardW / 2 + 4, -cardH / 2 + 4, cardW - 8, cardH - 8, 6);
      c.add(g);

      // Suit-style icon (♥ for red, ♠ for black).
      const icon = this.scene.add
        .text(0, -8, color === 'red' ? '♥' : '♠', {
          fontFamily: '"Arial", sans-serif',
          fontSize: '38px',
          fontStyle: 'bold',
          color: color === 'red' ? '#ffffff' : '#ffffff',
        })
        .setOrigin(0.5);
      c.add(icon);

      const labelT = this.scene.add
        .text(0, 30, color === 'red' ? i18n.t('red') : i18n.t('black'), {
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      c.add(labelT);

      container.add(c);
      return c;
    };
    makeCard(redX, 'red');
    makeCard(blackX, 'black');

    // "TAKE WIN" tiny text bottom.
    const skip = this.scene.add
      .text(cx, my + MODAL_H - 14, i18n.t('gamble-take'), {
        fontFamily: '"Arial", sans-serif',
        fontSize: '10px',
        color: '#88889e',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
    container.add(skip);

    container.setAlpha(0);
    this.scene.tweens.add({ targets: container, alpha: 1, duration: 180, ease: 'Sine.Out' });
  }

  private handlePick(pick: 'red' | 'black', winAmount: number, opts: GambleOpts): void {
    this.resolved = true;
    const reveal: 'red' | 'black' = rng.rollInt(0, 1) === 0 ? 'red' : 'black';
    const won = pick === reveal;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const cx = W / 2;
    const cy = H / 2;

    // Reveal flash.
    const flash = this.scene.add
      .text(cx, cy, reveal === 'red' ? '♥' : '♠', {
        fontFamily: '"Arial", sans-serif',
        fontSize: '72px',
        fontStyle: 'bold',
        color: reveal === 'red' ? '#ff3355' : '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 6)
      .setScale(0.3)
      .setAlpha(0);
    flash.setShadow(0, 0, reveal === 'red' ? '#ff3355' : '#ffffff', 16, false, true);
    this.scene.tweens.add({
      targets: flash,
      alpha: 1,
      scale: 1.2,
      duration: 220,
      ease: 'Back.Out',
    });

    const verdict = this.scene.add
      .text(cx, cy + 60, won ? i18n.t('gamble-win', { n: winAmount }) : i18n.t('gamble-bust'), {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: won ? '#4be84b' : '#ff5566',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH + 6)
      .setAlpha(0);
    verdict.setShadow(0, 2, '#000000', 6, false, true);
    this.scene.tweens.add({
      targets: verdict,
      alpha: 1,
      duration: 220,
      delay: 240,
      ease: 'Sine.Out',
    });

    audio.play(won ? 'win-medium' : 'error');

    this.scene.time.delayedCall(1100, () => {
      flash.destroy();
      verdict.destroy();
      const final = won ? winAmount * 2 : 0;
      this.resolveAndClose(final, won, opts);
    });
  }

  private resolveAndClose(amount: number, didDouble: boolean, opts: GambleOpts): void {
    this.close();
    opts.onResolve(amount, didDouble);
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
