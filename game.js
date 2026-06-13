'use strict';

<<<<<<< HEAD
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

=======
// COLS / ROWS / BLOCK están definidos en pieces.js (cargado antes).
>>>>>>> a2282a7 (feat: nuevos cambios agregados)
const LINE_SCORES = [0, 100, 300, 500, 800];

// ── DOM ───────────────────────────────────────────────────────────────────────
const canvas       = document.getElementById('board');
const ctx          = canvas.getContext('2d');
const nextCanvas   = document.getElementById('next-canvas');
const nextCtx      = nextCanvas.getContext('2d');
const holdCanvas   = document.getElementById('hold-canvas');
const holdCtx      = holdCanvas.getContext('2d');
const scoreEl      = document.getElementById('score');
const linesEl      = document.getElementById('lines');
const levelEl      = document.getElementById('level');
const overlay      = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn   = document.getElementById('restart-btn');

// ── Estado del juego ──────────────────────────────────────────────────────────
let board, current, nextQueue, score, lines, level;
let paused, gameOver, lastTime, dropAccum, dropInterval, animId;

// Para hold (hold.js)
let hold = null;
let holdUsed = false;

// Para combos (combos.js)
let combo = -1;
let b2b = false;
let lastMoveRotate = false;

// Para snapshot / undo (abilities.js)
let boardSnapshot = null;
let currentSnapshot = null;

// Para freeze (powerups.js)
let freezeUntil = 0;

// Para energía (abilities.js)
let energy = 0;

// Para modo desafío (challenges.js)
let challengeMode = null;

// ── Tablero ───────────────────────────────────────────────────────────────────
function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

// ── Colisión ──────────────────────────────────────────────────────────────────
function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c, ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

// ── Rotación ──────────────────────────────────────────────────────────────────
function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function rotateCCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[cols - 1 - c][r] = shape[r][c];
  return result;
}

function tryRotate(ccw) {
  const rotated = ccw ? rotateCCW(current.shape) : rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2, -3, 3];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastMoveRotate = true;
      return;
    }
  }
}

// ── Merge ─────────────────────────────────────────────────────────────────────
function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

// ── Clear lines — devuelve nº de líneas limpiadas ─────────────────────────────
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

// ── Ghost ─────────────────────────────────────────────────────────────────────
function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

// ── Hard / soft drop ──────────────────────────────────────────────────────────
function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

// ── Lock piece ────────────────────────────────────────────────────────────────
function lockPiece() {
  // Snapshot para undo (antes de merge)
  boardSnapshot   = board.map(row => [...row]);
  currentSnapshot = { type: current.type, shape: current.shape.map(r => [...r]),
                      x: current.x, y: current.y };

  // Power-up: si la pieza actual tiene un efecto especial, se dispara aquí
  if (typeof onLockPowerup === 'function') {
    const isPower = onLockPowerup(current);
    if (isPower) {
      sfx('powerup');
      // clearLines ya lo llama onLockPowerup internamente si aplica
      spawn();
      return;
    }
  }

  merge();

  const cleared = clearLines();

  if (cleared > 0) {
    // Flash visual por línea (effects.js)
    if (typeof flashLines === 'function') flashLines(cleared);
    sfx(cleared >= 4 ? 'tetris' : 'clear');
  } else {
    sfx('lock');
  }

  // Puntuación y combos (combos.js)
  if (typeof scoreClear === 'function') {
    scoreClear(cleared);
  } else {
    // Fallback básico si combos.js no está cargado
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level  = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  // Energía (abilities.js)
  if (cleared > 0 && typeof addEnergy === 'function') addEnergy(cleared);

  // Modo desafío hook
  if (challengeMode && typeof challengeMode.onLock === 'function')
    challengeMode.onLock(cleared);
  if (challengeMode && typeof challengeMode.checkWin === 'function')
    if (challengeMode.checkWin()) return;

  updateHUD();
  spawn();
}

// ── Spawn ─────────────────────────────────────────────────────────────────────
function spawn() {
  current = nextQueue.shift();
  nextQueue.push(randomPiece());
  holdUsed = false;
  lastMoveRotate = false;

  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  // Inyectar power-up si corresponde (powerups.js)
  if (typeof checkInjectPowerup === 'function') checkInjectPowerup();
  drawNext();
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  if (typeof drawEnergyBar === 'function') drawEnergyBar();
  if (challengeMode && typeof challengeMode.updateHUD === 'function')
    challengeMode.updateHUD();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;

  // Wild card (comodín dye) → arcoíris
  const isWild = colorIndex === 99;
  // Power-up cells (51-55) tienen su propio color
  const isPower = colorIndex >= 51 && colorIndex <= 55;
  let color;
  if (isWild) {
    color = `hsl(${(x * 37 + y * 59) % 360},80%,65%)`;
  } else if (isPower) {
    const pKeys = ['bomb','ray','dye','gravity','freeze'];
    color = typeof POWER_COLORS !== 'undefined'
      ? POWER_COLORS[pKeys[colorIndex - 51]] || '#ff80ab'
      : '#ff80ab';
  } else {
    color = COLORS[colorIndex];
  }
  if (!color) return;

  context.globalAlpha = alpha ?? 1;
  context.fillStyle   = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);

  // Glifo de power-up (powerups.js)
  if (typeof drawPowerGlyph === 'function') drawPowerGlyph(context, x, y, colorIndex, size);

  context.globalAlpha = 1;
}

