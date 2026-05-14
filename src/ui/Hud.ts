import Phaser from 'phaser';

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

export interface HudLayout {
  centerX: number;
  topY: number;
  panelW: number;
  panelH: number;
  gap: number;
  labelFontPx?: number;
  valueFontPx?: number;
  /** Subset of labels to render. Defaults to all 5. */
  panels?: string[];
  /** Stacking direction. Default 'horizontal'. */
  direction?: 'horizontal' | 'vertical';
  /** Visual variant. 'led' = Vegas cabinet LED display (recessed gold bezel). */
  style?: 'standard' | 'led';
}

export class Hud {
  public readonly values: Record<string, Phaser.GameObjects.Text> = {};
  private readonly panelCenters: Record<string, { x: number; y: number }> = {};
  private readonly panelContainers: Record<string, Phaser.GameObjects.Container> = {};
  private readonly tweenTargets: Record<string, { v: number }> = {};
  private activeTweens: Record<string, Phaser.Tweens.Tween | undefined> = {};
  private readonly specs: PanelSpec[];
  private readonly panelW: number;
  private readonly panelH: number;
  private readonly style: 'standard' | 'led';

  constructor(scene: Phaser.Scene, layout: HudLayout) {
    const allSpecs: PanelSpec[] = [
      { label: 'CREDIT',    value: '1000', valueColor: '#4be84b' },
      { label: 'BET',       value: '1',    valueColor: '#4be84b' },
      { label: 'LINES',     value: '1',    valueColor: '#4be84b' },
      { label: 'TOTAL BET', value: '1',    valueColor: '#ffae3a' },
      { label: 'WIN',       value: '0',    valueColor: '#ffd700' },
    ];
    this.specs = layout.panels
      ? allSpecs.filter((s) => layout.panels!.includes(s.label))
      : allSpecs;
    this.panelW = layout.panelW;
    this.panelH = layout.panelH;
    this.style = layout.style ?? 'standard';

    const labelPx = layout.labelFontPx ?? Math.max(9, Math.round(this.panelW * 0.085));
    const valuePx = layout.valueFontPx ?? Math.max(14, Math.round(this.panelW * 0.16));

    if (layout.direction === 'vertical') {
      const px = layout.centerX - this.panelW / 2;
      for (let i = 0; i < this.specs.length; i++) {
        const py = layout.topY + i * (this.panelH + layout.gap);
        if (this.style === 'led') this.drawLedPanel(scene, px, py, this.specs[i], labelPx, valuePx);
        else this.drawPanel(scene, px, py, this.specs[i], labelPx, valuePx);
      }
    } else {
      const totalW = this.panelW * this.specs.length + layout.gap * (this.specs.length - 1);
      const startX = layout.centerX - totalW / 2;
      for (let i = 0; i < this.specs.length; i++) {
        const px = startX + i * (this.panelW + layout.gap);
        if (this.style === 'led') this.drawLedPanel(scene, px, layout.topY, this.specs[i], labelPx, valuePx);
        else this.drawPanel(scene, px, layout.topY, this.specs[i], labelPx, valuePx);
      }
    }
  }

  setValue(label: string, n: number): void {
    const t = this.values[label];
    if (!t) return;
    t.setText(String(Math.max(0, Math.floor(n))));
    this.tweenTargets[label] = { v: n };
    this.activeTweens[label]?.stop();
    this.activeTweens[label] = undefined;
  }

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

  flashError(label: string): void {
    const val = this.values[label];
    if (!val) return;
    const origColor = val.style.color as string;
    val.setColor('#ff4455');
    val.scene.time.delayedCall(500, () => val.setColor(origColor));
  }

