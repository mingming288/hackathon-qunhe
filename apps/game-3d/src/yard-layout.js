// 建筑朝向以本地正前方为正深度；外观、门口和连接道路共用这份布局。
export const YARD_BUILDINGS = [
  { id: 'library', assetKey: 'yard-library-exterior', name: '老布的图书馆', position: [-15, -5], size: [13, 10, 6.2], rotation: Math.PI / 2, wall: '#bba883', roof: '#657e70', trim: '#e6d4ac' },
  { id: 'office', assetKey: 'yard-office-exterior', name: '典狱长办公室', position: [15, -5], size: [13, 10, 8.6], rotation: -Math.PI / 2, wall: '#98a8a0', roof: '#566b70', trim: '#d9d7bd' }
];

export function yardEntrance(building) {
  const distance = building.size[1] / 2 + .65;
  return [building.position[0] + Math.sin(building.rotation) * distance,
    building.position[1] + Math.cos(building.rotation) * distance, building.rotation];
}

export const YARD_ENTRANCES = Object.fromEntries(YARD_BUILDINGS.map(building => [building.id, yardEntrance(building)]));
