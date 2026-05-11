import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

const PANEL_W = 168;
const PANEL_H = 56;
const PANEL_GAP = 16;

interface PanelSpec {
  label: string;
  value: string;
  valueColor: string;
}

export interface HudUpdate {
  credit?: number;
  bet?: number;
  lines?: number;
  totalBet?: number;
  win?: number;
}

export class Hud {
  public readonly values: Record<string, Phaser.GameObjects.Text> = {};
  private readonly tweenTargets: Record<string, { v: number }> = {};
  private activeTweens: Record<string, Phaser.Tweens.Tween | undefined> = {};
  private readonly specs: PanelSpec[];

  constructor(scene: Phaser.Scene, topY: number) {
    this.specs = [
      { label: 'CREDIT',    value: '1000', valueColor: '#4be84b' },
      { label: 'BET',       value: '1',    valueColor: '#4be84b' },
      { label: 'LINES',     value: '1',    valueColor: '#4be84b' },
      { label: 'TOTAL BET', value: '1',    valueColor: '#ffae3a' },
      { label: 'WIN',       value: '0',    valueColor: '#ffd700' },
    ];

    const totalW = PANEL_W * this.specs.length + PANEL_GAP * (this.specs.length - 1);
    const startX = (GAME_WIDTH - totalW) / 2;

    for (let i = 0; i < this.specs.length; i++) {
      const px = startX + i * (PANEL_W + PANEL_GAP);
      this.drawPanel(scene, px, topY, this.specs[i]);
    }
  }

  /** Snap value (no animation). */
  setValue(label: string, n: number): void {
    const t = this.values[label];
    if (!t) return;
    t.setText(String(Math.max(0, Math.floor(n))));
    this.tweenTargets[label] = { v: n };
    this.activeTweens[label]?.stop();
    this.activeTweens[label] = undefined;
  }

  /** Tween value from current to target with count-up effect. */
  countTo(label: string, target: number, durationMs = 800): void {
    const t = this.values[label];
    if (!t) return;
    const state = this.tweenTargets[label] ?? { v: Number(t.text) || 0 };
    this.tweenTargets[label] = state;
    this.activeTweens[label]?.stop();

    const tween = t.scene.tweens.add({
      targets: state,
      v: target,
      duration: durationMs,
      ease: 'Cubic.Out',
      onUpdate: () => {
        t.setText(String(Math.round(state.v)));
      },
      onComplete: () => {
        t.setText(String(Math.round(target)));
        state.v = target;
        this.activeTweens[label] = undefined;
      },
    });
    this.activeTweens[label] = tween;
  }

  /** Briefly pulse the value text for a given label — used when its numeric state changes. */
  pulseValue(label: string): void {
    const val = this.values[label];
    if (!val) return;
    const scene = val.scene;
    scene.tweens.add({
      targets: val,
      scale: { from: 1, to: 1.12 },
      duration: 120,
      yoyo: true,
      ease: 'Sine.InOut',
    });
  }

  /** Flash the panel red briefly — e.g. for insufficient credits. */
  flashError(label: string): void {
    const val = this.values[label];
    if (!val) return;
    const origColor = val.style.color as string;
    val.setColor('#ff4455');
    val.scene.time.delayedCall(500, () => val.setColor(origColor));
  }

  private drawPanel(scene: Phaser.Scene, x: number, y: number, spec: PanelSpec): void {
    const g = scene.add.graphics();
    g.setDepth(150);
    g.fillGradientStyle(0x0a0a18, 0x0a0a18, 0x05050c, 0x05050c, 1);
    g.fillRoundedRect(x, y, PANEL_W, PANEL_H, 8);
    g.lineStyle(2, 0xffd700, 1);
    g.strokeRoundedRect(x, y, PANEL_W, PANEL_H, 8);
    g.lineStyle(1, 0xffd700, 0.3);
    g.strokeRoundedRect(x + 3, y + 3, PANEL_W - 6, PANEL_H - 6, 6);

    g.fillStyle(0x000000, 0.45);
    g.fillRect(x + 4, y + 4, PANEL_W - 8, 4);

    scene.add
      .text(x + PANEL_W / 2, y + 6, spec.label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5, 0)
      .setDepth(151);

    const val = scene.add
      .text(x + PANEL_W / 2, y + PANEL_H - 6, spec.value, {
        fontFamily: '"Courier New", "Menlo", monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: spec.valueColor,
      })
      .setOrigin(0.5, 1)
      .setDepth(151);
    val.setShadow(0, 0, spec.valueColor, 6, false, true);
    this.values[spec.label] = val;
    this.tweenTargets[spec.label] = { v: Number(spec.value) || 0 };

    const scan = scene.add.graphics();
    scan.setDepth(152);
    const ledTop = y + 22;
    const ledH = PANEL_H - 26;
    scan.fillStyle(0x000000, 0.18);
    for (let yy = ledTop; yy < ledTop + ledH; yy += 3) {
      scan.fillRect(x + 6, yy, PANEL_W - 12, 1);
    }
  }
}
