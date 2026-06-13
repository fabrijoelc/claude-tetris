'use strict';

// ── Modos de desafío ──────────────────────────────────────────────────────────
// Cada modo es { name, setup(), tick(dt), onLock(cleared), checkWin(),
//               updateHUD(), hideActive, invertRotation }

const CHALLENGES = {};

// ── Clásico (sin restricciones) ───────────────────────────────────────────────
CHALLENGES.classic = {
  name: 'CLÁSICO',
  setup() {},
  tick(dt) {},
  onLock(cleared) {},
  checkWin() { return false; },
  updateHUD() {},
  hideActive: false,
  invertRotation: false,
};

// ── Sprint: 40 líneas en 2 min ────────────────────────────────────────────────
CHALLENGES.sprint = {
  name: 'SPRINT 40L',
  _elapsed: 0,
  _goal: 40,
  _timeLimit: 2 * 60 * 1000, // 2 min en ms
  setup() {
    this._elapsed = 0;
    this._won = false;
    updateChallengeHUD('SPRINT', '40 líneas · 2:00');
  },
  tick(dt) {
    if (this._won) return;
    this._elapsed += dt;
    const rem = Math.max(0, this._timeLimit - this._elapsed);
    const m = Math.floor(rem / 60000);
    const s = Math.floor((rem % 60000) / 1000);
    updateChallengeHUD('SPRINT', `${40 - Math.min(lines, 40)}L · ${m}:${String(s).padStart(2,'0')}`);
    if (rem <= 0 && !this._won) endGame();
  },
  onLock(cleared) {},
  checkWin() {
    if (lines >= 40 && !this._won) {
      this._won = true;
      const t   = this._elapsed;
      const m   = Math.floor(t / 60000);
      const s   = ((t % 60000) / 1000).toFixed(2);
      showWin(`SPRINT CLEAR\n${m}:${String(Math.floor(s)).padStart(2,'0')}.${String(s).split('.')[1]}`);
      return true;
    }
    return false;
  },
  updateHUD() {},
  hideActive: false,
  invertRotation: false,
};

// ── Basura: sube una fila cada 10s ────────────────────────────────────────────
CHALLENGES.garbage = {
  name: 'BASURA',
  _timer: 0,
  _interval: 10000,
  setup() {
    this._timer = 0;
    updateChallengeHUD('BASURA', 'Fila cada 10s');
  },
  tick(dt) {
    this._timer += dt;
    const rem = Math.ceil((this._interval - this._timer) / 1000);
    updateChallengeHUD('BASURA', `+fila en ${rem}s`);
    if (this._timer >= this._interval) {
      this._timer -= this._interval;
      addGarbageRow();
    }
  },
  onLock(cleared) {},
  checkWin() { return false; },
  updateHUD() {},
  hideActive: false,
  invertRotation: false,
};

function addGarbageRow() {
  const hole = Math.floor(Math.random() * COLS);
  const row  = Array.from({ length: COLS }, (_, c) => c === hole ? 0 : 6);
  board.shift();
  board.push(row);
  // Si la pieza actual colisiona, moverla hacia arriba
  if (collide(current.shape, current.x, current.y)) {
    current.y = Math.max(0, current.y - 1);
  }
}

// ── Pre-colocado: tablero con bloques fijos ───────────────────────────────────
CHALLENGES.prefilled = {
  name: 'PRE-COLOCADO',
  setup() {
    // Colocar un patrón de bloques en las 5 filas inferiores con huecos
    for (let r = ROWS - 5; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.5) board[r][c] = Math.floor(Math.random() * 7) + 1;
      }
      // Dejar al menos 1 hueco por fila
      board[r][Math.floor(Math.random() * COLS)] = 0;
    }
    updateChallengeHUD('PRE-COLOCADO', 'Sobrevive');
  },
  tick(dt) {},
  onLock(cleared) {},
  checkWin() { return false; },
  updateHUD() {},
  hideActive: false,
  invertRotation: false,
};

// ── Invisible: piezas se ocultan al asentar ───────────────────────────────────
CHALLENGES.invisible = {
  name: 'INVISIBLE',
  setup() { updateChallengeHUD('INVISIBLE', 'Las piezas desaparecen'); },
  tick(dt) {},
  onLock(cleared) {},
  checkWin() { return false; },
  updateHUD() {},
  hideActive: false,
  invertRotation: false,
  // hideActive se aplica al tablero de celdas asentadas en draw():
  // sobreescribimos draw vía hook: en game.js ya hay soporte para challengeMode.hideActive
  // pero hideActive aquí es para la pieza activa; para el tablero usamos drawBoardInvisible
};

// Parche: draw() en game.js omite piezas asentadas si el modo dice hideBoard
// En su lugar simplemente no dibujamos el board[] cuando hideActive=true en el tablero.
// Implementación: monkey-patch via flag en la pieza (ya manejado en draw() de game.js)
// Para el tablero completo, sobrescribimos drawBlock para modo invisible:
const _invPatch = {
  apply() {
    // No se puede ocultar board directamente sin tocar draw().
    // Usamos un flag global que draw() chequea.
    window._invisibleMode = true;
  },
  remove() { window._invisibleMode = false; }
};

// ── Rotación inversa en niveles altos ─────────────────────────────────────────
CHALLENGES.invrot = {
  name: 'ROT. INVERSA',
  setup() { updateChallengeHUD('ROT.INV.', 'Rot. inversa nivel 5+'); },
  tick(dt) {},
  onLock(cleared) {},
  checkWin() { return false; },
  updateHUD() {},
  hideActive: false,
  invertRotation: true, // game.js keydown lo usa
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function updateChallengeHUD(title, info) {
  const el = document.getElementById('challenge-info');
  if (el) el.textContent = `${title}: ${info}`;
}

function showWin(msg) {
  cancelAnimationFrame(animId);
  overlayTitle.textContent = '¡VICTORIA!';
  overlayScore.textContent = msg.replace('\n', ' — ');
  overlay.classList.remove('hidden');
}

// ── Menú de inicio ────────────────────────────────────────────────────────────
function initChallengeMenu() {
  const menu = document.getElementById('mode-menu');
  if (!menu) return;

  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = CHALLENGES[btn.dataset.mode] || CHALLENGES.classic;
      // Modo invisible: aplicar parche a draw
      if (btn.dataset.mode === 'invisible') {
        _invPatch.apply();
      } else {
        _invPatch.remove();
      }
      menu.classList.add('hidden');
      init(mode);
    });
  });

  // Mostrar el menú al arrancar (init() lo oculta, así que lo mostramos antes)
  menu.classList.remove('hidden');
}

// Enganchamos al DOMContentLoaded (o inmediato si ya cargó)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChallengeMenu);
} else {
  initChallengeMenu();
}
