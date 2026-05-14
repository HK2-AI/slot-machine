import Phaser from 'phaser';
import type { WinLine } from '../systems/PaylineEvaluator';
import { audio } from '../systems/AudioManager';

const COIN_TEXTURE = 'fx-coin';
const CONFETTI_TEXTURE = 'fx-confetti';

interface ReelGeometry {
  readonly blockX: number;
  readonly blockY: number;
  readonly blockW: number;
  readonly blockH: number;
  readonly symbolSize: number;
  readonly cellHeight?: number;
  readonly reelGap: number;
}

function ensureCoinTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(COIN_TEXTURE)) return;
  const size = 18;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x6a4a06, 1);
  g.fillCircle(size / 2, size / 2, size / 2);
  g.fillStyle(0xffd700, 1);
  g.fillCircle(size / 2, size / 2, size / 2 - 1);
  g.fillStyle(0xfff4b3, 1);
  g.fillCircle(size / 2 - 2, size / 2 - 2, size / 2 - 5);
  g.fillStyle(0xffffff, 0.75);
  g.fillCircle(size / 2 - 3, size / 2 - 3, 1.6);
  g.generateTexture(COIN_TEXTURE, size, size);
  g.destroy();
}

function ensureConfettiTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(CONFETTI_TEXTURE)) return;
  const size = 8;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, size, size);
  g.generateTexture(CONFETTI_TEXTURE, size, size);
  g.destroy();
}

