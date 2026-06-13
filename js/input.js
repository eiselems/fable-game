export const input = {
  keys: new Set(),     // held keys (KeyCode strings)
  pressed: new Set(),  // keys pressed this frame
  mouse: { x: 240, y: 160, down: false },
  clicked: false,      // left button pressed this frame
  wheel: 0,
};

export function initInput(canvas) {
  window.addEventListener('keydown', e => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
  });
  window.addEventListener('keyup', e => input.keys.delete(e.code));
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
  });

  const updatePos = e => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = ((e.clientX - r.left) * canvas.width) / r.width;
    input.mouse.y = ((e.clientY - r.top) * canvas.height) / r.height;
  };
  canvas.addEventListener('mousemove', updatePos);
  canvas.addEventListener('mousedown', e => {
    updatePos(e);
    if (e.button === 0) {
      input.mouse.down = true;
      input.clicked = true;
    }
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0) input.mouse.down = false;
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    input.wheel += Math.sign(e.deltaY);
  }, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

export function endFrame() {
  input.pressed.clear();
  input.clicked = false;
  input.wheel = 0;
}
