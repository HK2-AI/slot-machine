# Slot Machine 🎰

一個用 Phaser 3 + Vite + TypeScript 砌嘅 slot machine 遊戲。延續 `big-two-game` 嘅 playbook — 同樣嘅技術棧、目錄結構、retina 處理同 Coolify 部署流程。

A browser-based slot machine game built with Phaser 3 + Vite + TypeScript. Follows the same playbook as the `big-two-game` project (tech stack, folder structure, retina handling, Coolify deploy).

---

## Tech Stack

| 類別 | 選用 | 備註 |
|---|---|---|
| 引擎 | **Phaser 3.90** | Canvas / WebGL 2D |
| 語言 | **TypeScript 6** | `strict: true`；`noEmit` + Vite bundle |
| Bundler | **Vite 8** | `base: './'` for portable static hosting |
| Package manager | **pnpm 9** | — |
| 部署 | **Coolify** (Docker + nginx) | static dist served by nginx |

---

## Project Structure

```
slot-machine/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile             # nginx static serve, multi-stage
├── nginx.conf
├── public/                # static assets served as-is
│   ├── symbols/
│   ├── ui/
│   ├── sfx/
│   └── bgm/
└── src/
    ├── main.ts            # Phaser 啟動 + text resolution override
    ├── config.ts          # game config (1280×720, FIT, retina-aware text)
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── PreloadScene.ts
    │   ├── MainScene.ts
    │   └── PaytableScene.ts
    ├── systems/           # pure logic (no Phaser dep)
    │   ├── RNG.ts
    │   ├── ReelStrip.ts
    │   ├── PayoutCalculator.ts
    │   ├── AudioManager.ts
    │   └── Balance.ts
    ├── ui/                # sprite/container 渲染
    ├── data/              # symbol / paytable JSON
    └── types/             # shared TS types
```

---

## Dev Commands

```bash
pnpm install
pnpm dev          # vite dev server on http://localhost:3000
pnpm build        # tsc typecheck + vite build → dist/
pnpm preview      # serve built dist/ locally
pnpm typecheck    # tsc --noEmit only
```

---

## Deploy

Static `dist/` served by nginx in a multi-stage Docker image. Target deploy on Coolify at `slot.eggtart.io` (TBD — domain + Coolify app not yet provisioned).

---

## Status

**P0 scaffold** — initial project skeleton only. MainScene currently shows a title screen. Reel spinning, RNG, paylines, payouts, art, and audio all come in later phases.
