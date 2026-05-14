import Phaser from 'phaser';
import { makeButton } from './containerInput';
import { audio } from '../systems/AudioManager';

interface StepperOptions {
  label: string;
  values: readonly number[];
  initial: number;
  width?: number;
  height?: number;
  valueColor?: string;
  /** When true, renders a small MAX pill that jumps to the highest value. */
  withMaxButton?: boolean;
  onChange: (value: number) => void;
}

/**
 * Generic LED-panel stepper with [−] [value] [+] buttons.
 * Used for BET and LINES controls. Click −/+ cycles through `values`.
 */
export class Stepper extends Phaser.GameObjects.Container {
  private valueText!: Phaser.GameObjects.Text;
  private idx: number;
  private readonly values: readonly number[];
  private readonly onChange: (value: number) => void;
  private disabled = false;
  private readonly minusBtn: Phaser.GameObjects.Container;
  private readonly plusBtn: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: StepperOptions) {
    super(scene, x, y);
    this.values = opts.values;
    this.onChange = opts.onChange;
    const initialIdx = Math.max(0, opts.values.indexOf(opts.initial));
    this.idx = initialIdx === -1 ? 0 : initialIdx;

    const w = opts.width ?? 150;
    const h = opts.height ?? 50;
    const valueColor = opts.valueColor ?? '#4be84b';

    // Panel body.
    const g = scene.add.graphics();
    g.fillGradientStyle(0x0a0a18, 0x0a0a18, 0x05050c, 0x05050c, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(2, 0xffd700, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.lineStyle(1, 0xffd700, 0.3);
    g.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 6);
    this.add(g);

    // Label sits ABOVE the panel, overlapping the top gold border like a tab.
    const label = scene.add
      .text(0, -h / 2 - 6, opts.label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffd700',
        backgroundColor: '#0a0a18',
        padding: { left: 4, right: 4, top: 1, bottom: 1 },
      })
      .setOrigin(0.5, 0.5);
    this.add(label);

    // Value centered now that the label moved out as a top tab.
    this.valueText = scene.add
      .text(0, 0, String(this.values[this.idx]), {
        fontFamily: '"Courier New", "Menlo", monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: valueColor,
      })
      .setOrigin(0.5, 0.5);
    this.valueText.setShadow(0, 0, valueColor, 6, false, true);
    this.add(this.valueText);

    // Scanlines fill the whole interior now that the label moved outside.
    const scan = scene.add.graphics();
    const ledTop = -h / 2 + 6;
    const ledH = h - 12;
    scan.fillStyle(0x000000, 0.18);
    for (let yy = ledTop; yy < ledTop + ledH; yy += 3) {
      scan.fillRect(-w / 2 + 6, yy, w - 12, 1);
    }
    this.add(scan);

    // Buttons sit INSIDE the panel interior edges (compact layout — no
    // horizontal "ears" sticking out, so steppers pack tighter on the deck).
    const btnR = Math.max(10, Math.min(13, Math.floor(h * 0.38)));
    const btnInset = btnR + 4;
    this.minusBtn = this.makeStepperButton(scene, -w / 2 + btnInset, 0, '−', btnR, () => this.step(-1));
    this.plusBtn = this.makeStepperButton(scene, w / 2 - btnInset, 0, '+', btnR, () => this.step(1));
    this.add(this.minusBtn);
    this.add(this.plusBtn);

    if (opts.withMaxButton) {
      // Tiny tab on the LEFT corner above the panel, away from the value digits.
      const pillH = 14;
      const max = this.makeMaxPill(scene, -w / 2 + 18, -h / 2 - pillH / 2 + 2, pillH);
      this.add(max);
    }

    scene.add.existing(this);
  }

  private makeMaxPill(scene: Phaser.Scene, x: number, y: number, ph: number): Phaser.GameObjects.Container {
    const pw = 32;
    const c = makeButton(scene, x, y, {
      shape: 'rect',
      w: pw,
      h: ph,
      isDisabled: () => this.disabled,
      hoverScale: 1.1,
      pressScale: 0.9,
      onClick: () => {
        audio.play('click');
        this.setToMax();
      },
    });
    c.setSize(pw, ph);
    const g = scene.add.graphics();
    g.fillStyle(0xff4d6d, 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 7);
    g.lineStyle(1, 0xffd700, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 7);
    c.add(g);
    const t = scene.add
      .text(0, 0, 'MAX', {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    c.add(t);
    return c;
  }

  private setToMax(): void {
    const lastIdx = this.values.length - 1;
    if (this.idx === lastIdx) return;
    this.idx = lastIdx;
    this.valueText.setText(String(this.values[this.idx]));
    this.scene.tweens.add({
      targets: this.valueText,
      scale: { from: 1, to: 1.25 },
      duration: 140,
      yoyo: true,
      ease: 'Sine.InOut',
    });
    this.onChange(this.values[this.idx]);
  }

  private makeStepperButton(
    scene: Phaser.Scene,
    bx: number,
    by: number,
    glyph: string,
    r: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const c = makeButton(scene, bx, by, {
      shape: 'circle',
      radius: r,
      isDisabled: () => this.disabled,
      hoverScale: 1.12,
      pressScale: 0.9,
      onClick: () => {
        audio.play('click');
        onClick();
      },
    });
    const g = scene.add.graphics();
    g.fillStyle(0x1a1a2e, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(1.5, 0xffd700, 1);
    g.strokeCircle(0, 0, r);
    c.add(g);
    const t = scene.add
      .text(0, 0, glyph, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: `${Math.round(r * 1.3)}px`,
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5);
    c.add(t);
    return c;
  }

  private step(dir: number): void {
    const next = Phaser.Math.Clamp(this.idx + dir, 0, this.values.length - 1);
    if (next === this.idx) return;
    this.idx = next;
    this.valueText.setText(String(this.values[this.idx]));
    this.scene.tweens.add({
      targets: this.valueText,
      scale: { from: 1, to: 1.18 },
      duration: 110,
      yoyo: true,
      ease: 'Sine.InOut',
    });
    this.onChange(this.values[this.idx]);
  }

  public getValue(): number {
    return this.values[this.idx];
  }

  public setDisabled(d: boolean): void {
    this.disabled = d;
    const alpha = d ? 0.45 : 1;
    this.minusBtn.setAlpha(alpha);
    this.plusBtn.setAlpha(alpha);
  }
}
