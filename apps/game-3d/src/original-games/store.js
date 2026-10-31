import { createStoreRules, storeCss, storeBody } from "virtual:original-store";
import { animate } from "./input.js";

export function mountStore(root, { onComplete, phase }) {
  const host = document.createElement("div"),
    shadow = host.attachShadow({ mode: "open" }),
    style = document.createElement("style");
  style.textContent =
    storeCss +
    "\n:host{display:block;height:100%} .screen{position:relative;width:100%;height:100%;display:block} .panel{width:100%;height:100%} .panel canvas{object-fit:contain} .sorting-game{height:100%}";
  const template = document.createElement("template");
  template.innerHTML = storeBody;
  const panel = template.content.querySelector("#redCanvas").closest(".panel");
  panel.querySelector("#redCanvas").tabIndex = 0;
  shadow.append(style, panel);
  root.replaceChildren(host);
  const get = (id) => shadow.getElementById(id),
    canvas = get("redCanvas"),
    cleanups = [];
  const action = document.createElement("button");
  action.className = "original-store-action";
  action.type = "button";
  panel.append(action);
  const keyboardHint = document.createElement("div");
  keyboardHint.className = "sorting-keyboard-hint";
  keyboardHint.textContent = "键盘：1—4 选择商品，5—8 放入第 1—4 层，回车确认";
  get("sortingGame").append(keyboardHint);
  // 接入层只提供输入、画布和生命周期，商品、碰撞、三单装袋和请示流程均来自原版。
  const rules = createStoreRules({
    phase,
    onComplete,
    elements: {
      canvas,
      confirmBag: get("confirmBag"),
      productList: get("productList"),
      bagSlots: get("bagSlots"),
      sortInstruction: get("sortInstruction"),
      sortingLayer: get("sortingGame"),
      paperBag: get("paperBag"),
      controls: get("controls"),
      gameHud: get("gameHud"),
      gameMessage: get("gameMessage"),
      redSubtitle: get("redSubtitle"),
    },
    onContext(context) {
      action.textContent = context.label;
      action.hidden = !context.playable;
      action.classList.toggle("ready", context.highlighted);
    },
  });
  style.textContent +=
    "\n.original-store-action{position:absolute;right:18px;bottom:20px;z-index:20;border:2px solid #8d886c;background:#28291f;color:#f1e4bd;padding:15px 25px;font:18px sans-serif}.original-store-action.ready{border-color:#f6df88;background:#53583c}.controls{pointer-events:none}.game-hud{white-space:pre-line}.sorting-keyboard-hint{position:absolute;top:6%;left:50%;transform:translateX(-50%);color:#f4e6c9;background:#241914;padding:6px 12px;white-space:nowrap;font:14px sans-serif}";
  const listen = (obj, type, fn) => {
    obj.addEventListener(type, fn);
    cleanups.push(() => obj.removeEventListener(type, fn));
  };
  const key = (e) =>
    ({ ArrowUp: "w", ArrowDown: "s", ArrowLeft: "a", ArrowRight: "d" })[
      e.key
    ] || e.key.toLowerCase();
  listen(root, "keydown", (e) => {
    if (get("sortingGame").classList.contains("show")) {
      const number = Number(e.key);
      if (Number.isInteger(number) && number >= 1 && number <= 8) {
        e.preventDefault();
        const target = number <= 4
          ? get("sortingGame").querySelector(`.sort-product[data-item-id="${["flour", "can", "bread", "eggs"][number - 1]}"]`)
          : get("bagSlots").querySelector(`[data-level="${number - 5}"]`);
        target?.click();
      } else if (e.key === "Enter") {
        e.preventDefault();
        get("confirmBag").click();
      }
      return;
    }
    const k = key(e);
    if (!["w", "a", "s", "d", " "].includes(k)) return;
    e.preventDefault();
    if (k === " " && !e.repeat) rules.interact();
    else rules.keyDown(k);
  });
  listen(root, "keyup", (e) => rules.keyUp(key(e)));
  const release = () => {
    for (const k of ["w", "a", "s", "d"]) rules.keyUp(k);
    rules.move(0, 0);
  };
  listen(window, "blur", release);
  listen(document, "visibilitychange", release);
  listen(action, "click", () => rules.interact());
  listen(get("confirmBag"), "click", () => {
    // 排序成功后按钮随面板隐藏，恢复焦点以便立即继续使用键盘。
    if (!get("sortingGame").classList.contains("show")) canvas.focus();
  });
  let drag = null;
  listen(canvas, "pointerdown", (e) => {
    if (e.button !== 0) return;
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, moved: false };
  });
  listen(canvas, "pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 18) drag.moved = true;
    if (drag.moved) {
      const len = Math.max(1, Math.hypot(dx, dy));
      rules.move(dx / len, dy / len);
    }
  });
  listen(canvas, "pointerup", () => {
    if (drag && !drag.moved) rules.interact();
    drag = null;
    rules.move(0, 0);
  });
  listen(canvas, "pointercancel", () => {
    drag = null;
    release();
  });
  const stop = animate((dt, now) => {
    rules.update(dt, now);
    rules.draw();
  });
  canvas.focus();
  return {
    getState: rules.getState,
    destroy() {
      stop();
      release();
      rules.destroy();
      cleanups.forEach((fn) => fn());
    },
  };
}
