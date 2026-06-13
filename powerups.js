'use strict';

// ── Power-ups ─────────────────────────────────────────────────────────────────
// Aparece una pieza especial 1×1 cada POWERUP_EVERY líneas.

const POWERUP_EVERY = 8;
let _linesAtLastPower = 0;
let _pendingPower = null; // tipo de power-up para el próximo spawn

const POWER_TYPES  = ['bomb', 'ray', 'dye', 'gravity', 'freeze'];
const POWER_COLORS = { bomb: '#ff5252', ray: '#ffea00', dye: '#ea80fc',
                       gravity: '#40c4ff', freeze: '#80deea' };
const POWER_GLYPHS = { bomb: '💣', ray: '⚡', dye: '🎨', gravity: '🌀', freeze: '❄' };

// Índice de celda especial de power-up en el board: usamos valor 50+
// bomb=51, ray=52, dye=53, gravity=54, freeze=55
const POWER_CELL = { bomb: 51, ray: 52, dye: 53, gravity: 54, freeze: 55 };
const CELL_POWER = Object.fromEntries(Object.entries(POWER_CELL).map(([k,v])=>[v,k]));

function resetPowerups() {
  _linesAtLastPower = 0;
  _pendingPower = null;
}

// Llamado desde spawn() para intercalar pieza power-up cuando corresponde
// Retorna la pieza power-up o null
function getPowerupPiece() {
  if (lines - _linesAtLastPower >= POWERUP_EVERY) {
    _linesAtLastPower = lines;
    const ptype = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
    const cell  = POWER_CELL[ptype];
    // Pieza 1×1 con celda especial
    return { type: 'power', power: ptype, shape: [[cell]],
             x: Math.floor(COLS / 2), y: 0 };
  }
  return null;
}

// Llamado desde lockPiece() antes de merge. Retorna true si era un power-up.
function onLockPowerup(piece) {
  if (piece.type !== 'power') return false;

  const px = piece.x;
  const py = piece.y;

  applyPower(piece.power, px, py);
  return true;
}

function applyPower(ptype, px, py) {
  spawnText(POWER_GLYPHS[ptype] + ' ' + ptype.toUpperCase(), POWER_COLORS[ptype]);

  switch (ptype) {
    case 'bomb':    applyBomb(px, py);    break;
    case 'ray':     applyRay(px, py);     break;
    case 'dye':     applyDye();           break;
    case 'gravity': applyGravity();       break;
    case 'freeze':  applyFreeze();        break;
  }

  // Re-evaluar líneas tras el efecto
  const cleared = clearLines();
  if (cleared > 0) {
    lines  += cleared;
    score  += cleared * 100 * level;
    level   = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
    flashLines(cleared);
  }

  // Partículas en posición
  spawnParticles(px, py, POWER_COLORS[ptype] || '#fff', 20);
}

function applyBomb(cx, cy) {
  for (let r = cy - 1; r <= cy + 1; r++)
    for (let c = cx - 1; c <= cx + 1; c++)
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        if (board[r][c]) spawnParticles(c, r, COLORS[board[r][c]] || '#fff', 4);
        board[r][c] = 0;
      }
}

function applyRay(cx, cy) {
  for (let c = 0; c < COLS; c++) {
    if (cy >= 0 && cy < ROWS) { spawnParticles(c, cy, POWER_COLORS.ray, 3); board[cy][c] = 0; }
  }
  for (let r = 0; r < ROWS; r++) {
    if (cx >= 0 && cx < COLS) { spawnParticles(cx, r, POWER_COLORS.ray, 3); board[r][cx] = 0; }
  }
}

function applyDye() {
  // Contar frecuencia de cada color
  const freq = {};
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] && board[r][c] < 50) // no contar ya-wildcards
        freq[board[r][c]] = (freq[board[r][c]] || 0) + 1;

  if (!Object.keys(freq).length) return;
  const mostCommon = +Object.entries(freq).sort((a,b) => b[1]-a[1])[0][0];

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === mostCommon) {
        spawnParticles(c, r, COLORS[mostCommon] || '#fff', 2);
        board[r][c] = 99; // wildcard
      }
}

function applyGravity() {
  // Por cada columna, apilar celdas no vacías hacia abajo
  for (let c = 0; c < COLS; c++) {
    const cells = [];
    for (let r = 0; r < ROWS; r++)
      if (board[r][c]) cells.push(board[r][c]);
    for (let r = 0; r < ROWS; r++)
      board[r][c] = r < (ROWS - cells.length) ? 0 : cells[r - (ROWS - cells.length)];
  }
}

function applyFreeze() {
  freezeUntil = performance.now() + 5000;
  sfx('freeze');
}

// ── Render: glifo sobre bloque power-up ───────────────────────────────────────
function drawPowerGlyph(context, bx, by, colorIndex, size) {
  if (colorIndex < 51 || colorIndex > 55) return;
  const ptype = CELL_POWER[colorIndex];
  if (!ptype) return;
  context.globalAlpha = 1;
  context.font = `${size - 6}px serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(POWER_GLYPHS[ptype], bx * size + size / 2, by * size + size / 2);
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
}

// Overlay de hielo mientras freeze está activo
function drawFreezeOverlay(ctx) {
  if (!freezeUntil || performance.now() >= freezeUntil) return;
  const remaining = (freezeUntil - performance.now()) / 5000;
  ctx.fillStyle = `rgba(128,222,234,${remaining * 0.18})`;
  ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  ctx.strokeStyle = `rgba(128,222,234,${remaining * 0.5})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, COLS * BLOCK - 2, ROWS * BLOCK - 2);
}

// ── Extensión de spawn para intercalar power-ups ──────────────────────────────
// Se sobreescribe spawn en game.js usando el hook. Alternativamente,
// getPowerupPiece() se llama desde el spawn original.
// Para no romper el flujo, actualizamos nextQueue antes de spawn:
const _origRandomPiece = window.randomPiece || null;

// Hook inyectado en el loop de spawn: si toca power-up, insertar al frente de nextQueue
// Esta función es llamada al final del spawn() en game.js después de pushear nueva pieza.
function checkInjectPowerup() {
  if (lines - _linesAtLastPower >= POWERUP_EVERY && lines > 0) {
    _linesAtLastPower = lines;
    const ptype = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
    const cell  = POWER_CELL[ptype];
    const pp = { type: 'power', power: ptype, shape: [[cell]],
                 x: Math.floor(COLS / 2), y: 0 };
    nextQueue.unshift(pp);
    drawNext();
  }
}
