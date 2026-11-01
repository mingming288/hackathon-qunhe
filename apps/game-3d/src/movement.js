export const MOVEMENT_SPEED_MULTIPLIER = 1.5;

// 当前基础版采用平地圆形角色与矩形障碍；台阶/多层关卡出现时再扩展高度判定。
export function canStand(x, z, bounds, colliders, radius = 0.36) {
  if (Math.abs(x) + radius > bounds[0] / 2 || Math.abs(z) + radius > bounds[1] / 2) return false;
  return !colliders.some(c => {
    const nearX = Math.max(c.x - c.w / 2, Math.min(x, c.x + c.w / 2));
    const nearZ = Math.max(c.z - c.d / 2, Math.min(z, c.z + c.d / 2));
    return (x - nearX) ** 2 + (z - nearZ) ** 2 < radius ** 2;
  });
}

export function moveWithCollision(position, dx, dz, bounds, colliders) {
  // 分小步移动，避免低帧率时跨过薄墙；沿两轴分别处理以允许沿墙滑动。
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.15));
  for (let i = 0; i < steps; i++) {
    if (canStand(position.x + dx / steps, position.z, bounds, colliders)) position.x += dx / steps;
    if (canStand(position.x, position.z + dz / steps, bounds, colliders)) position.z += dz / steps;
  }
  return position;
}
