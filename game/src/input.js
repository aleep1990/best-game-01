// STARSHATTER — input. One job: read keyboard + mouse, hand the world clean actions.
// Movement: WASD or arrows. Aim: mouse. Fire: hold mouse button or Space.
// Confirm: Enter / Space / click (start, restart). Pause: P or Escape. Mute: M.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false };
  // View transform: canvas CSS pixels -> 1280x720 game space. Set by main.js on resize.
  const view = { scale: 1, ox: 0, oy: 0 };
  let actions = 0;
  let confirmQueued = false;

  function toView(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.ox) / view.scale,
      y: (clientY - rect.top - view.oy) / view.scale,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const dir = KEYMAP[e.code];
    if (dir) {
      keys.add(dir);
      e.preventDefault();
      return;
    }
    if (e.code === 'Space') {
      keys.add('fire');
      confirmQueued = true;
      e.preventDefault();
    } else if (e.code === 'Enter') {
      confirmQueued = true;
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (e.code === 'KeyM') {
      actions |= ACTION_MUTE;
    } else if (e.code === 'KeyR') {
      actions |= ACTION_RESTART;
    }
  });
  window.addEventListener('keyup', (e) => {
    const dir = KEYMAP[e.code];
    if (dir) keys.delete(dir);
    else if (e.code === 'Space') keys.delete('fire');
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const p = toView(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toView(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    confirmQueued = true;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    mouse,
    view,
    /** Normalised movement vector from held keys. */
    direction() {
      const x = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      const y = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    firing() {
      return keys.has('fire') || mouse.down;
    },
    /** Actions pressed since the last call (edge-triggered). */
    takeActions() {
      const out = actions | (confirmQueued ? ACTION_CONFIRM : 0);
      actions = 0;
      confirmQueued = false;
      return out;
    },
  };
}
