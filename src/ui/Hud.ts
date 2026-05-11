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
  private readonly panelCenters: Record<string, { x: number; y: number }> = {};
  private readonly panelContainers: Record<string, Phaser.GameObjects.Container> = {};
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

  /** Return the world center of a HUD panel (used as coin-burst target). */
  panelCenter(label: string): { x: number; y: number } | null {
    return this.panelCenters[label] ?? null;
  }

  /** Briefly scale the panel container 1.0 → 1.1 → 1.0 + add a gold flash overlay. */
  pulsePanel(label: string): void {
    const wrap = this.panelContainers[label];
    if (!wrap) return;
    wrap.scene.tweens.add({
      targets: wrap,
      scale: { from: 1, to: 1.1 },
      duration: 180,
      yoyo: true,
      ease: 'Sine.InOut',
    });

    const center = this.panelCenters[label];
    if (!center) return;
    const flash = wrap.scene.add.graphics();
    flash.setDepth(160);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.fillStyle(0xffd700, 0.5);
    flash.fillRoundedRect(center.x - PANEL_W / 2, center.y - PANEL_H / 2, PANEL_W, PANEL_H, 8);
    wrap.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 380,
      ease: 'Sine.Out',
      onComplete: () => flash.destroy(),
    });
  }

  private drawPanel(scene: Phaser.Scene, x: number, y: number, spec: PanelSpec): void {
    const cx = x + PANEL_W / 2;
    const cy = y + PANEL_H / 2;
    const wrap = scene.add.container(cx, cy);
    wrap.setDepth(150);

    const g = scene.add.graphics();
    g.fillGradientStyle(0x0a0a18, 0x0a0a18, 0x05050c, 0x05050c, 1);
    g.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 8);
    g.lineStyle(2, 0xffd700, 1);
    g.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 8);
    g.lineStyle(1, 0xffd700, 0.3);
    g.strokeRoundedRect(-PANEL_W / 2 + 3, -PANEL_H / 2 + 3, PANEL_W - 6, PANEL_H - 6, 6);
    g.fillStyle(0x000000, 0.45);
    g.fillRect(-PANEL_W / 2 + 4, -PANEL_H / 2 + 4, PANEL_W - 8, 4);
    wrap.add(g);

    const labelText = scene.add
      .text(0, -PANEL_H / 2 + 6, spec.label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5, 0);
    wrap.add(labelText);

    const val = scene.add
      .text(0, PANEL_H / 2 - 6, spec.value, {
        fontFamily: '"Courier New", "Menlo", monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: spec.valueColor,
      })
      .setOrigin(0.5, 1);
    val.setShadow(0, 0, spec.valueColor, 6, false, true);
    wrap.add(val);

    this.values[spec.label] = val;
    this.tweenTargets[spec.label] = { v: Number(spec.value) || 0 };
    this.panelCenters[spec.label] = { x: cx, y: cy };
    this.panelContainers[spec.label] = wrap;

    const scan = scene.add.graphics();
    const ledTop = -PANEL_H / 2 + 22;
    const ledH = PANEL_H - 26;
    scan.fillStyle(0x000000, 0.18);
    for (let yy = ledTop; yy < ledTop + ledH; yy += 3) {
      scan.fillRect(-PANEL_W / 2 + 6, yy, PANEL_W - 12, 1);
    }
    wrap.add(scan);
  }
}
