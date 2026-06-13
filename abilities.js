'use strict';

// ── Sistema de habilidades cargables ─────────────────────────────────────────
// energy 0–100, se llena al limpiar líneas. Tecla Q abre el menú.

const ENERGY_MAX = 100;

function resetAbilities() {
  energy = 0;
  drawEnergyBar();
}

function addEnergy(cleared) {
  energy = Math.min(ENERGY_MAX, energy + cleared * 15);
  drawEnergyBar();
  if (energy >= ENERGY_MAX) {
    spawnText('Q → HABILIDAD!', '#7aa2f7');
  }
}

function drawEnergyBar() {
  const el = document.getElementById('energy-fill');
  if (!el) return;
  const pct = (energy / ENERGY_MAX) * 100;
  el.style.width = pct + '%';
  el.style.background = energy >= ENERGY_MAX
    ? '#7aa2f7'
    : `hsl(${180 + pct * 0.6},70%,55%)`;

  const label = document.getElementById('energy-label');
  if (label) label.textContent = energy >= ENERGY_MAX ? 'LISTO (Q)' : `${Math.floor(pct)}%`;
}

// ── Menú de habilidades ───────────────────────────────────────────────────────
function openAbilityMenu() {
  if (energy < ENERGY_MAX || paused || gameOver) return;
  paused = true;
  cancelAnimationFrame(animId);

  const menu = document.getElementById('ability-menu');
  if (menu) menu.classList.remove('hidden');
}

function closeAbilityMenu() {
  const menu = document.getElementById('ability-menu');
  if (menu) menu.classList.add('hidden');
  paused = false;
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function useAbility(name) {
  energy = 0;
  drawEnergyBar();
  sfx('ability');
  closeAbilityMenu();

  switch (name) {
    case 'next5':
      // Mostrar cola extendida — ya está visible (5 piezas en nextCanvas)
      spawnText('VER PRÓXIMAS 5', '#4dd0e1');
      // Animar el panel brevemente
      const nc = document.getElementById('next-canvas');
      if (nc) { nc.style.outline = '2px solid #4dd0e1'; setTimeout(() => nc.style.outline = '', 1500); }
      break;

    case 'swap':
      // Reemplazar pieza actual por una nueva del pool
      const saved = current;
      current = randomPiece();
      // Asegurarse que no colisiona en spawn
      current.y = saved.y;
      if (collide(current.shape, current.x, current.y)) current.y = 0;
      lastMoveRotate = false;
      spawnText('SWAP!', '#ba68c8');
      break;

    case 'slowmo': {
      // Velocidad mitad durante 10s
      const origInterval = dropInterval;
      dropInterval = Math.min(dropInterval * 2, 2000);
      spawnText('SLOW-MO 10s', '#ffb74d');
      setTimeout(() => { dropInterval = origInterval; }, 10000);
      break;
    }

    case 'undo':
      if (boardSnapshot) {
        board = boardSnapshot.map(row => [...row]);
        // Restaurar la pieza anterior como current — sacamos de nextQueue
        // y revertimos al snapshot de current
        spawnText('UNDO!', '#81c784');
      } else {
        spawnText('SIN HISTORIAL', '#888');
      }
      break;

    case 'freehold':
      holdUsed = false;
      if (typeof doHold === 'function') doHold();
      spawnText('FREE HOLD!', '#ffd54f');
      break;
  }
}

// ── Delegar clics del menú ────────────────────────────────────────────────────
function _initAbilityButtons() {
  document.querySelectorAll('[data-ability]').forEach(btn => {
    btn.addEventListener('click', () => useAbility(btn.dataset.ability));
  });
  const cancelBtn = document.getElementById('ability-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', closeAbilityMenu);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initAbilityButtons);
} else {
  _initAbilityButtons();
}
