import Phaser from 'phaser';
import type { PaylineDef } from '../data/paylines';
import type { WinLine } from '../systems/PaylineEvaluator';

interface Geometry {
  readonly blockX: number;
  readonly blockY: number;
  readonly symbolSize: number;
  readonly reelGap: number;
  readonly numReels: number;
}

/**
 * Overlay that renders payline previews (faint dotted) when the active line
 * count changes, and highlights winning paylines (solid + cell glow) when
 * win results come in.
 *
 * Renders in its own depth band above the reels and below the HUD.
 */
export class PaylinePanel {
  private readonly previewG: Phaser.GameObjects.Graphics;
  private readonly winG: Phaser.GameObjects.Graphics;
  private readonly winGlows: Phaser.GameObjects.Graphics[] = [];
  private readonly cellGlows: Phaser.GameObjects.Graphics[] = [];
  private cycleTimer?: Phaser.Time.TimerEvent;
  private flashTween?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly geometry: Geometry,
    private readonly paylines: PaylineDef[],
  ) {
    this.previewG = scene.add.graphics();
    this.previewG.setDepth(125);
    this.previewG.setBlendMode(Phaser.BlendModes.NORMAL);
    this.winG = scene.add.graphics();
    this.winG.setDepth(135);
    this.winG.setBlendMode(Phaser.BlendModes.ADD);
  }

  private colCenterX(col: number): number {
    const { blockX, symbolSize, reelGap } = this.geometry;
    return blockX + col * (symbolSize + reelGap) + symbolSize / 2;
  }

  private rowCenterY(row: number): number {
    const { blockY, symbolSize } = this.geometry;
    return blockY + row * symbolSize + symbolSize / 2;
  }

  /** Faint dotted preview of the first `activeLineCount` paylines. */
  public showPreview(activeLineCount: number): void {
    this.previewG.clear();
    const limit = Math.min(activeLineCount, this.paylines.length);
    for (let i = 0; i < limit; i++) this.drawPreviewLine(this.paylines[i]);
  }

  public clearPreview(): void {
    this.previewG.clear();
  }

  private drawPreviewLine(line: PaylineDef): void {
    const pts: Array<[number, number]> = [];
    for (let col = 0; col < this.geometry.numReels; col++) {
      pts.push([this.colCenterX(col), this.rowCenterY(line.cells[col])]);
    }
    const g = this.previewG;
    g.lineStyle(2, line.color, 0.28);
    // Dashed segments.
    const dashLen = 8;
    const gapLen = 6;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      let t = 0;
      while (t < len) {
        const t2 = Math.min(t + dashLen, len);
        g.beginPath();
        g.moveTo(x1 + ux * t, y1 + uy * t);
        g.lineTo(x1 + ux * t2, y1 + uy * t2);
        g.strokePath();
        t = t2 + gapLen;
      }
    }
    // Small endpoint markers.
    for (const [px, py] of pts) {
      g.fillStyle(line.color, 0.45);
      g.fillCircle(px, py, 2.5);
    }
  }

  /** Render the full set of winning lines + cycle highlight. */
  public showWins(wins: WinLine[], onCycleTick?: (win: WinLine) => void): void {
    this.clearWins();
    if (wins.length === 0) return;
    this.drawAllWinsDim(wins);
    this.startCycle(wins, onCycleTick);
  }

  public clearWins(): void {
    this.cycleTimer?.remove();
    this.cycleTimer = undefined;
    this.flashTween?.stop();
    this.flashTween = undefined;
    this.winG.clear();
    for (const gx of this.winGlows) gx.destroy();
    this.winGlows.length = 0;
    for (const gx of this.cellGlows) gx.destroy();
    this.cellGlows.length = 0;
  }

  private drawAllWinsDim(wins: WinLine[]): void {
    for (const w of wins) {
      const g = this.scene.add.graphics();
      g.setDepth(134);
      g.setBlendMode(Phaser.BlendModes.ADD);
      const line = this.paylines[w.paylineIndex];
      g.lineStyle(3, w.color, 0.35);
      g.beginPath();
      for (let col = 0; col < this.geometry.numReels; col++) {
        const x = this.colCenterX(col);
        const y = this.rowCenterY(line.cells[col]);
        if (col === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
      this.winGlows.push(g);
    }
  }

  private startCycle(wins: WinLine[], onCycleTick?: (win: WinLine) => void): void {
    let idx = 0;
    const showOne = (i: number) => {
      this.highlightWin(wins[i]);
      onCycleTick?.(wins[i]);
    };
    showOne(idx);
    if (wins.length === 1) return;
    this.cycleTimer = this.scene.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        idx = (idx + 1) % wins.length;
        showOne(idx);
      },
    });
  }

  private highlightWin(win: WinLine): void {
    this.winG.clear();
    for (const gx of this.cellGlows) gx.destroy();
    this.cellGlows.length = 0;
    const line = this.paylines[win.paylineIndex];

    // Thick colored polyline along all 5 columns of the payline.
    this.winG.lineStyle(5, win.color, 1);
    this.winG.beginPath();
    for (let col = 0; col < this.geometry.numReels; col++) {
      const x = this.colCenterX(col);
      const y = this.rowCenterY(line.cells[col]);
      if (col === 0) this.winG.moveTo(x, y);
      else this.winG.lineTo(x, y);
    }
    this.winG.strokePath();

    // Cell glow rings on each matching [col,row].
    const { symbolSize } = this.geometry;
    for (const [col, row] of win.cells) {
      const cx = this.colCenterX(col);
      const cy = this.rowCenterY(row);
      const ring = this.scene.add.graphics();
      ring.setDepth(136);
      ring.setBlendMode(Phaser.BlendModes.ADD);
      ring.lineStyle(4, win.color, 1);
      ring.strokeRoundedRect(
        cx - symbolSize / 2 + 4,
        cy - symbolSize / 2 + 4,
        symbolSize - 8,
        symbolSize - 8,
        10,
      );
      ring.fillStyle(win.color, 0.18);
      ring.fillRoundedRect(
        cx - symbolSize / 2 + 4,
        cy - symbolSize / 2 + 4,
        symbolSize - 8,
        symbolSize - 8,
        10,
      );
      this.cellGlows.push(ring);
    }

    // Pulse the active line + rings.
    const targets: Phaser.GameObjects.GameObject[] = [this.winG, ...this.cellGlows];
    this.flashTween?.stop();
    this.flashTween = this.scene.tweens.add({
      targets,
      alpha: { from: 1, to: 0.45 },
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
}
