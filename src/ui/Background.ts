import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const SPARKLE_TEXTURE = 'fx-sparkle';

function ensureSparkleTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SPARKLE_TEXTURE)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // Soft radial-ish sparkle: bright core + faint halo.
  g.fillStyle(0xffffff, 0.25);
  g.fillCircle(8, 8, 8);
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(8, 8, 5);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 2.5);
  g.generateTexture(SPARKLE_TEXTURE, 16, 16);
  g.destroy();
}

export class Background {
  constructor(scene: Phaser.Scene) {
    ensureSparkleTexture(scene);

    // Base deep velvet fill.
    const base = scene.add.graphics();
    base.fillStyle(0x050410, 1);
    base.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    base.setDepth(0);

    // Fake radial glow: a few concentric translucent circles at center.
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const glow = scene.add.graphics();
    const layers: Array<[number, number, number]> = [
      [0x2a1a4a, 0.55, 720],
      [0x3a2266, 0.35, 540],
      [0x4a2e80, 0.25, 380],
      [0x5a3a96, 0.18, 240],
    ];
    for (const [color, alpha, r] of layers) {
      glow.fillStyle(color, alpha);
      glow.fillCircle(cx, cy, r);
    }
    glow.setDepth(1);

    // Rotating light beams (very faint, behind cabinet).
    const beamCount = 3;
    for (let i = 0; i < beamCount; i++) {
      const beam = scene.add.graphics();
      beam.fillStyle(0xffffff, 0.06);
      beam.beginPath();
      beam.moveTo(0, 0);
      beam.lineTo(-260, 900);
      beam.lineTo(260, 900);
      beam.closePath();
      beam.fillPath();
      beam.setPosition(cx, cy);
      beam.setRotation((i * Math.PI * 2) / beamCount);
      beam.setBlendMode(Phaser.BlendModes.ADD);
      beam.setDepth(2);
      scene.tweens.add({
        targets: beam,
        rotation: beam.rotation + Math.PI * 2,
        duration: 22000 + i * 5000,
        repeat: -1,
        ease: 'Linear',
      });
    }

    // Drifting gold sparkles — sparse ambient emitter.
    const emitter = scene.add.particles(0, 0, SPARKLE_TEXTURE, {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 12,
      lifespan: 4000,
      speedY: { min: -45, max: -22 },
      speedX: { min: -12, max: 12 },
      scale: { start: 0.55, end: 0.1 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xffd700, 0xffe98a, 0xfff4b3],
      frequency: 1800,
      blendMode: 'ADD',
      quantity: 1,
    });
    emitter.setDepth(3);
  }
}

export { SPARKLE_TEXTURE };
