# Dragon Lanterns — slot demo

A 5×3 video slot client built with **PixiJS v8 + TypeScript + Vite + GSAP**. Portfolio project, work in progress.

## Run

```bash
npm install
npm run dev       # dev server
npm run build     # type check + production build to dist/
npm run assets    # rebuild public/assets/ from art-src/ (symbol atlas + single images)
```

Requires Node.js 24.

## How it works

```
main.ts ─► Engine (Application, Assets, Navigation)
        ─► LoadScreen: logo + progress bar while the "game" bundle loads
        ─► GameScreen: background, reels, input
                 │
     pointertap  ▼
           GameController ─► RgsClient.spin(bet) ─► MockRgs (grid, line wins, balance)
                 │
                 ├─► GameModel (balance, bet, state) ── events ──► UI
                 └─► ReelsView.setGrid(grid)
```

- **Screens** instead of scenes: PixiJS has no scene system, so `engine/Navigation` loads each screen's asset bundles, swaps screens and forwards `resize`/`update`.
- **Logic is Pixi-free:** `game/` (model, controller) and `server/` (RGS contract and mock) don't import `pixi.js`.
- **Server is the source of truth:** the client deducts the bet immediately, then takes the final balance from the spin response.
- **Configs by owner:** game math lives on the server side (`server/math.ts`); the client keeps only the grid shape, layout and reel timing. Timing presets (normal / turbo) are injected into the reels, so turbo is just another preset — press `T` to toggle.
- **Layout:** 1920×1080 design resolution; the background covers the window, the game content is fitted inside it (contain).

## Project structure

```
src/
  main.ts      bootstrap
  engine/      Engine, Navigation, Screen interface, layout helpers
  config/      game shape (grid, symbol ids), layout, reel timing presets, asset manifest
  server/      RgsClient interface, game math (server-only), MockRgs
  game/        GameModel, GameController
  screens/     LoadScreen, GameScreen
  views/       ReelsView, Reel, SymbolTextures
art-src/       source art
scripts/       asset build script
```

## Roadmap

- [x] Asset loading with bundles and a symbol atlas, loading screen
- [x] Screen navigation, game model, controller, mock RGS
- [x] Reel spin animation: mask, ticker-driven strip, staggered stop on the server grid with bounce (GSAP), quick stop, turbo preset
- [ ] Spin button, balance/win panel, win lines and highlights
- [ ] Spine animations, sound
- [ ] Responsive layout (portrait/landscape)

## Credits

Art was generated for this project with OpenAI ImageGen; see [art-src/LICENSE.md](art-src/LICENSE.md).
