// 将键盘和指针转换为原版的逐帧输入；销毁或失焦时释放按键。
export function frameInput(target, canvas = null) {
  const down = new Set(),
    pressed = new Set(),
    cleanups = [];
  const listen = (object, type, fn) => {
    object.addEventListener(type, fn);
    cleanups.push(() => object.removeEventListener(type, fn));
  };
  const input = {
    pointerX: 0,
    pointerY: 0,
    pointerPressed: false,
    pointerJustPressed: false,
    isDown: (key) => down.has(key),
    isPressed: (key) => pressed.has(key),
    actionDown: () => down.has(" "),
    actionPressed: () => pressed.has(" "),
    pointerInRect: (r) =>
      input.pointerX >= r.x &&
      input.pointerX <= r.x + r.w &&
      input.pointerY >= r.y &&
      input.pointerY <= r.y + r.h,
    clear() {
      down.clear();
      pressed.clear();
      input.pointerPressed = false;
      input.pointerJustPressed = false;
    },
    endFrame() {
      pressed.clear();
      input.pointerJustPressed = false;
    },
    listen,
    destroy() {
      input.clear();
      cleanups.forEach((fn) => fn());
    },
    hold(value) {
      if (value && !down.has(" ")) pressed.add(" ");
      if (value) down.add(" ");
      else down.delete(" ");
    },
  };
  listen(target, "keydown", (e) => {
    const k = e.key.toLowerCase();
    if (
      ![
        " ",
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(k)
    )
      return;
    e.preventDefault();
    if (!down.has(k)) pressed.add(k);
    down.add(k);
  });
  listen(target, "keyup", (e) => down.delete(e.key.toLowerCase()));
  listen(window, "blur", () => input.clear());
  listen(document, "visibilitychange", () => input.clear());
  if (canvas) {
    const at = (e) => {
      const r = canvas.getBoundingClientRect(),
        scale = Math.min(r.width / canvas.width, r.height / canvas.height);
      input.pointerX =
        (e.clientX - r.left - (r.width - canvas.width * scale) / 2) / scale;
      input.pointerY =
        (e.clientY - r.top - (r.height - canvas.height * scale) / 2) / scale;
    };
    listen(canvas, "pointerdown", (e) => {
      if (e.button !== 0) return;
      at(e);
      canvas.setPointerCapture(e.pointerId);
      canvas.focus();
      input.pointerPressed = input.pointerJustPressed = true;
    });
    listen(canvas, "pointermove", at);
    listen(canvas, "pointerup", (e) => {
      at(e);
      input.pointerPressed = false;
    });
    listen(canvas, "pointercancel", () => input.clear());
  }
  return input;
}

export function animate(update) {
  let id,
    stopped = false,
    last = performance.now();
  const frame = (now) => {
    if (stopped) return;
    const dt = document.hidden ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt, now);
    if (!stopped) id = requestAnimationFrame(frame);
  };
  id = requestAnimationFrame(frame);
  return () => {
    stopped = true;
    cancelAnimationFrame(id);
  };
}
