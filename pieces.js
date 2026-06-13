'use strict';

// ── Constantes globales de tablero ────────────────────────────────────────────
const COLS  = 10;
const ROWS  = 20;
const BLOCK = 30;

// ── Piezas estándar (índices 1–7) ────────────────────────────────────────────
const COLORS = [
  null,
  '#4dd0e1', // 1 I  - cyan
  '#ffd54f', // 2 O  - yellow
  '#ba68c8', // 3 T  - purple
  '#81c784', // 4 S  - green
  '#e57373', // 5 Z  - red
  '#7986cb', // 6 J  - indigo
  '#ffb74d', // 7 L  - orange
  // ── Piezas raras (índices 8–12) ──────────────────────────────────────────
  '#f06292', //  8 + (plus)    - pink
  '#4db6ac', //  9 U           - teal
  '#aed581', // 10 Y           - lime
  '#fff176', // 11 single 1×1  - pale yellow
  '#90caf9', // 12 3×3 hueca   - light blue
];

const PIECES = [
  null,
  // 1 I
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  // 2 O
  [[2,2],[2,2]],
  // 3 T
  [[0,3,0],[3,3,3],[0,0,0]],
  // 4 S
  [[0,4,4],[4,4,0],[0,0,0]],
  // 5 Z
  [[5,5,0],[0,5,5],[0,0,0]],
  // 6 J
  [[6,0,0],[6,6,6],[0,0,0]],
  // 7 L
  [[0,0,7],[7,7,7],[0,0,0]],
  // 8 + (plus pentomino)
  [[0,8,0],[8,8,8],[0,8,0]],
  // 9 U pentomino
  [[9,0,9],[9,9,9],[0,0,0]],
  // 10 Y pentomino
  [[0,10,0],[10,10,0],[0,10,0],[0,10,0]],
  // 11 single 1×1 (recompensa Tetris)
  [[11]],
  // 12 3×3 hueca (anillo)
  [[12,12,12],[12,0,12],[12,12,12]],
];

// Pesos para el pool aleatorio. La pieza 11 (single) no entra aquí —
// se otorga como recompensa y se encola manualmente.
const PIECE_POOL = [
  { type: 1, weight: 10 },
  { type: 2, weight: 10 },
  { type: 3, weight: 10 },
  { type: 4, weight: 10 },
  { type: 5, weight: 10 },
  { type: 6, weight: 10 },
  { type: 7, weight: 10 },
  { type: 8, weight: 3  },  // +
  { type: 9, weight: 3  },  // U
  { type: 10, weight: 3 },  // Y
  { type: 12, weight: 2 },  // 3×3 hueca
];

const _totalWeight = PIECE_POOL.reduce((s, p) => s + p.weight, 0);

function randomPieceType() {
  let r = Math.random() * _totalWeight;
  for (const p of PIECE_POOL) {
    r -= p.weight;
    if (r <= 0) return p.type;
  }
  return PIECE_POOL[0].type;
}

function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  return makePiece(randomPieceType());
}