  panelCenter(label: string): { x: number; y: number } | null {
    return this.panelCenters[label] ?? null;
  }

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
    flash.fillRoundedRect(center.x - this.panelW / 2, center.y - this.panelH / 2, this.panelW, this.panelH, 8);
    wrap.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 380,
      ease: 'Sine.Out',
      onComplete: () => flash.destroy(),
    });
  }

  private drawLedPanel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    spec: PanelSpec,
    labelPx: number,
    valuePx: number,
  ): void {
    const cx = x + this.panelW / 2;
    const cy = y + this.panelH / 2;
    const wrap = scene.add.container(cx, cy);
    wrap.setDepth(150);

    const w = this.panelW;
    const h = this.panelH;
    const r = 8;

    // Outer brushed-gold bezel — raised cabinet plate.
    const bezel = scene.add.graphics();
    bezel.fillGradientStyle(0xfff4b3, 0xfff4b3, 0x8a6914, 0x8a6914, 1);
    bezel.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bezel.lineStyle(1, 0x4a3206, 0.9);
    bezel.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    wrap.add(bezel);

    // Inner recessed display pocket.
    const pocketInset = 4;
    const pw = w - pocketInset * 2;
    const ph = h - pocketInset * 2;
    const pr = r - 2;

    const pocket = scene.add.graphics();
    pocket.fillGradientStyle(0x000005, 0x000005, 0x0a0a1a, 0x0a0a1a, 1);
    pocket.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, pr);
    // Inner pocket frame line for crispness.
    pocket.lineStyle(1, 0x000000, 0.85);
    pocket.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, pr);
    // Top inner shadow — sells the recessed feel.
    pocket.fillStyle(0x000000, 0.55);
    pocket.fillRoundedRect(-pw / 2 + 1, -ph / 2 + 1, pw - 2, 4, { tl: pr - 1, tr: pr - 1, bl: 0, br: 0 });
    // Bottom inner highlight.
    pocket.fillStyle(0xffffff, 0.05);
    pocket.fillRect(-pw / 2 + 4, ph / 2 - 2, pw - 8, 1);
    wrap.add(pocket);

    // Bezel top specular highlight (one-pixel glint along top edge).
    const glint = scene.add.graphics();
    glint.fillStyle(0xffffff, 0.55);
    glint.fillRect(-w / 2 + 6, -h / 2 + 1, w - 12, 1);
    wrap.add(glint);

    // Corner rivets.
    const rv = scene.add.graphics();
    const rivetR = 1.6;
    const offset = 4;
    rv.fillStyle(0x4a3206, 1);
    rv.fillCircle(-w / 2 + offset, -h / 2 + offset, rivetR);
    rv.fillCircle(w / 2 - offset, -h / 2 + offset, rivetR);
    rv.fillCircle(-w / 2 + offset, h / 2 - offset, rivetR);
    rv.fillCircle(w / 2 - offset, h / 2 - offset, rivetR);
    rv.fillStyle(0xffe98a, 0.7);
    rv.fillCircle(-w / 2 + offset - 0.4, -h / 2 + offset - 0.4, 0.6);
    rv.fillCircle(w / 2 - offset - 0.4, -h / 2 + offset - 0.4, 0.6);
    rv.fillCircle(-w / 2 + offset - 0.4, h / 2 - offset - 0.4, 0.6);
    rv.fillCircle(w / 2 - offset - 0.4, h / 2 - offset - 0.4, 0.6);
    wrap.add(rv);

    // Label — small printed plate at the top of the pocket.
    const labelText = scene.add
      .text(0, -ph / 2 + 3, spec.label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: `${labelPx}px`,
        fontStyle: 'bold',
        color: '#ffd24a',
      })
      .setOrigin(0.5, 0);
    labelText.setShadow(0, 1, '#000000', 2, false, true);
    wrap.add(labelText);

    // Value — bright LED with strong glow.
    const val = scene.add
      .text(0, ph / 2 - 3, spec.value, {
        fontFamily: '"Courier New", "Menlo", monospace',
        fontSize: `${valuePx}px`,
        fontStyle: 'bold',
        color: spec.valueColor,
      })
      .setOrigin(0.5, 1);
    val.setShadow(0, 0, spec.valueColor, 12, false, true);
    wrap.add(val);

    // Soft glow halo behind value (additive).
    const halo = scene.add.graphics();
    const haloColor = Phaser.Display.Color.HexStringToColor(spec.valueColor).color;
    halo.fillStyle(haloColor, 0.18);
    halo.fillEllipse(0, ph / 2 - valuePx * 0.55, valuePx * 2.4, valuePx * 1.3);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    wrap.add(halo);
    wrap.bringToTop(val);

    this.values[spec.label] = val;
    this.tweenTargets[spec.label] = { v: Number(spec.value) || 0 };
    this.panelCenters[spec.label] = { x: cx, y: cy };
    this.panelContainers[spec.label] = wrap;

    // Scanlines inside the display pocket for CRT/LED feel.
    const scan = scene.add.graphics();
    scan.fillStyle(0x000000, 0.22);
    const scanTop = -ph / 2 + labelPx + 4;
    for (let yy = scanTop; yy < ph / 2 - 2; yy += 2) {
      scan.fillRect(-pw / 2 + 3, yy, pw - 6, 1);
    }
    wrap.add(scan);
    wrap.bringToTop(val);
  }

  private drawPanel(
    scene: Phaser.Scene,
    x: number,
    y: number,
    spec: PanelSpec,
    labelPx: number,
    valuePx: number,
  ): void {
    const cx = x + this.panelW / 2;
    const cy = y + this.panelH / 2;
    const wrap = scene.add.container(cx, cy);
    wrap.setDepth(150);

    const g = scene.add.graphics();
    g.fillGradientStyle(0x0a0a18, 0x0a0a18, 0x05050c, 0x05050c, 1);
    g.fillRoundedRect(-this.panelW / 2, -this.panelH / 2, this.panelW, this.panelH, 8);
    g.lineStyle(2, 0xffd700, 1);
    g.strokeRoundedRect(-this.panelW / 2, -this.panelH / 2, this.panelW, this.panelH, 8);
    g.lineStyle(1, 0xffd700, 0.3);
    g.strokeRoundedRect(-this.panelW / 2 + 3, -this.panelH / 2 + 3, this.panelW - 6, this.panelH - 6, 6);
    g.fillStyle(0x000000, 0.45);
    g.fillRect(-this.panelW / 2 + 4, -this.panelH / 2 + 4, this.panelW - 8, 4);
    wrap.add(g);

    const labelText = scene.add
      .text(0, -this.panelH / 2 + 5, spec.label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: `${labelPx}px`,
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5, 0);
    wrap.add(labelText);

    const val = scene.add
      .text(0, this.panelH / 2 - 5, spec.value, {
        fontFamily: '"Courier New", "Menlo", monospace',
        fontSize: `${valuePx}px`,
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
    const ledTop = -this.panelH / 2 + labelPx + 8;
    const ledH = this.panelH - (labelPx + 12);
    scan.fillStyle(0x000000, 0.18);
    for (let yy = ledTop; yy < ledTop + ledH; yy += 3) {
      scan.fillRect(-this.panelW / 2 + 6, yy, this.panelW - 12, 1);
    }
    wrap.add(scan);
  }
}
