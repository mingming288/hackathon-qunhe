// 刺绣是独立物件；恢复进度时直接摆到完成位置，不重复播放动作。
export class OfficeStage {
  constructor(embroidery, opened) {
    this.embroidery = embroidery;
    this.startX = embroidery.position.x;
    this.opened = opened;
    this.progress = opened ? 1 : 0;
    this.place();
  }
  sync(opened) {
    if (opened && !this.opened) this.progress = 0;
    this.opened = opened;
    if (!opened) this.progress = 0;
    this.place();
  }
  update(dt) {
    if (!this.opened || this.progress >= 1) return;
    this.progress = Math.min(1, this.progress + dt / .8);
    this.place();
  }
  place() {
    const t = this.progress * this.progress * (3 - 2 * this.progress);
    this.embroidery.position.x = this.startX - 2.2 * t;
  }
}
