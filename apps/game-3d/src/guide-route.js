import { canStand } from './movement.js';

// 用与人物一致的碰撞规则寻找可行走的中间点；目标自身可以是不能站立的家具。
export function guideWaypoint(world, from, target, reach = 2.2) {
  const { size } = world.config, colliders = world.colliders, step = .6;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const stand = p => canStand(p.x, p.z, size, colliders, .4);
  function clear(a, b) {
    const count = Math.max(1, Math.ceil(distance(a, b) / .2));
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      if (!stand({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })) return false;
    }
    return true;
  }
  const d = distance(from, target);
  if (d <= reach) return null;
  const direct = { x: from.x + (target.x - from.x) * (d - reach + .15) / d, z: from.z + (target.z - from.z) * (d - reach + .15) / d };
  if (clear(from, direct)) return null;

  const cols = Math.floor(size[0] / step), rows = Math.floor(size[1] / step);
  const point = (x, z) => ({ x: -size[0] / 2 + (x + .5) * step, z: -size[1] / 2 + (z + .5) * step });
  const sx = Math.max(0, Math.min(cols - 1, Math.floor((from.x + size[0] / 2) / step)));
  const sz = Math.max(0, Math.min(rows - 1, Math.floor((from.z + size[1] / 2) / step)));
  const queue = [], parents = new Map();
  // 玩家可能靠近墙边而网格中心不可站立，选择附近可直达的起点。
  for (let radius = 0; radius <= 2 && !queue.length; radius++) for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    const x = sx + dx, z = sz + dz;
    if (x < 0 || z < 0 || x >= cols || z >= rows) continue;
    const p = point(x, z), key = z * cols + x;
    if (!parents.has(key) && stand(p) && clear(from, p)) { parents.set(key, null); queue.push({ x, z, key }); }
  }
  let end = null;
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i], p = point(node.x, node.z);
    if (distance(p, target) < reach - .15) { end = node.key; break; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = node.x + dx, z = node.z + dz, key = z * cols + x;
      if (x < 0 || z < 0 || x >= cols || z >= rows || parents.has(key)) continue;
      const next = point(x, z);
      if (stand(next) && clear(p, next)) { parents.set(key, node.key); queue.push({ x, z, key }); }
    }
  }
  if (end === null) return null;
  const path = [];
  for (let key = end; key !== null; key = parents.get(key)) path.push(point(key % cols, Math.floor(key / cols)));
  path.reverse();
  let waypoint = path[0];
  for (const p of path) { if (!clear(from, p)) break; waypoint = p; }
  return waypoint && distance(from, waypoint) > .2 ? waypoint : null;
}
