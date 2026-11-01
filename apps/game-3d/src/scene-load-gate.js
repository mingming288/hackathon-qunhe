// 加载中的场景禁止移动；只允许最新一次场景加载解除限制。
export class SceneLoadGate {
  constructor() { this.revision = 0; this.active = false; }
  begin(blockInput) { this.active = blockInput; return ++this.revision; }
  finish(revision) {
    if (revision !== this.revision) return false;
    this.active = false; return true;
  }
}

// 只恢复尚未替换的角色；外层锚点的剧情显隐不受影响。
export function revealPendingCharacters(anchors) {
  let shown = 0;
  for (const anchor of anchors) {
    const { placeholder, replaced } = anchor.userData;
    if (!replaced && placeholder && !placeholder.visible) {
      placeholder.visible = true; shown++;
    }
  }
  return shown;
}
