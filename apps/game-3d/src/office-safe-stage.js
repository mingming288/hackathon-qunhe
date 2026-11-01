import * as THREE from 'three';
import { block } from './practice-geometry.js';

// 已加载的柜门零件属于当前模型副本；原模型缓存和材质保持不变。
export class OfficeSafeStage {
  constructor(anchor, swapped) {
    this.anchor = anchor; this.swapped = swapped; this.progress = swapped ? 1 : 0;
    this.bind();
  }
  bind() {
    if (this.door) return;
    const model = this.anchor.children.find(child => child.userData.externalAsset);
    if (!model) return;
    const body = model.getObjectByName('保险柜主体');
    const names = ['保险柜门', '门内面板', '门角铆钉', '门角铆钉001', '门角铆钉002', '门角铆钉003', '密码盘底', '密码盘', '密码盘中心', '把手底座', '把手'];
    const parts = names.map(name => model.getObjectByName(name));
    if (!body || parts.some(part => !part)) return;
    model.updateWorldMatrix(true, true);
    const door = new THREE.Group(); door.position.set(-.83, 0, .68); model.add(door);
    door.updateWorldMatrix(true, false);
    for (const part of parts) door.attach(part);
    body.visible = false; this.door = door;
    const interior = new THREE.Group(); this.anchor.add(interior);
    for (const [w, h, d, x, y, z] of [
      [1.8, 1.9, .12, 0, 1.65, -.57], [.12, 1.9, 1.25, -.84, 1.65, 0],
      [.12, 1.9, 1.25, .84, 1.65, 0], [1.8, .12, 1.25, 0, .76, 0], [1.8, .12, 1.25, 0, 2.54, 0],
    ]) block(interior, w, h, d, x, y, z, '#303b3b');
    this.ledger = block(interior, .65, .14, .8, 0, .9, .05, '#6c3924');
    this.bible = block(interior, .62, .18, .78, 0, .92, .05, '#67755e');
    this.place();
  }
  sync(swapped) {
    if (swapped && !this.swapped) this.progress = 0;
    this.swapped = swapped;
    if (!swapped) this.progress = 0;
    this.bind(); this.place();
  }
  update(dt) {
    if (!this.swapped || this.progress >= 1) return;
    this.progress = Math.min(1, this.progress + dt / .8); this.place();
  }
  place() {
    if (!this.door) return;
    const t = this.progress * this.progress * (3 - 2 * this.progress);
    this.door.rotation.y = -1.48 * t;
    this.ledger.visible = !this.swapped;
    this.bible.visible = this.swapped;
  }
}