export class WinFx {
  private readonly creditTarget: { x: number; y: number };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly geom: ReelGeometry,
    creditPanelCenter: { x: number; y: number },
  ) {
    ensureCoinTexture(scene);
    ensureConfettiTexture(scene);
    this.creditTarget = creditPanelCenter;
  }

  /**
   * Float a "+payout" gold label at the right end of a winning payline.
   * Drifts up 60px while fading.
   */
  public floatLineAmount(win: WinLine): void {
    const { blockX, symbolSize, reelGap, cellHeight } = this.geom;
    const ch = cellHeight ?? symbolSize;
    const lastCol = win.cells[win.cells.length - 1][0];
    const lastRow = win.cells[win.cells.length - 1][1];
    const x = blockX + lastCol * (symbolSize + reelGap) + symbolSize + 12;
    const y = this.geom.blockY + lastRow * ch + ch / 2;

    const t = this.scene.add
      .text(x, y, `+${win.payout}`, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#2a1a00',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5)
      .setDepth(190);
    t.setShadow(0, 2, '#000000', 4, false, true);
    this.scene.tweens.add({
      targets: t,
      y: y - 60,
      alpha: { from: 1, to: 0 },
      duration: 1000,
      ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
  }

  /**
   * Center "WIN +XXX" badge — back.out scale-in, hold, fade-out.
   */
  public centerBadge(amount: number): void {
    const cx = this.geom.blockX + this.geom.blockW / 2;
    const cy = this.geom.blockY + this.geom.blockH / 2;

    const wrap = this.scene.add.container(cx, cy);
    wrap.setDepth(220);

    const winT = this.scene.add
      .text(0, -2, 'WIN', {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '36px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1a0a00',
        strokeThickness: 6,
      })
      .setOrigin(1, 0.5);
    winT.x = -8;
    winT.setShadow(0, 3, '#000000', 6, false, true);
    wrap.add(winT);

    const amtT = this.scene.add
      .text(0, -2, `+${amount}`, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#1a0a00',
        strokeThickness: 6,
      })
      .setOrigin(0, 0.5);
    amtT.x = 8;
    amtT.setShadow(0, 3, '#000000', 6, false, true);
    wrap.add(amtT);

    wrap.setScale(0.3);
    wrap.setAlpha(0);
    this.scene.tweens.add({
      targets: wrap,
      alpha: 1,
      scale: 1.15,
      duration: 320,
      ease: 'Back.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: wrap,
          scale: 1.0,
          duration: 140,
          ease: 'Sine.Out',
        });
        this.scene.tweens.add({
          targets: wrap,
          alpha: 0,
          duration: 360,
          delay: 1200,
          ease: 'Sine.In',
          onComplete: () => wrap.destroy(),
        });
      },
    });
  }

  /**
   * Burst of coins from cabinet center, each on a parabolic arc heading
   * toward the CREDIT HUD panel. Uses per-coin tweens for explicit control.
   */
  public coinBurst(count: number): void {
    const cx = this.geom.blockX + this.geom.blockW / 2;
    const cy = this.geom.blockY + this.geom.blockH / 2;
    const target = this.creditTarget;

    for (let i = 0; i < count; i++) {
      const coin = this.scene.add.image(cx, cy, COIN_TEXTURE);
      coin.setDepth(215);
      coin.setScale(0.6 + Math.random() * 0.6);
      coin.setBlendMode(Phaser.BlendModes.NORMAL);

      const jitterX = (Math.random() - 0.5) * 80;
      const jitterY = (Math.random() - 0.5) * 30;
      const apexX = cx + (target.x - cx) * 0.5 + jitterX;
      const apexY = Math.min(cy, target.y) - 120 - Math.random() * 100;
      const endX = target.x + jitterX * 0.4;
      const endY = target.y + jitterY * 0.4;
      const duration = 700 + Math.random() * 350;
      const delay = i * 18;

      const state = { t: 0 };
      this.scene.tweens.add({
        targets: state,
        t: 1,
        duration,
        delay,
        ease: 'Cubic.In',
        onUpdate: () => {
          const t = state.t;
          const ix = (1 - t) * (1 - t) * cx + 2 * (1 - t) * t * apexX + t * t * endX;
          const iy = (1 - t) * (1 - t) * cy + 2 * (1 - t) * t * apexY + t * t * endY;
          coin.x = ix;
          coin.y = iy;
        },
        onComplete: () => {
          audio.playCoin();
          this.scene.tweens.add({
            targets: coin,
            alpha: 0,
            scale: coin.scale * 1.6,
            duration: 140,
            ease: 'Sine.Out',
            onComplete: () => coin.destroy(),
          });
        },
      });
      this.scene.tweens.add({
        targets: coin,
        angle: 360 * (Math.random() > 0.5 ? 1 : -1),
        duration,
        delay,
        ease: 'Linear',
      });
    }
  }

  /**
   * Big "FREE SPINS!" trigger banner. Plays when 3+ scatters land.
   * Holds ~1.6s before the caller starts the auto-spin loop.
   */
  public playFreeSpinsTrigger(scatters: number, awarded: number, onDone?: () => void): void {
    const cx = this.geom.blockX + this.geom.blockW / 2;
    const cy = this.geom.blockY + this.geom.blockH / 2;
    const wrap = this.scene.add.container(cx, cy);
    wrap.setDepth(260);

    const main = this.scene.add
      .text(0, -22, 'FREE SPINS!', {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#44eaff',
        stroke: '#001a22',
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    main.setShadow(0, 4, '#000000', 12, false, true);
    wrap.add(main);

    const sub = this.scene.add
      .text(0, 36, `${scatters}× SCATTER  →  +${awarded} SPINS`, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#1a0a00',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    sub.setShadow(0, 2, '#000000', 6, false, true);
    wrap.add(sub);

    wrap.setScale(0.3);
    wrap.setAlpha(0);
    this.scene.tweens.add({
      targets: wrap,
      alpha: 1,
      scale: 1.1,
      duration: 360,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: wrap,
      scale: 1.0,
      duration: 200,
      delay: 360,
      ease: 'Sine.Out',
    });
    this.scene.tweens.add({
      targets: wrap,
      alpha: 0,
      duration: 320,
      delay: 1500,
      ease: 'Sine.In',
      onComplete: () => {
        wrap.destroy();
        onDone?.();
      },
    });

    this.cameras().shake(280, 0.006);
    this.confettiShower();
  }

  /** "FREE SPINS COMPLETE" summary banner with total free-spin winnings. */
  public playFreeSpinsEnd(totalWin: number, onDone?: () => void): void {
    const cx = this.geom.blockX + this.geom.blockW / 2;
    const cy = this.geom.blockY + this.geom.blockH / 2;
    const wrap = this.scene.add.container(cx, cy);
    wrap.setDepth(260);

    const top = this.scene.add
      .text(0, -28, 'FREE SPINS COMPLETE', {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#44eaff',
        stroke: '#001a22',
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    top.setShadow(0, 2, '#000000', 6, false, true);
    wrap.add(top);

    const big = this.scene.add
      .text(0, 24, `TOTAL +${totalWin}`, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '56px',
        fontStyle: 'bold',
        color: '#ffd700',
        stroke: '#1a0a00',
        strokeThickness: 7,
      })
      .setOrigin(0.5);
    big.setShadow(0, 4, '#000000', 10, false, true);
    wrap.add(big);

    wrap.setScale(0.4);
    wrap.setAlpha(0);
    this.scene.tweens.add({
      targets: wrap,
      alpha: 1,
      scale: 1.05,
      duration: 320,
      ease: 'Back.Out',
    });
    this.scene.tweens.add({
      targets: wrap,
      alpha: 0,
      duration: 360,
      delay: 1900,
      ease: 'Sine.In',
      onComplete: () => {
        wrap.destroy();
        onDone?.();
      },
    });
  }

  /**
   * MEGA WIN banner — bigger, slower than centerBadge. For wins ≥ 25× total bet.
   * Letter-by-letter scale-in then a stamping flash on the amount.
   */
  public playMegaWin(amount: number, onDone?: () => void): void {
    const cx = this.geom.blockX + this.geom.blockW / 2;
    const cy = this.geom.blockY + this.geom.blockH / 2;
    const wrap = this.scene.add.container(cx, cy);
    wrap.setDepth(265);

    const letters = 'MEGA WIN'.split('');
    const letterPx = Math.max(56, Math.floor(this.geom.symbolSize * 0.95));
    const letterObjs: Phaser.GameObjects.Text[] = [];
    let cursorX = 0;

    // Measure first to center the row.
    const tempW: number[] = [];
    let totalW = 0;
    for (const ch of letters) {
      const m = this.scene.add
        .text(0, 0, ch, {
          fontFamily: '"Impact", "Arial Black", sans-serif',
          fontSize: `${letterPx}px`,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      tempW.push(m.width);
      totalW += m.width;
      m.destroy();
    }
    cursorX = -totalW / 2;

    for (let i = 0; i < letters.length; i++) {
      const t = this.scene.add
        .text(cursorX, -letterPx * 0.4, letters[i], {
          fontFamily: '"Impact", "Arial Black", sans-serif',
          fontSize: `${letterPx}px`,
          fontStyle: 'bold',
          color: '#ffd700',
          stroke: '#1a0a00',
          strokeThickness: Math.max(6, Math.floor(letterPx * 0.13)),
        })
        .setOrigin(0, 0.5);
      t.setShadow(0, 5, '#000000', 12, false, true);
      t.setScale(0);
      t.setAlpha(0);
      cursorX += tempW[i];
      wrap.add(t);
      letterObjs.push(t);
      this.scene.tweens.add({
        targets: t,
        scale: 1,
        alpha: 1,
        duration: 220,
        delay: i * 80,
        ease: 'Back.Out',
      });
    }

    const amtPx = Math.max(40, Math.floor(letterPx * 0.7));
    const amt = this.scene.add
      .text(0, letterPx * 0.55, `+${amount}`, {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: `${amtPx}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#1a0a00',
        strokeThickness: Math.max(5, Math.floor(amtPx * 0.12)),
      })
      .setOrigin(0.5);
    amt.setShadow(0, 4, '#000000', 10, false, true);
    amt.setScale(0);
    wrap.add(amt);
    this.scene.tweens.add({
      targets: amt,
      scale: 1,
      duration: 280,
      delay: letters.length * 80 + 80,
      ease: 'Back.Out',
    });

    // Sweep highlight across the letters.
    const sweepDelay = letters.length * 80 + 240;
    this.scene.time.delayedCall(sweepDelay, () => {
      for (let i = 0; i < letterObjs.length; i++) {
        const t = letterObjs[i];
        this.scene.tweens.add({
          targets: t,
          scale: { from: 1, to: 1.18 },
          duration: 180,
          delay: i * 60,
          yoyo: true,
          ease: 'Sine.InOut',
        });
      }
    });

    this.cameras().shake(420, 0.01);

    this.scene.tweens.add({
      targets: wrap,
      alpha: { from: 1, to: 0 },
      duration: 460,
      delay: 2400,
      ease: 'Sine.In',
      onComplete: () => {
        wrap.destroy();
        onDone?.();
      },
    });
  }

  private cameras(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  /**
   * Confetti shower from the top of the screen — only used for BIG WIN.
   */
  public confettiShower(): void {
    const colors = [0xff4d6d, 0x4dd0e1, 0xffd54f, 0x81c784, 0xba68c8, 0xffab40];
    const cx = this.geom.blockX + this.geom.blockW / 2;
    for (let i = 0; i < 36; i++) {
      const sprite = this.scene.add.image(cx + (Math.random() - 0.5) * 600, -20, CONFETTI_TEXTURE);
      sprite.setTint(colors[i % colors.length]);
      sprite.setDepth(230);
      sprite.setScale(0.8 + Math.random() * 0.8, 0.4 + Math.random() * 0.6);

      const fallY = 740 + Math.random() * 60;
      const driftX = (Math.random() - 0.5) * 240;
      const duration = 1800 + Math.random() * 900;

      this.scene.tweens.add({
        targets: sprite,
        y: fallY,
        x: sprite.x + driftX,
        angle: (Math.random() - 0.5) * 720,
        alpha: { from: 1, to: 0 },
        duration,
        delay: Math.random() * 200,
        ease: 'Cubic.In',
        onComplete: () => sprite.destroy(),
      });
    }
  }
}