function drawGrid() {
<<<<<<< HEAD
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  ctx.lineWidth = 0.5;
=======
  ctx.strokeStyle = '#22222e';
  ctx.lineWidth   = 0.5;
>>>>>>> a2282a7 (feat: nuevos cambios agregados)
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, ROWS * BLOCK); ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(COLS * BLOCK, r * BLOCK); ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Tablero (oculto en modo invisible)
  if (!window._invisibleMode) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, c, r, board[r][c], BLOCK);
  }

  // Ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // Pieza invisible (modo desafío)
  const hideActive = challengeMode && challengeMode.hideActive;

  if (!hideActive) {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }

  // Partículas / textos flotantes (effects.js)
  if (typeof drawEffects === 'function') drawEffects(ctx);

  // Overlay freeze (powerups.js)
  if (typeof drawFreezeOverlay === 'function') drawFreezeOverlay(ctx);
}

function drawNext() {
  const NB = 24;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  // Mostrar hasta 5 piezas en la cola
  const count = Math.min(nextQueue.length, 5);
  for (let i = 0; i < count; i++) {
    const shape  = nextQueue[i].shape;
    const offX   = Math.floor((4 - shape[0].length) / 2);
    const startY = i * (NB * 3 + 4);
    const offY   = Math.floor((3 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) {
          nextCtx.fillStyle = COLORS[shape[r][c]] || '#888';
          nextCtx.fillRect((offX + c) * NB + 1, startY + (offY + r) * NB + 1, NB - 2, NB - 2);
          nextCtx.fillStyle = 'rgba(255,255,255,0.12)';
          nextCtx.fillRect((offX + c) * NB + 1, startY + (offY + r) * NB + 1, NB - 2, 3);
        }
  }
}

// ── Hold draw (hold.js puede sobreescribir) ───────────────────────────────────
function drawHold() {
  const NB = 24;
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (!hold) return;
  const alpha = holdUsed ? 0.35 : 1;
  const shape = PIECES[hold.type].map(row => [...row]);
  const offX  = Math.floor((4 - shape[0].length) / 2);
  const offY  = Math.floor((3 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) {
        holdCtx.globalAlpha = alpha;
        holdCtx.fillStyle   = COLORS[shape[r][c]] || '#888';
        holdCtx.fillRect((offX + c) * NB + 1, (offY + r) * NB + 1, NB - 2, NB - 2);
        holdCtx.fillStyle = 'rgba(255,255,255,0.12)';
        holdCtx.fillRect((offX + c) * NB + 1, (offY + r) * NB + 1, NB - 2, 3);
        holdCtx.globalAlpha = 1;
      }
}

// ── Game over / pause ─────────────────────────────────────────────────────────
function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  sfx('gameover');
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
    overlay.classList.add('hidden');
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────────
function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;

  // Actualizar partículas (effects.js)
  if (typeof updateEffects === 'function') updateEffects(dt);

  // Tick de modo desafío
  if (challengeMode && typeof challengeMode.tick === 'function')
    challengeMode.tick(dt);

  // Freeze: no acumular caída mientras esté congelado
  const frozen = (typeof freezeUntil !== 'undefined') && ts < freezeUntil;
  if (!frozen) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        lastMoveRotate = false;
      } else {
        lockPiece();
        if (gameOver) return;
      }
    }
  }

  draw();
  drawHold();
  animId = requestAnimationFrame(loop);
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init(mode) {
  board         = createBoard();
  score         = 0;
  lines         = 0;
  level         = 1;
  paused        = false;
  gameOver      = false;
  dropInterval  = 1000;
  dropAccum     = 0;
  lastTime      = performance.now();
  hold          = null;
  holdUsed      = false;
  combo         = -1;
  b2b           = false;
  energy        = 0;
  freezeUntil   = 0;
  boardSnapshot = null;
  lastMoveRotate= false;
  challengeMode = mode || null;

  // Reiniciar sistemas externos
  if (typeof resetCombos    === 'function') resetCombos();
  if (typeof resetEffects   === 'function') resetEffects();
  if (typeof resetPowerups  === 'function') resetPowerups();
  if (typeof resetAbilities === 'function') resetAbilities();

  // Cola de 5 piezas
  nextQueue = [];
  for (let i = 0; i < 5; i++) nextQueue.push(randomPiece());

  if (challengeMode && typeof challengeMode.setup === 'function')
    challengeMode.setup();

  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

// ── Teclado ───────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // Inicializar audio en primer input (política autoplay)
  if (typeof initAudio === 'function') initAudio();

  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'KeyM') { if (typeof toggleMute === 'function') toggleMute(); return; }

  // Menú de habilidades
  if (e.code === 'KeyQ') {
    if (!paused && !gameOver && typeof openAbilityMenu === 'function') openAbilityMenu();
    return;
  }

  if (paused || gameOver) return;

  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) {
        current.x--;
        lastMoveRotate = false;
        sfx('move');
      }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) {
        current.x++;
        lastMoveRotate = false;
        sfx('move');
      }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX': {
      // Rotación inversa si el modo desafío lo pide en niveles altos
      const ccw = challengeMode && challengeMode.invertRotation && level >= 5;
      tryRotate(ccw);
      sfx('rotate');
      break;
    }
    case 'KeyZ':
      tryRotate(true);
      sfx('rotate');
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      if (typeof doHold === 'function') doHold();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', () => {
  // Al reiniciar: mostrar menú de modo si está disponible, sino clásico
  const modeMenu = document.getElementById('mode-menu');
  if (modeMenu) {
    modeMenu.classList.remove('hidden');
    overlay.classList.add('hidden');
  } else {
    init();
  }
});

<<<<<<< HEAD
// ---- Theme toggle ----
const themeToggle = document.getElementById('theme-toggle');

(function applyStoredTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.checked = true;
  }
})();

themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    document.body.classList.add('light-mode');
    localStorage.setItem('theme', 'light');
  } else {
    document.body.classList.remove('light-mode');
    localStorage.setItem('theme', 'dark');
  }
});

init();
=======
// Stub sfx por si audio.js no está cargado aún
if (typeof sfx === 'undefined') {
  window.sfx = function() {};
}

// No llamar init() aquí: challenges.js (cargado antes) muestra el menú primero.
// Si challenges.js no está cargado (compatibilidad), arrancar directo.
if (typeof CHALLENGES === 'undefined') {
  init();
}
>>>>>>> a2282a7 (feat: nuevos cambios agregados)
