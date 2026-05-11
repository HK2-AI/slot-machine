import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { rng } from '../systems/RNG';
import { ReelStrip } from '../systems/ReelStrip';
import { REEL_STRIPS } from '../data/reelStrips';
import { ReelView } from '../ui/ReelView';
import { Background, SPARKLE_TEXTURE } from '../ui/Background';
import { CabinetFrame, drawReelSeparator } from '../ui/CabinetFrame';
import { SpinButton } from '../ui/SpinButton';
import { Hud } from '../ui/Hud';
import { createTitle } from '../ui/Title';

const NUM_REELS = 5;
const VISIBLE_ROWS = 3;
const SYMBOL_SIZE = 96;
const REEL_GAP = 8;

export class MainScene extends Phaser.Scene {
  private reels: ReelView[] = [];
  private spinButton!: SpinButton;
  private spinning = false;
  private blockX = 0;
  private blockY = 0;
  private blockW = 0;
  private blockH = 0;
  private cabinet!: CabinetFrame;

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    // 1. Background — velvet, light beams, corner spotlights, focus spot, continuous sparkles.
    new Background(this);

    // 2. Title bar.
    createTitle(this);

    // 3. Reel block geometry.
    const totalReelW = NUM_REELS * SYMBOL_SIZE + (NUM_REELS - 1) * REEL_GAP;
    const blockH = VISIBLE_ROWS * SYMBOL_SIZE;
    const blockX = (GAME_WIDTH - totalReelW) / 2;
    const blockY = 140;
    this.blockX = blockX;
    this.blockY = blockY;
    this.blockW = totalReelW;
    this.blockH = blockH;

    // 4. Cabinet frame (with halo + pillars + corner ornaments + shine sweep + floor reflection).
    this.cabinet = new CabinetFrame(this, blockX, blockY, totalReelW, blockH);

    // 5. Reels.
    for (let i = 0; i < NUM_REELS; i++) {
      const strip = new ReelStrip(REEL_STRIPS[i]);
      const rx = blockX + i * (SYMBOL_SIZE + REEL_GAP) + SYMBOL_SIZE / 2;
      const reel = new ReelView(this, rx, blockY, strip, SYMBOL_SIZE, rng);
      reel.setDepth(110);
      this.reels.push(reel);
    }

    // 6. Reel separators (gold gradient bars + diamond caps).
    for (let i = 1; i < NUM_REELS; i++) {
      const sx = blockX + i * SYMBOL_SIZE + (i - 1) * REEL_GAP + REEL_GAP / 2;
      drawReelSeparator(this, sx, blockY + 4, blockY + blockH - 4);
    }

    // 7. SPIN button (circular, multi-layer 3D, pulsing glow, breath anim).
    const btnY = blockY + blockH + 90;
    this.spinButton = new SpinButton(this, GAME_WIDTH / 2, btnY, () =>
      this.handleSpin(),
    );
    this.spinButton.setDepth(150);

    // 8. HUD strip (CREDIT / BET / WIN) with scanlines.
    new Hud(this, GAME_HEIGHT - 80);
  }

  private handleSpin(): void {
    if (this.spinning) return;
    this.spinning = true;
    this.spinButton.setDisabled(true);

    let finished = 0;
    for (let i = 0; i < this.reels.length; i++) {
      const reel = this.reels[i];
      const stop = reel.strip.pickStopIndex(rng);
      const duration = 1200 + i * 250;
      reel.spinTo(stop, duration, () => {
        this.playReelStopFx(i);
        finished++;
        if (finished === this.reels.length) {
          this.spinning = false;
          this.spinButton.setDisabled(false);
        }
      });
    }
  }

  private playReelStopFx(reelIndex: number): void {
    const reelX = this.blockX + reelIndex * (SYMBOL_SIZE + REEL_GAP);
    const reelCenterX = reelX + SYMBOL_SIZE / 2;
    const reelCenterY = this.blockY + this.blockH / 2;

    // Brief brightness flash over the column.
    const flash = this.add.graphics();
    flash.setDepth(130);
    flash.fillStyle(0xffffff, 0.5);
    flash.fillRoundedRect(reelX, this.blockY, SYMBOL_SIZE, this.blockH, 8);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      ease: 'Sine.Out',
      onComplete: () => flash.destroy(),
    });

    // Small white expanding flash circle at center of the column.
    const pop = this.add.graphics();
    pop.setDepth(131);
    pop.setBlendMode(Phaser.BlendModes.ADD);
    pop.fillStyle(0xffffff, 1);
    pop.fillCircle(0, 0, 18);
    pop.setPosition(reelCenterX, reelCenterY);
    pop.setScale(0.2);
    this.tweens.add({
      targets: pop,
      scale: 2.2,
      alpha: 0,
      duration: 260,
      ease: 'Sine.Out',
      onComplete: () => pop.destroy(),
    });

    // Brief warm tint on the symbol cells in this column.
    this.reels[reelIndex].flashTint(0xfff5cc, 110);

    // Sparkle burst at the bottom edge.
    const px = reelCenterX;
    const py = this.blockY + this.blockH - 4;
    const burst = this.add.particles(px, py, SPARKLE_TEXTURE, {
      speed: { min: 100, max: 200 },
      angle: { min: 200, max: 340 },
      lifespan: 460,
      scale: { start: 0.75, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd700, 0xfff4b3, 0xffe98a],
      blendMode: 'ADD',
      emitting: false,
    });
    burst.setDepth(140);
    burst.explode(14);
    this.time.delayedCall(800, () => burst.destroy());

    // Last reel — bigger screen shake, halo pulse, expanding ring ripple.
    if (reelIndex === this.reels.length - 1) {
      this.cameras.main.shake(200, 0.005);

      const halo = this.cabinet.handles.halo;
      this.tweens.add({
        targets: halo,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 180,
        yoyo: true,
        ease: 'Sine.Out',
      });

      // Expanding gold ring from the cabinet center.
      const ring = this.add.graphics();
      ring.setDepth(141);
      ring.setBlendMode(Phaser.BlendModes.ADD);
      ring.lineStyle(3, 0xffd700, 1);
      ring.strokeRoundedRect(
        -this.blockW / 2 - 12,
        -this.blockH / 2 - 12,
        this.blockW + 24,
        this.blockH + 24,
        18,
      );
      ring.setPosition(this.blockX + this.blockW / 2, this.blockY + this.blockH / 2);
      ring.setScale(1);
      ring.setAlpha(0.7);
      this.tweens.add({
        targets: ring,
        scale: 1.3,
        alpha: 0,
        duration: 700,
        ease: 'Sine.Out',
        onComplete: () => ring.destroy(),
      });
    }
  }
}
