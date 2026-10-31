import "./original.css";
import { ORIGINAL_GAMES, isOriginalCompletion } from "./registry.js";
import { bindPipeKeys } from "./pipe-keys.js";

export class OriginalGameHost {
  constructor({ finish, onClose, notify, onProgress = () => {} }) {
    Object.assign(this, { finish, onClose, notify, onProgress });
    this.token = 0;
    this.dialog = document.createElement("dialog");
    this.dialog.className = "original-dialog";
    this.dialog.setAttribute("aria-labelledby", "original-game-title");
    this.dialog.innerHTML =
      '<header><h2 id="original-game-title"></h2><button type="button">返回探索</button></header><div class="original-viewport"></div>';
    document.body.append(this.dialog);
    this.root = this.dialog.querySelector(".original-viewport");
    this.dialog
      .querySelector("button")
      .addEventListener("click", () => this.close());
    this.dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.close();
    });
  }
  get busy() {
    return this.dialog.open;
  }
  close() {
    this.token++;
    clearTimeout(this.timer);
    this.unbindPipeKeys?.();
    this.unbindPipeKeys = null;
    this.instance?.destroy();
    this.instance = null;
    this.root.replaceChildren();
    this.dialog.close();
    this.onClose();
  }
  async open(action) {
    const spec = ORIGINAL_GAMES[action.id];
    if (!spec) return false;
    if (this.busy) this.close();
    const token = ++this.token;
    let pending = false;
    this.dialog.querySelector("h2").textContent =
      (spec.kind === "store" ? "瑞德的超市工作" : action.label) +
      (spec.kind === "pipeMaze" ? " · 方向键或字母键移动" : " · 原版小游戏");
    this.dialog.classList.toggle("thunder-mode", spec.kind === "thunder");
    this.root.textContent = "正在打开…";
    this.dialog.showModal();
    const finish = (detail) => {
      if (pending || token !== this.token || !this.busy) return;
      pending = true;
      this.timer = setTimeout(
        () => {
          if (token !== this.token || !this.busy) return;
          this.close();
          this.finish(action.id, detail);
        },
        spec.kind === "pipeMaze" ? 1000 : 650,
      );
    };
    try {
      const bundle = await import("./bundle.js");
      if (token !== this.token || !this.busy) return;
      if (spec.event) {
        const host = document.createElement("div");
        host.className = "original-component";
        const shadow = host.attachShadow({ mode: "open" }),
          style = document.createElement("style"),
          root = document.createElement("div");
        root.id = "root";
        style.textContent =
          window.BeyondWallsStyles.miniGameFont +
          "\n" +
          window.BeyondWallsStyles[spec.kind] +
          "\n:host{display:block;width:100%;height:100%} #root{height:100%}";
        shadow.append(style, root);
        this.root.replaceChildren(host);
        this.instance = window.BeyondWallsMiniGames[spec.kind].mount(root, {
          embedded: true,
          seed: spec.seed,
          onEvent: (message) => {
            if (isOriginalCompletion(spec, message)) finish(message.detail);
          },
        });
        if (spec.kind === "pipeMaze") this.unbindPipeKeys = bindPipeKeys(window, () => this.instance?.api);
      } else if (spec.kind === "hide")
        this.instance = bundle.mountHide(this.root, { onComplete: finish });
      else if (["dig", "soil", "thunder"].includes(spec.kind))
        this.instance = bundle.mountTiming(this.root, {
          kind: spec.kind,
          onComplete: finish,
          onProgress: (state) => this.onProgress(action.id, state),
        });
      else if (spec.kind === "store")
        this.instance = bundle.mountStore(this.root, {
          phase: spec.phase,
          onComplete: finish,
        });
      else {
        this.instance = window.BeyondWallsEndingOneGames[
          spec.kind === "oak" ? "mountOak" : "mountRoute"
        ](this.root, { embedded: true, onComplete: finish });
        const shadow = this.root.firstElementChild.shadowRoot,
          fit = document.createElement("style");
        fit.textContent =
          ":host{display:grid;place-items:center}.ending-one-component-content{width:100%}#frame,#wrap{width:min(100%,calc((100dvh - 56px)*16/9));max-height:100%;margin:auto}";
        shadow.append(fit);
      }
    } catch (error) {
      if (token !== this.token) return;
      this.instance?.destroy();
      this.instance = null;
      this.root.textContent = "小游戏未能打开，请返回后重试。";
      this.notify("小游戏加载失败：" + error.message);
    }
    return true;
  }
}
