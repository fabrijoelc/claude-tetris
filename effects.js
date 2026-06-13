'use strict';

// ── Sistema de partículas y textos flotantes ───────────────────────────────────
let _particles = [];
let _texts     = [];
let _flashes   = []; // flash de filas al limpiar

function resetEffects() {
  _particles = [];
  _texts     = [];
  _flashes   = [];
}

// ── Partículas ────────────────────────────────────────────────────────────────
function spawnParticles(boardX, boardY, color, count) {
  count = count || 12;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    _particles.push({
      x:    (boardX + 0.5) * BLOCK,
      y:    (boardY + 0.5) * BLOCK,
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.025 + Math.random() * 0.02,
      color,
      size: 3 + Math.random() * 3,
    });
  }
}

// ── Texto flotante ────────────────────────────────────────────────────────────
function spawnText(text, color) {
  _texts.push({
    text,
    color: color || '#fff',
    x:   COLS * BLOCK / 2,
    y:   ROWS * BLOCK / 2 - 40,
    vy:  -0.8,
    life: 1.0,
    decay: 0.012,
  });
}

// ── Flash de fila ─────────────────────────────────────────────────────────────
function flashLines(count) {
  for (let i = 0; i < count; i++) {
    _flashes.push({ life: 1.0, decay: 0.06 });
  }
}

// ── Update (llamado en loop con dt) ──────────────────────────────────────────
function updateEffects(dt) {
  const factor = dt / 16; // normalizar a ~60fps

  for (const p of _particles) {
    p.x    += p.vx * factor;
    p.y    += p.vy * factor;
    p.vy   += 0.12 * factor; // gravedad leve
    p.life -= p.decay * factor;
  }
  _particles = _particles.filter(p => p.life > 0);

  for (const t of _texts) {
    t.y    += t.vy * factor;
    t.life -= t.decay * factor;
  }
  _texts = _texts.filter(t => t.life > 0);

  _flashes = _flashes.filter(f => {
    f.life -= f.decay * factor;
    return f.life > 0;
  });
}

// ── Draw (llamado en draw() de game.js) ──────────────────────────────────────
function drawEffects(ctx) {
  // Flash blanco sobre todo el tablero
  if (_flashes.length > 0) {
    const alpha = _flashes.reduce((a, f) => Math.max(a, f.life * 0.35), 0);
    ctx.fillStyle   = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
  }

  // Partículas
  for (const p of _particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Textos flotantes
  for (const t of _texts) {
    ctx.globalAlpha = t.life;
    ctx.font        = 'bold 22px "Courier New", monospace';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = t.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth   = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign   = 'left';
}
