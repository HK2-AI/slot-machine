import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

export function createTitle(scene: Phaser.Scene): Phaser.GameObjects.Text {
  const title = scene.add
    .text(GAME_WIDTH / 2, 56, '🎰  LUCKY  SLOT  🎰', {
      fontFamily: '"Impact", "Arial Black", "Helvetica Neue", sans-serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#1a0a00',
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(60);
  title.setShadow(0, 4, '#000000', 10, false, true);

  // Vertical gradient fill (light gold top → amber bottom).
  const gradient = title.context.createLinearGradient(0, 0, 0, title.height);
  gradient.addColorStop(0, '#fff4b3');
  gradient.addColorStop(0.5, '#ffd700');
  gradient.addColorStop(1, '#b8860b');
  title.setFill(gradient);

  // Soft outer glow: a slightly larger faded copy underneath.
  const glow = scene.add
    .text(GAME_WIDTH / 2, 56, '🎰  LUCKY  SLOT  🎰', {
      fontFamily: '"Impact", "Arial Black", "Helvetica Neue", sans-serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#ffd700',
    })
    .setOrigin(0.5)
    .setAlpha(0.35)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(59);
  glow.setScale(1.03);

  // Subtle vertical bob.
  const baseY = title.y;
  scene.tweens.add({
    targets: [title, glow],
    y: baseY + 3,
    duration: 2000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });

  return title;
}
