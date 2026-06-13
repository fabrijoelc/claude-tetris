'use strict';

// ── WebAudio sintetizado (sin assets) ─────────────────────────────────────────
let _ac  = null;
let _muted = false;
let _audioReady = false;

function initAudio() {
  if (_audioReady) return;
  try {
    _ac = new (window.AudioContext || window.webkitAudioContext)();
    _audioReady = true;
  } catch(e) { /* sin soporte */ }
}

function toggleMute() {
  _muted = !_muted;
}

// Genera un sonido corto con oscilador
function _beep(freq, type, duration, gainVal, freqEnd) {
  if (!_ac || _muted) return;
  try {
    const osc  = _ac.createOscillator();
    const gain = _ac.createGain();
    osc.connect(gain);
    gain.connect(_ac.destination);
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, _ac.currentTime);
    if (freqEnd !== undefined)
      osc.frequency.linearRampToValueAtTime(freqEnd, _ac.currentTime + duration);
    gain.gain.setValueAtTime(gainVal || 0.15, _ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _ac.currentTime + duration);
    osc.start(_ac.currentTime);
    osc.stop(_ac.currentTime + duration);
  } catch(e) {}
}

const SFX = {
  move:     () => _beep(220, 'square', 0.05, 0.08),
  rotate:   () => _beep(330, 'square', 0.06, 0.10),
  lock:     () => _beep(110, 'sawtooth', 0.12, 0.12, 80),
  clear:    () => { _beep(523, 'sine', 0.15, 0.20); _beep(659, 'sine', 0.15, 0.15); },
  tetris:   () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => _beep(f, 'sine', 0.18, 0.25), i * 60));
  },
  combo:    () => _beep(440, 'sine', 0.10, 0.18, 660),
  powerup:  () => { _beep(880, 'sine', 0.08, 0.20); _beep(1100, 'sine', 0.08, 0.20); },
  levelup:  () => {
    [392, 494, 587, 784].forEach((f, i) =>
      setTimeout(() => _beep(f, 'sine', 0.12, 0.22), i * 55));
  },
  gameover: () => {
    [330, 277, 220, 165].forEach((f, i) =>
      setTimeout(() => _beep(f, 'sawtooth', 0.20, 0.18), i * 100));
  },
  ability:  () => _beep(660, 'triangle', 0.14, 0.22, 880),
  freeze:   () => _beep(200, 'sine', 0.30, 0.15, 100),
};

function sfx(name) {
  if (SFX[name]) SFX[name]();
}
