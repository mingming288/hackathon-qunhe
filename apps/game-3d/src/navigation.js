import { canStand } from './movement.js';
import { YARD_ENTRANCES } from './yard-layout.js';

// 门、洞口和道路使用固定位置，正向/返回方向共用同一个入口标识。
export const PORTALS = {
  livingRoom: { cell: [0, 4.9] },
  cell: { cellCorridor: [-3.8, 5.4], dig: [0, -5.4] },
  cellCorridor: { cell: [5, 0, Math.PI / 2], yard: [0, 12.7], solitary: [-5, -5.6, -Math.PI / 2] },
  yard: { cellCorridor: [0, 16.8], ...YARD_ENTRANCES, operatingRoom: [0, -16.8] },
  library: { yard: [0, 9] }, office: { yard: [0, 8] }, solitary: { cellCorridor: [-2.8, 4.7] },
  dig: { cell: [0, 10.2], pipe: [0, -10.2] },
  pipe: { dig: [0, 7.8], pipeNetwork: [-5.5, -5] },
  pipeNetwork: { pipe: [0, 13.4], rain: [9, -13.3] },
  rain: { oak: [-7, -8], evidence: [0, -8], bank: [7, -8] },
  operatingRoom: { cell: [0, 7.5], medicalExterior: [6.5, 4] },
  oak: { road: [0, 14], rain: [10, 12] },
  road: { oak: [-8, 16], beach: [-8, -16], bank: [8, 14] },
  beach: { road: [0, 16], supermarket: [12, 10] },
  supermarket: { beach: [0, 11], road: [-9, 10] },
  bank: { road: [0, 8] }, evidence: { medicalExterior: [0, 7], rain: [-6, 4] },
  medicalExterior: { evidence: [0, 14.6], operatingRoom: [0, -11.2] }
};

export function entryPosition(world, from, saved = null) {
  const candidate = saved || (() => {
    const portal = world.portals.find(item => item.id === from);
    if (!portal) return null;
    const { x, z } = portal.object.position;
    const length = Math.hypot(x, z) || 1;
    return { x: x - x / length * 2.6, z: z - z / length * 2.6 };
  })();
  if (candidate && Number.isFinite(candidate.x) && Number.isFinite(candidate.z) && canStand(candidate.x, candidate.z, world.config.size, world.colliders)) return candidate;
  return { x: world.config.spawn[0], z: world.config.spawn[1] };
}
