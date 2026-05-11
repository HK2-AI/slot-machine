import Phaser from 'phaser';

const RADIUS = 60;

export class SpinButton extends Phaser.GameObjects.Container {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly bodyGroup: Phaser.GameObjects.Container;
  private glowTween?: Phaser.Tweens.Tween;
  private disabled = false;
  private readonly onClick: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onClick: () => void) {
    super(scene, x, y);
    this.onClick = onClick;

    // Pulsing outer glow ring.
    this.glow = scene.add.graphics();
    this.glow.fillStyle(0xffd700, 1);
    this.glow.fillCircle(0, 0, RADIUS);
    this.glow.setAlpha(0.5);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.glow);

    // Button body (radial-gradient via stacked circles).
    this.bodyGroup = scene.add.container(0, 0);
    const bodyG = scene.add.graphics();
    bodyG.fillStyle(0x7a5b0a, 1);
    bodyG.fillCircle(0, 0, RADIUS);
    bodyG.fillStyle(0xb8860b, 1);
    bodyG.fillCircle(0, 0, RADIUS - 4);
    bodyG.fillStyle(0xe6c45e, 1);
    bodyG.fillCircle(0, 0, RADIUS - 16);
    bodyG.fillStyle(0xfff4b3, 1);
    bodyG.fillCircle(-RADIUS * 0.18, -RADIUS * 0.18, RADIUS - 28);
    this.bodyGroup.add(bodyG);

    // Ring strokes for crisper border.
    const ring = scene.add.graphics();
    ring.lineStyle(6, 0xf5d76e, 1);
    ring.strokeCircle(0, 0, RADIUS - 3);
    ring.lineStyle(2, 0x996515, 1);
    ring.strokeCircle(0, 0, RADIUS - 7);
    this.bodyGroup.add(ring);

    // Top highlight arc.
    const hi = scene.add.graphics();
    hi.lineStyle(3, 0xffffff, 0.5);
    hi.beginPath();
    hi.arc(0, 0, RADIUS - 12, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
    hi.strokePath();
    this.bodyGroup.add(hi);

    this.add(this.bodyGroup);

    // SPIN text.
    this.label = scene.add
      .text(0, 0, 'SPIN', {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.label.setShadow(0, 2, '#000000', 4, false, true);
    this.add(this.label);

    // Hit area.
    this.setSize(RADIUS * 2, RADIUS * 2);
    this.setInteractive(
      new Phaser.Geom.Circle(0, 0, RADIUS),
      Phaser.Geom.Circle.Contains,
    );
    scene.input.setDefaultCursor('default');

    this.on('pointerover', () => {
      if (this.disabled) return;
      this.scene.tweens.add({
        targets: this.bodyGroup,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 120,
        ease: 'Sine.Out',
      });
      this.scene.input.setDefaultCursor('pointer');
    });
    this.on('pointerout', () => {
      this.scene.tweens.add({
        targets: this.bodyGroup,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 120,
        ease: 'Sine.Out',
      });
      this.scene.input.setDefaultCursor('default');
    });
    this.on('pointerdown', () => {
      if (this.disabled) return;
      this.scene.tweens.add({
        targets: this.bodyGroup,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 80,
        ease: 'Sine.Out',
      });
      this.flash();
      this.onClick();
    });
    this.on('pointerup', () => {
      if (this.disabled) return;
      this.scene.tweens.add({
        targets: this.bodyGroup,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 120,
        ease: 'Sine.Out',
      });
    });

    this.startGlowTween();
    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
  }

  private startGlowTween(): void {
    this.glow.setScale(1);
    this.glow.setAlpha(0.5);
    this.glowTween = this.scene.tweens.add({
      targets: this.glow,
      scaleX: 1.18,
      scaleY: 1.18,
      alpha: 0,
      duration: 1200,
      yoyo: false,
      repeat: -1,
      ease: 'Sine.Out',
    });
  }

  private flash(): void {
    const f = this.scene.add.graphics();
    f.fillStyle(0xffffff, 0.6);
    f.fillCircle(0, 0, RADIUS);
    f.setBlendMode(Phaser.BlendModes.ADD);
    this.add(f);
    this.scene.tweens.add({
      targets: f,
      alpha: 0,
      duration: 220,
      ease: 'Sine.Out',
      onComplete: () => f.destroy(),
    });
  }

  setDisabled(d: boolean): void {
    if (this.disabled === d) return;
    this.disabled = d;
    if (d) {
      this.glowTween?.stop();
      this.glowTween = undefined;
      this.glow.setAlpha(0);
      this.bodyGroup.setAlpha(0.55);
      this.label.setAlpha(0.7);
      this.label.setText('SPINNING');
      this.scene.input.setDefaultCursor('default');
    } else {
      this.bodyGroup.setAlpha(1);
      this.label.setAlpha(1);
      this.label.setText('SPIN');
      this.bodyGroup.setScale(1);
      this.startGlowTween();
    }
  }
}
