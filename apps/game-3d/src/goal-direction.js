// 方向相对当前镜头，和方向键的上下左右一致。
export function goalDirection(from, to, yaw) {
  const dx = to.x - from.x, dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 1.2) return '目标就在附近';
  const x = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const z = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const index = ((Math.round(Math.atan2(x, -z) / (Math.PI / 4)) % 8) + 8) % 8;
  return '目标方向 ' + arrows[index];
}
