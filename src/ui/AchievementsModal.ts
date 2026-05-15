import Phaser from 'phaser';
import { audio } from '../systems/AudioManager';
import { ACHIEVEMENTS, achievements } from '../systems/Achievements';
import { i18n } from '../systems/I18n';
import { makeButton } from './containerInput';

const DEPTH = 410; // above SettingsModal (400)

/**
 * Scrollable list of all achievements with locked/unlocked state and progress
 * bar. Opens above the SettingsModal — back arrow returns to settings, X
 * closes both.
 */
export class AchievementsModal {
  private container?: Phaser.GameObjects.Container;
  private isOpen = false;

  constructor(private readonly scene: Phaser.Scene, private readonly onBack?: () => void) {}

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const MODAL_W = Math.min(420, W - 24);
    const MODAL_H = Math.min(H - 24, 460);

    const container = this.scene.add.container(0, 0);
    container.setDepth(DEPTH);
    this.container = container;

    // Backdrop — click outside closes only this modal (returns to settings).
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.7);
    backdrop.fillRect(0, 0, W, H);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, W, H),
      Phaser.Geom.Rectangle.Contains,
    );
    backdrop.on('pointerdown', () => {
      audio.play('click');
      this.close();
    });
    container.add(backdrop);

    const mx = (W - MODAL_W) / 2;
    const my = (H - MODAL_H) / 2;

    const panel = this.scene.add.graphics();
    panel.fillGradientStyle(0x141430, 0x141430, 0x07071a, 0x07071a, 1);
    panel.fillRoundedRect(mx, my, MODAL_W, MODAL_H, 14);
    panel.lineStyle(3, 0xffd700, 1);
    panel.strokeRoundedRect(mx, my, MODAL_W, MODAL_H, 14);
    panel.lineStyle(1, 0xffd700, 0.3);
    panel.strokeRoundedRect(mx + 6, my + 6, MODAL_W - 12, MODAL_H - 12, 10);
    panel.setInteractive(
      new Phaser.Geom.Rectangle(mx, my, MODAL_W, MODAL_H),
      Phaser.Geom.Rectangle.Contains,
    );
    panel.on('pointerdown', (
      _p: Phaser.Input.Pointer,
      _lx: number,
      _ly: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
    });
    container.add(panel);

    // Title.
    const title = this.scene.add
      .text(W / 2, my + 22, i18n.t('achievements'), {
        fontFamily: '"Impact", "Arial Black", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffd700',
      })
      .setOrigin(0.5, 0);
    title.setShadow(0, 2, '#000000', 4, false, true);
    container.add(title);

    // Subtitle: "X / Y unlocked"
    const sub = this.scene.add
      .text(W / 2, my + 50, i18n.t('ach-completed', {
        n: achievements.unlockedCount(),
        total: ACHIEVEMENTS.length,
      }), {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '11px',
        color: '#ffe98a',
      })
      .setOrigin(0.5, 0);
    container.add(sub);

    // List area — scroll with mouse wheel + drag.
    const listTop = my + 76;
    const listBottom = my + MODAL_H - 24;
    const listLeft = mx + 18;
    const listRight = mx + MODAL_W - 18;
    const listH = listBottom - listTop;
    const listW = listRight - listLeft;
    const ROW_H = 56;
    const ROW_GAP = 6;

    // A clipping mask so rows scrolled out of view don't bleed past the panel.
    const maskShape = this.scene.make.graphics({ x: 0, y: 0 }, false);
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(listLeft, listTop, listW, listH);
    const mask = maskShape.createGeometryMask();

    const list = this.scene.add.container(0, 0);
    container.add(list);
    list.setMask(mask);

    let cursorY = listTop;
    for (const def of ACHIEVEMENTS) {
      const unlocked = achievements.isUnlocked(def.id);
      const row = this.buildRow(def, unlocked, listLeft, cursorY, listW, ROW_H);
      list.add(row);
      cursorY += ROW_H + ROW_GAP;
    }

    const totalListH = cursorY - listTop;
    const maxOffset = Math.max(0, totalListH - listH);
    let scrollY = 0;

    const applyScroll = () => {
      list.y = -scrollY;
    };

    // Wheel scrolling (desktop + trackpad).
    const wheelHandler = (
      _p: Phaser.Input.Pointer,
      _objs: Phaser.GameObjects.GameObject[],
      _dx: number,
      dy: number,
    ) => {
      if (!this.isOpen) return;
      scrollY = Phaser.Math.Clamp(scrollY + dy * 0.5, 0, maxOffset);
      applyScroll();
    };
    this.scene.input.on('wheel', wheelHandler);

    // Touch drag scrolling.
    const dragZone = this.scene.add.zone(listLeft + listW / 2, listTop + listH / 2, listW, listH);
    dragZone.setOrigin(0.5);
    dragZone.setInteractive({ useHandCursor: false });
    container.add(dragZone);
    let dragStartY = 0;
    let dragStartScroll = 0;
    let dragging = false;
    dragZone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragging = true;
      dragStartY = p.y;
      dragStartScroll = scrollY;
    });
    dragZone.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const dy = p.y - dragStartY;
      scrollY = Phaser.Math.Clamp(dragStartScroll - dy, 0, maxOffset);
      applyScroll();
    });
    dragZone.on('pointerup', () => { dragging = false; });
    dragZone.on('pointerout', () => { dragging = false; });

    // Close (X).
    const closeR = 16;
    const closeC = makeButton(this.scene, mx + MODAL_W - 26, my + 26, {
      shape: 'circle',
      radius: closeR,
      hoverScale: 1.12,
      pressScale: 0.9,
      onClick: () => {
        audio.play('click');
        this.close();
      },
    });
    const closeG = this.scene.add.graphics();
    closeG.fillStyle(0x1a1a2e, 1);
    closeG.fillCircle(0, 0, closeR);
    closeG.lineStyle(2, 0xff6677, 1);
    closeG.strokeCircle(0, 0, closeR);
    closeC.add(closeG);
    const closeT = this.scene.add
      .text(0, 0, '×', {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '22px',
        color: '#ff6677',
      })
      .setOrigin(0.5);
    closeC.add(closeT);
    container.add(closeC);

    // Detach the wheel listener when the modal closes.
    container.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.scene.input.off('wheel', wheelHandler);
      maskShape.destroy();
    });

    container.setAlpha(0);
    this.scene.tweens.add({ targets: container, alpha: 1, duration: 180, ease: 'Sine.Out' });
  }

  private buildRow(
    def: typeof ACHIEVEMENTS[number],
    unlocked: boolean,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Phaser.GameObjects.Container {
    const row = this.scene.add.container(0, 0);

    const bg = this.scene.add.graphics();
    bg.fillStyle(unlocked ? 0x1a3a1a : 0x1a1a2e, 0.9);
    bg.fillRoundedRect(x, y, w, h, 8);
    bg.lineStyle(1.5, unlocked ? 0x4be84b : 0x33334a, unlocked ? 0.95 : 0.6);
    bg.strokeRoundedRect(x, y, w, h, 8);
    row.add(bg);

    const iconColor = unlocked ? '#ffffff' : '#33334a';
    const icon = this.scene.add
      .text(x + 28, y + h / 2, def.icon, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: iconColor,
      })
      .setOrigin(0.5)
      .setAlpha(unlocked ? 1 : 0.45);
    row.add(icon);

    const nameColor = unlocked ? '#ffd700' : '#7a7a96';
    const name = this.scene.add
      .text(x + 56, y + 12, i18n.t(def.nameKey), {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: nameColor,
      })
      .setOrigin(0, 0.5);
    row.add(name);

    const desc = this.scene.add
      .text(x + 56, y + 30, i18n.t(def.descKey), {
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: unlocked ? '#bcbcd6' : '#5a5a72',
      })
      .setOrigin(0, 0.5);
    row.add(desc);

    // Progress bar — bottom strip of the row.
    const cur = Math.min(def.progress(achievements.getStats()), def.target);
    const barX = x + 56;
    const barW = w - 56 - 12;
    const barY = y + h - 12;
    const barH = 5;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x000000, 0.5);
    barBg.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    row.add(barBg);

    const fillW = (cur / def.target) * barW;
    if (fillW > 0) {
      const barFill = this.scene.add.graphics();
      barFill.fillStyle(unlocked ? 0x4be84b : 0xffd700, 0.9);
      barFill.fillRoundedRect(barX, barY, fillW, barH, barH / 2);
      row.add(barFill);
    }

    const progressLabel = this.scene.add
      .text(x + w - 12, y + 12, i18n.t('ach-progress', { n: cur, total: def.target }), {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: unlocked ? '#4be84b' : '#bcbcd6',
      })
      .setOrigin(1, 0.5);
    row.add(progressLabel);

    return row;
  }

  public close(): void {
    if (!this.isOpen || !this.container) return;
    const c = this.container;
    this.isOpen = false;
    this.container = undefined;
    this.scene.tweens.add({
      targets: c,
      alpha: 0,
      duration: 140,
      ease: 'Sine.In',
      onComplete: () => {
        c.destroy();
        this.onBack?.();
      },
    });
  }
}
