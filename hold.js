'use strict';

// doHold() — intercambia pieza actual con el slot de hold.
// Depende de: hold, holdUsed, current, nextQueue, spawn(), PIECES, makePiece (pieces.js)
function doHold() {
  if (holdUsed) return; // solo una vez por pieza

  sfx('move');

  if (hold === null) {
    // Primera vez: guardar current, hacer spawn de la siguiente
    hold = { type: current.type };
    holdUsed = true;
    // No llamar spawn() directamente — reutilizamos la lógica normal
    current = nextQueue.shift();
    nextQueue.push(randomPiece());
    holdUsed = true;
    lastMoveRotate = false;
    if (collide(current.shape, current.x, current.y)) {
      endGame();
      return;
    }
    drawNext();
  } else {
    // Intercambio: sacar del hold, meter current ahí
    const savedType = hold.type;
    hold = { type: current.type };
    holdUsed = true;
    lastMoveRotate = false;
    current = makePiece(savedType);
    if (collide(current.shape, current.x, current.y)) {
      // Mover hacia arriba si hay colisión por offset de spawn
      current.y = -1;
      if (collide(current.shape, current.x, current.y)) {
        endGame();
        return;
      }
    }
    drawNext();
  }
  drawHold();
}
