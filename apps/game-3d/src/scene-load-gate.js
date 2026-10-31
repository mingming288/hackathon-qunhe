// 加载中的场景禁止移动；只允许最新一次场景加载解除限制。
export class SceneLoadGate {
  constructor() { this.revision = 0; this.active = false; }
  begin(blockInput) { this.active = blockInput; return ++this.revision; }
  finish(revision) {
    if (revision !== this.revision) return false;
    this.active = false; return true;
  }
}
