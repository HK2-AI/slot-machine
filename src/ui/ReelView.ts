import Phaser from 'phaser';
import type { ReelStrip } from '../systems/ReelStrip';
import type { RNG } from '../systems/RNG';
import { getSymbol } from '../data/symbols';

const VISIBLE_ROWS = 3;
const PAD_ROWS = 2;
const N_DISPLAY = VISIBLE_ROWS + PAD_ROWS * 2;

interface SymbolCell {
  image: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
}

export class ReelView extends Phaser.GameObjects.Container {
  public readonly strip: ReelStrip;
  public readonly symbolSize: number;
  public readonly visibleRows: number = VISIBLE_ROWS;
  public readonly cellsContainer: Phaser.GameObjects.Container;
  private readonly cells: SymbolCell[] = [];
  private readonly cellStripIndex: number[] = [];
  // Continuous strip-index of the top visible row (integer when aligned).
  private topStripIndex = 0;
  private spinning = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    strip: ReelStrip,
    symbolSize: number,
    _rng: RNG,
  ) {
    super(scene, x, y);
    this.strip = strip;
    this.symbolSize = symbolSize;

    // Cell backgrounds (3 visible).
    const bg = scene.add.graphics();
    const cx = -symbolSize / 2 + 3;
    const cw = symbolSize - 6;
    const ch = symbolSize - 6;
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const cy = i * symbolSize + 3;
      // Vertical gradient fill.
      bg.fillGradientStyle(0x161628, 0x161628, 0x08081a, 0x08081a, 1);
      bg.fillRoundedRect(cx, cy, cw, ch, 8);
      // Amber border.
      bg.lineStyle(1.5, 0x6b5b2a, 1);
      bg.strokeRoundedRect(cx, cy, cw, ch, 8);
      // Top inset highlight.
      bg.lineStyle(1, 0xffd700, 0.4);
      bg.beginPath();
      bg.moveTo(cx + 8, cy + 2);
      bg.lineTo(cx + cw - 8, cy + 2);
      bg.strokePath();
    }
    this.add(bg);

    // Inner shadow gradient on top + bottom of the viewport (inset glass feel).
    const shadow = scene.add.graphics();
    const sx = -symbolSize / 2;
    const sw = symbolSize;
    const sh = symbolSize * VISIBLE_ROWS;
    // Top vignette: dark fading down.
    shadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    shadow.fillRect(sx, 0, sw, Math.floor(sh * 0.22));
    // Bottom vignette: dark fading up.
    shadow.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5);
    shadow.fillRect(sx, sh - Math.floor(sh * 0.22), sw, Math.floor(sh * 0.22));
    // Diagonal glass shine band.
    shadow.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.0, 0.12, 0.0, 0.0);
    shadow.fillRect(sx, Math.floor(sh * 0.18), sw, Math.floor(sh * 0.18));
    shadow.setBlendMode(Phaser.BlendModes.NORMAL);

    // Symbol cells container — sits below the shadow so glass reflection reads on top.
    this.cellsContainer = scene.add.container(0, 0);
    this.add(this.cellsContainer);
    this.add(shadow);

    const fontSize = Math.floor(symbolSize * 0.55);
    const imgSize = Math.floor(symbolSize * 0.82);
    for (let k = 0; k < N_DISPLAY; k++) {
      const img = scene.add
        .image(0, 0, '__MISSING')
        .setOrigin(0.5)
        .setDisplaySize(imgSize, imgSize)
        .setVisible(false);
      const txt = scene.add
        .text(0, 0, '', {
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontSize: `${fontSize}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5);
      txt.setShadow(0, 2, '#000000', 4, false, true);
      this.cellsContainer.add(img);
      this.cellsContainer.add(txt);
      this.cells.push({ image: img, text: txt });
      this.cellStripIndex.push(-1);
    }

    // Geometry mask covers exactly the 3 visible rows in world space.
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(x - symbolSize / 2, y, symbolSize, symbolSize * VISIBLE_ROWS);
    this.setMask(maskGfx.createGeometryMask());

    scene.add.existing(this);
    this.refresh();
  }

  /** Briefly tint the visible cells (used on reel stop). */
  public flashTint(color: number, durationMs: number): void {
    for (const cell of this.cells) {
      if (cell.image.visible) {
        cell.image.setTint(color);
      }
    }
    this.scene.time.delayedCall(durationMs, () => {
      for (const cell of this.cells) {
        cell.image.clearTint();
      }
    });
  }

  private refresh(): void {
    const base = Math.floor(this.topStripIndex);
    const frac = this.topStripIndex - base;
    const n = this.strip.length;

    for (let k = 0; k < N_DISPLAY; k++) {
      const p = k - PAD_ROWS; // visual row offset (-PAD_ROWS .. VISIBLE_ROWS+PAD_ROWS-1)
      const stripIdx = base + p;
      const normIdx = ((stripIdx % n) + n) % n;
      const cell = this.cells[k];

      if (this.cellStripIndex[k] !== normIdx) {
        const def = getSymbol(this.strip.getSymbolAt(stripIdx));
        if (this.scene.textures.exists(def.key)) {
          cell.image.setTexture(def.key);
          cell.image.setDisplaySize(
            Math.floor(this.symbolSize * 0.82),
            Math.floor(this.symbolSize * 0.82),
          );
          cell.image.setVisible(true);
          cell.text.setVisible(false);
        } else {
          cell.image.setVisible(false);
          cell.text.setVisible(true);
          cell.text.setText(def.glyph);
          cell.text.setColor(`#${def.color.toString(16).padStart(6, '0')}`);
        }
        this.cellStripIndex[k] = normIdx;
      }

      const y = p * this.symbolSize + frac * this.symbolSize + this.symbolSize / 2;
      cell.image.setY(y);
      cell.text.setY(y);
    }
  }

  spinTo(targetStopIndex: number, durationMs: number, onComplete: () => void): void {
    if (this.spinning) {
      onComplete();
      return;
    }
    this.spinning = true;

    const n = this.strip.length;
    const startTop = Math.round(this.topStripIndex);
    // Symbols flow downward => topStripIndex decreases.
    let baseDelta = ((startTop - targetStopIndex) % n + n) % n;
    if (baseDelta === 0) baseDelta = n;
    const totalDelta = 3 * n + baseDelta; // ~3 extra full revolutions
    const endTop = startTop - totalDelta;

    const state = { v: 0 };
    this.scene.tweens.add({
      targets: state,
      v: 1,
      duration: durationMs,
      ease: 'Cubic.Out',
      onUpdate: () => {
        this.topStripIndex = startTop + (endTop - startTop) * state.v;
        this.refresh();
      },
      onComplete: () => {
        this.topStripIndex = ((targetStopIndex % n) + n) % n;
        this.refresh();
        this.spinning = false;
        onComplete();
      },
    });
  }
}
