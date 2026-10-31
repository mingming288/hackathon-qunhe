// 新场景的返回入口先锁存，离开入口后才允许再次进入，避免来回闪切。
export class AutoTravel {
  constructor(position, portals) {
    this.blocked = new Set(portals.filter(portal => distance(position, portal) < 1.6).map(portal => portal.id));
  }
  next(position, moving, enabled, portals, rules = {}) {
    for (const portal of portals) if (distance(position, portal) > 1.6) this.blocked.delete(portal.id);
    if (!moving || !enabled) return null;
    return portals.filter(portal => !rules[portal.id] && !this.blocked.has(portal.id) && distance(position, portal) < 1.2)
      .sort((a, b) => distance(position, a) - distance(position, b))[0]?.id || null;
  }
}
function distance(position, portal) {
  return Math.hypot(position.x - portal.object.position.x, position.z - portal.object.position.z);
}
