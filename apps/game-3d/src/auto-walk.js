import { guideWaypoint } from './guide-route.js';

// 导航只负责走近，不执行对话、挑战或剧情选择。
export class AutoWalk {
  constructor(object, portal = false) {
    this.object = object; this.portal = portal; this.wait = 0; this.last = null; this.repath = 0; this.waypoint = null;
  }
  update(world, position, dt, entryBlocked = false) {
    if (!this.object?.visible || !this.object.parent) return { status: 'blocked' };
    const target = this.object.getWorldPosition(position.clone());
    const dx = target.x - position.x, dz = target.z - position.z, distance = Math.hypot(dx, dz);
    const reach = this.portal ? .8 : 2.4;
    if (this.last && Math.hypot(position.x - this.last.x, position.z - this.last.z) < .005) this.wait += dt;
    else this.wait = 0;
    this.last = { x: position.x, z: position.z };
    if (this.wait > 1.5) return { status: 'blocked' };
    // 刚过门时返回入口被暂时锁存；先离开标记范围，再转身靠近。
    if (this.portal && entryBlocked && distance < 1.7) {
      const length = distance || 1;
      return { status: 'walking', direction: distance > .01 ? { x: -dx / length, z: -dz / length } : { x: 0, z: -1 } };
    }
    if (!this.portal && distance <= reach) return { status: 'arrived' };
    this.repath -= dt;
    if (this.repath <= 0) {
      this.waypoint = guideWaypoint(world, position, target, reach);
      this.repath = .3;
    }
    const point = this.waypoint || target;
    const x = point.x - position.x, z = point.z - position.z, length = Math.hypot(x, z);
    if (length < .05) { this.repath = 0; return { status: 'walking', direction: { x: 0, z: 0 } }; }
    return { status: 'walking', direction: { x: x / length, z: z / length } };
  }
}
