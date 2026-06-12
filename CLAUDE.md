# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

No build step. Open `index.html` directly or serve it:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

On Windows: `start index.html`

## Architecture

Three files, no dependencies, no bundler:

- **`index.html`** — DOM structure: `<canvas id="board">` (300×600px), `<canvas id="next-canvas">` (120×120px), HUD elements (`#score`, `#lines`, `#level`), and `#overlay` for pause/game-over states.
- **`style.css`** — Dark/retro theme. Pure cosmetics; no logic.
- **`game.js`** — All game logic (~305 lines, `'use strict'`).

### game.js internals

**State** (module-level `let` vars): `board` (2D array ROWS×COLS), `current`/`next` (piece objects with `{type, shape, x, y}`), `score`, `lines`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`.

**Key constants** to tune gameplay: `COLS=10`, `ROWS=20`, `BLOCK=30` (px), `COLORS` (index 1–7), `PIECES` (index 1–7 as 2D matrices), `LINE_SCORES=[0,100,300,500,800]`.

**Core flow**:
1. `init()` resets all state and starts `requestAnimationFrame(loop)`.
2. `loop(ts)` accumulates delta time; when `dropAccum >= dropInterval`, tries to move `current` down or calls `lockPiece()`.
3. `lockPiece()` → `merge()` (writes piece into board) → `clearLines()` → `spawn()` (promotes `next` to `current`, generates new `next`; game over if new piece immediately collides).
4. `draw()` clears canvas, draws grid, locked board cells, ghost piece (alpha 0.2 via `ghostY()`), and current piece.

**Rotation**: `rotateCW(shape)` transposes + reverses rows. `tryRotate()` tries kicks `[0, -1, 1, -2, 2]` columns.

**Speed formula**: `dropInterval = Math.max(100, 1000 - (level - 1) * 90)` ms. Level increments every 10 lines.

If you change `COLS`, `ROWS`, or `BLOCK`, also update the canvas `width`/`height` attributes in `index.html` (`COLS × BLOCK` and `ROWS × BLOCK`).
