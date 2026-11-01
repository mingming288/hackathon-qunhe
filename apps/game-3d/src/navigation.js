import { canStand } from './movement.js';
import { YARD_BUILDINGS, YARD_ENTRANCES } from './yard-layout.js';
import { SCENE_BY_ID } from './scenes.js';

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

// 按两侧实际门洞对齐，供远景和过门落点共同使用。
export function cellDoorTransform() {
  return { x: 6.1 + (SCENE_BY_ID.get('cell').size[1] / 2 - .3), z: -PORTALS.cell.cellCorridor[0] };
}

// 院子与走廊的出口相对，跨越时对视角和人物朝向做相同的坐标变换。
export function transitionOrientation(from, to, yaw, facing, entry = null) {
  if (from === 'pipeNetwork' && to === 'rain') return { yaw: Math.PI, facing: 0 };
  if (from === 'cell' && to === 'cellCorridor') return { yaw: yaw - Math.PI / 2, facing: facing - Math.PI / 2 };
  if (from === 'cellCorridor' && to === 'cell') return { yaw: yaw + Math.PI / 2, facing: facing + Math.PI / 2 };
  if ((from === 'cellCorridor' && to === 'yard') || (from === 'yard' && to === 'cellCorridor')) {
    return { yaw: yaw + Math.PI, facing: facing + Math.PI };
  }
  const building = YARD_BUILDINGS.find(item => (from === 'yard' && to === item.id) || (from === item.id && to === 'yard'));
  if (building) {
    const rotation = from === 'yard' ? -building.rotation : building.rotation;
    return { yaw: yaw + rotation, facing: facing + rotation };
  }
  if (entry?.portal && entry?.position) {
    const dx = entry.portal.x - entry.position.x, dz = entry.portal.z - entry.position.z;
    if (Math.hypot(dx, dz) > .01) {
      const entryYaw = Math.atan2(dx, dz);
      return { yaw: entryYaw, facing: entryYaw + Math.PI };
    }
  }
  return { yaw: 0, facing: Math.PI };
}

export function entryPosition(world, from, saved = null, previous = null) {
  const candidate = saved || (() => {
    if (previous && ((from === 'cell' && world.config.id === 'cellCorridor') || (from === 'cellCorridor' && world.config.id === 'cell'))) {
      const sourcePortal = PORTALS[from][world.config.id];
      if (Math.hypot(previous.x - sourcePortal[0], previous.z - sourcePortal[1]) < 1.25) {
        const transform = cellDoorTransform();
        // 门洞两侧的镜头碰撞体略宽于行走边界，落点需留在碰撞体内侧。
        const mapped = from === 'cell'
          ? { x: Math.min(transform.x - previous.z, 5.3), z: previous.x + transform.z }
          : { x: previous.z - transform.z, z: Math.min(transform.x - previous.x, 5.6) };
        if (canStand(mapped.x, mapped.z, world.config.size, world.colliders)) return mapped;
      }
    }
    // 走廊和院子的远景共用半周旋转坐标；过门时沿用人物位置，避免跳到门内深处。
    if (previous && ((from === 'cellCorridor' && world.config.id === 'yard') || (from === 'yard' && world.config.id === 'cellCorridor'))) {
      const offset = PORTALS.cellCorridor.yard[1] + PORTALS.yard.cellCorridor[1];
      const mapped = { x: -previous.x, z: offset - previous.z };
      if (Number.isFinite(mapped.x) && Number.isFinite(mapped.z) && canStand(mapped.x, mapped.z, world.config.size, world.colliders)) return mapped;
    }
    if (world.config.id === 'rain' && from === 'pipeNetwork') return { x: 0, z: -12.4 };
    if (world.config.id === 'evidence' && from === 'medicalExterior') return { x: 0, z: 3 };
    if (world.config.id === 'yard') {
      const building = YARD_BUILDINGS.find(item => item.id === from);
      if (building) {
        const [x, z] = YARD_ENTRANCES[from];
        return { x: x + Math.sin(building.rotation) * 2.6, z: z + Math.cos(building.rotation) * 2.6 };
      }
    }
    const portal = world.portals.find(item => item.id === from);
    if (!portal) return null;
    const { x, z } = portal.object.position;
    const length = Math.hypot(x, z) || 1;
    return { x: x - x / length * 2.6, z: z - z / length * 2.6 };
  })();
  if (candidate && Number.isFinite(candidate.x) && Number.isFinite(candidate.z) && canStand(candidate.x, candidate.z, world.config.size, world.colliders)) return candidate;
  return { x: world.config.spawn[0], z: world.config.spawn[1] };
}
