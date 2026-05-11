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

  constructor() {
    super({ key: 'MainScene' });
  }

  create(): void {
    // 1. Background — velvet, light beams, ambient sparkles.
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

    // 4. Cabinet frame (with halo + corner ornaments).
    new CabinetFrame(this, blockX, blockY, totalReelW, blockH);

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

    // 7. SPIN button (circular, pulsing glow).
    const btnY = blockY + blockH + 90;
    this.spinButton = new SpinButton(this, GAME_WIDTH / 2, btnY, () =>
      this.handleSpin(),
    );
    this.spinButton.setDepth(150);

    // 8. HUD strip (CREDIT / BET / WIN).
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
    const reelX =
      this.blockX + reelIndex * (SYMBOL_SIZE + REEL_GAP);
    const flash = this.add.graphics();
    flash.setDepth(130);
    flash.fillStyle(0xffffff, 0.5);
    flash.fillRoundedRect(reelX, this.blockY, SYMBOL_SIZE, this.blockH, 8);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 180,
      ease: 'Sine.Out',
      onComplete: () => flash.destroy(),
    });

    const px = reelX + SYMBOL_SIZE / 2;
    const py = this.blockY + this.blockH - 4;
    const burst = this.add.particles(px, py, SPARKLE_TEXTURE, {
      speed: { min: 90, max: 180 },
      angle: { min: 200, max: 340 },
      lifespan: 420,
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd700, 0xfff4b3, 0xffe98a],
      blendMode: 'ADD',
      emitting: false,
    });
    burst.setDepth(140);
    burst.explode(10);
    this.time.delayedCall(700, () => burst.destroy());

    if (reelIndex === this.reels.length - 1) {
      this.cameras.main.shake(110, 0.002);
    }
  }
}
