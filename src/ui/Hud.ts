import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

const PANEL_W = 180;
const PANEL_H = 56;
const PANEL_GAP = 24;

interface PanelSpec {
  label: string;
  value: string;
  valueColor: string;
}

export class Hud {
  constructor(scene: Phaser.Scene, topY: number) {
    const panels: PanelSpec[] = [
      { label: 'CREDIT', value: '1000', valueColor: '#4be84b' },
      { label: 'BET', value: '1', valueColor: '#4be84b' },
      { label: 'WIN', value: '0', valueColor: '#ffd700' },
    ];

    const totalW = PANEL_W * 3 + PANEL_GAP * 2;
    const startX = (GAME_WIDTH - totalW) / 2;

    for (let i = 0; i < panels.length; i++) {
      const px = startX + i * (PANEL_W + PANEL_GAP);
      this.drawPanel(scene, px, topY, panels[i]);
      if (panels[i].label === 'BET') {
        this.drawBetButtons(scene, px, topY);
      }
    }
  }

  private drawPanel(scene: Phaser.Scene, x: number, y: number, spec: PanelSpec): void {
    const g = scene.add.graphics();
    g.setDepth(150);
    // Body
    g.fillGradientStyle(0x0a0a18, 0x0a0a18, 0x05050c, 0x05050c, 1);
    g.fillRoundedRect(x, y, PANEL_W, PANEL_H, 8);
    // Gold border
    g.lineStyle(2, 0xffd700, 1);
    g.strokeRoundedRect(x, y, PANEL_W, PANEL_H, 8);
    // Inner inset highlight
    g.lineStyle(1, 0xffd700, 0.3);
    g.strokeRoundedRect(x + 3, y + 3, PANEL_W - 6, PANEL_H - 6, 6);

    scene.add
      .text(x + PANEL_W / 2, y + 6, spec.label, {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5, 0)
      .setDepth(151);

    const val = scene.add
      .text(x + PANEL_W / 2, y + PANEL_H - 6, spec.value, {
        fontFamily: '"Courier New", "Menlo", monospace',
        fontSize: '26px',
        fontStyle: 'bold',
        color: spec.valueColor,
      })
      .setOrigin(0.5, 1)
      .setDepth(151);
    val.setShadow(0, 0, spec.valueColor, 6, false, true);
  }

  private drawBetButtons(scene: Phaser.Scene, panelX: number, panelY: number): void {
    const btnR = 16;
    const cy = panelY + PANEL_H / 2;
    const drawBetBtn = (cx: number, glyph: string) => {
      const g = scene.add.graphics();
      g.setDepth(151);
      g.fillStyle(0x1a1a2e, 1);
      g.fillCircle(cx, cy, btnR);
      g.lineStyle(2, 0xffd700, 1);
      g.strokeCircle(cx, cy, btnR);
      scene.add
        .text(cx, cy, glyph, {
          fontFamily: '"Arial Black", Arial, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#ffd700',
        })
        .setOrigin(0.5)
        .setDepth(152);
    };
    drawBetBtn(panelX - btnR - 6, '−');
    drawBetBtn(panelX + PANEL_W + btnR + 6, '+');
  }
}
