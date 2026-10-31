// 方向相对当前镜头，和方向键的上下左右一致。
export function goalDirection(from, to, yaw, { nearDistance = 1.2, label = '目标方向' } = {}) {
  const dx = to.x - from.x, dz = to.z - from.z;
  if (Math.hypot(dx, dz) < nearDistance) return '目标就在附近';
  const x = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const z = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const index = ((Math.round(Math.atan2(x, -z) / (Math.PI / 4)) % 8) + 8) % 8;
  return label + ' ' + arrows[index];
}

// 管网中间隔墙遮挡出口，先引导至隔墙南端的通道，再转向雨夜。
export function pipeExitWaypoint(position) {
  if (position.x >= 5.9) return null;
  return position.z < 4.5 ? { x: 3.8, z: 5 } : { x: 6.5, z: 5 };
}
