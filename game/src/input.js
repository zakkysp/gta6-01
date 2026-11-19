// Keyboard and mouse. Held keys steer and drive; one-shot presses (enter a car,
// pause, confirm) are queued as flags and taken once by the loop, so a press
// between two frames is never lost and never counted twice.
export const ACTION_ENTER = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_MUTE = 8;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const ENTER = new Set(['KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CONFIRM = new Set(['Space', 'Enter']);
const MUTE = new Set(['KeyM']);
const HANDBRAKE = new Set(['Space']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  window.addEventListener('keydown', (event) => {
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || SPRINT.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      if (HANDBRAKE.has(event.code)) held.add(event.code);
      event.preventDefault();
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything.
  window.addEventListener('blur', () => {
    held.clear();
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    mouseClicked = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    actions |= ACTION_CONFIRM;
    event.preventDefault();
  });
  canvas.addEventListener('pointerup', () => {
    mouseDown = false;
  });

  function has(keys) {
    for (const code of keys) if (held.has(code)) return true;
    return false;
  }

  return {
    // -1..1 on each axis, from the held movement keys.
    get moveX() {
      return (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
    },
    get moveY() {
      return (has(BACK) ? 1 : 0) - (has(FORWARD) ? 1 : 0);
    },
    get sprint() {
      return has(SPRINT);
    },
    get handbrake() {
      return has(HANDBRAKE);
    },
    get mouseDown() {
      return mouseDown;
    },
    get mouseX() {
      return mouseX;
    },
    get mouseY() {
      return mouseY;
    },
    // True once per click, then cleared.
    takeClick() {
      const clicked = mouseClicked;
      mouseClicked = false;
      return clicked;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
