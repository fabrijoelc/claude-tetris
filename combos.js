'use strict';

// ── Tablas de puntuación ──────────────────────────────────────────────────────
const BASE_SCORES   = [0, 100, 300, 500, 800];
const TSPIN_SCORES  = [400, 800, 1200, 1600]; // mini/single/double/triple
const PC_SCORES     = [0, 800, 1200, 1800, 2000]; // perfect clear según líneas

// ── Reset en cada init() ──────────────────────────────────────────────────────
function resetCombos() {
  combo = -1;
  b2b   = false;
}

// ── Detección T-spin ──────────────────────────────────────────────────────────
// Regla simplificada: pieza T + último movimiento fue rotación + ≥3 esquinas ocupadas.
function detectTSpin() {
  if (current.type !== 3) return false;  // solo pieza T
  if (!lastMoveRotate) return false;

  const cx = current.x + 1;
  const cy = current.y + 1;
  const corners = [
    [cy - 1, cx - 1],
    [cy - 1, cx + 1],
    [cy + 1, cx - 1],
    [cy + 1, cx + 1],
  ];
  let filled = 0;
  for (const [r, c] of corners) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) filled++;
    else if (board[r][c]) filled++;
  }
  return filled >= 3;
}

// ── scoreClear(cleared) — llamada desde lockPiece() en game.js ───────────────
// Actualiza score, lines, level, combo, b2b, y dispara efectos/textos.
function scoreClear(cleared) {
  const tSpin      = detectTSpin();
  const isHardClear = cleared === 4 || (tSpin && cleared > 0);

  // Combo
  if (cleared > 0) {
    combo++;
  } else {
    combo = -1;
  }

  // Perfect clear: tablero vacío tras limpiar
  const perfectClear = cleared > 0 && board.every(row => row.every(v => v === 0));

  // Calcular puntos base
  let pts = 0;
  if (tSpin && cleared > 0) {
    pts = TSPIN_SCORES[Math.min(cleared, 3)] * level;
    if (typeof spawnText === 'function')
      spawnText(`T-SPIN ${['SINGLE','DOUBLE','TRIPLE'][cleared-1] || ''}`, '#ba68c8');
    sfx('combo');
  } else if (cleared > 0) {
    pts = (BASE_SCORES[Math.min(cleared, 4)] || 0) * level;
    if (cleared === 4 && typeof spawnText === 'function') {
      spawnText('TETRIS!', '#ffd54f');
      sfx('tetris');
      // Recompensa: encolar pieza single como próxima
      nextQueue.splice(1, 0, makePiece(11));
      drawNext();
    }
  }

  // B2B
  if (isHardClear) {
    if (b2b) {
      pts = Math.floor(pts * 1.5);
      if (typeof spawnText === 'function') spawnText('B2B ×1.5', '#ffb74d');
    }
    b2b = true;
  } else if (cleared > 0) {
    b2b = false;
  }

  // Bonus combo
  if (combo > 0) {
    const comboBonus = 50 * combo * level;
    pts += comboBonus;
    if (typeof spawnText === 'function') spawnText(`COMBO ×${combo + 1}`, '#4dd0e1');
    sfx('combo');
  }

  // Perfect clear
  if (perfectClear) {
    pts += (PC_SCORES[Math.min(cleared, 4)] || 0) * level;
    if (typeof spawnText === 'function') spawnText('PERFECT CLEAR!', '#81c784');
    sfx('tetris');
  }

  // Aplicar
  if (cleared > 0) {
    lines += cleared;
    score += pts;
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
      level = newLevel;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      sfx('levelup');
      if (typeof spawnText === 'function') spawnText(`NIVEL ${level}`, '#7aa2f7');
    }
  }
}
