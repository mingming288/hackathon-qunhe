import * as THREE from 'three';

// 建筑与医疗机构的通行边界对应；门面只负责展示，入口碰撞由场景统一管理。
export function addMedicalBuilding(parent) {
  const stone = new THREE.MeshStandardMaterial({ color: '#d1c4ad', roughness: 1, emissive: '#a69a85', emissiveIntensity: .4 });
  if (typeof document !== 'undefined') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-wall.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 2); stone.map = stone.emissiveMap = texture;
  }
  const trim = new THREE.MeshStandardMaterial({ color: '#8d8879', roughness: .9 });
  const roof = new THREE.MeshStandardMaterial({ color: '#414b47', roughness: .85 });
  const glass = new THREE.MeshStandardMaterial({ color: '#50615a', roughness: .3, metalness: .2 });
  const metal = new THREE.MeshStandardMaterial({ color: '#393f3b', roughness: .7, metalness: .4 });
  const light = new THREE.MeshStandardMaterial({ color: '#e1c48b', emissive: '#946135', emissiveIntensity: .5 });
  function block(group, w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    return mesh;
  }
  function window(group, x, y, z) {
    block(group, 1.5, 1.65, .15, x, y, z, trim);
    block(group, 1.22, 1.38, .08, x, y, z + .1, glass);
    block(group, .06, 1.4, .06, x, y, z + .16, metal);
    block(group, 1.25, .06, .06, x, y, z + .16, metal);
    block(group, 1.65, .14, .3, x, y - .87, z + .09, trim);
  }
  const building = new THREE.Group(); building.name = '医疗机构建筑'; parent.add(building);
  block(building, 36, 5.8, 1.8, 0, 2.9, -13.5, stone);
  block(building, 36.3, .35, 2.2, 0, 5.95, -13.5, roof);
  for (const side of [-1, 1]) {
    block(building, 8, 5.2, 12, side * 14, 2.6, -7, stone);
    block(building, 8.3, .3, 12.3, side * 14, 5.35, -7, roof);
    for (const x of [5, 8.5, 12, 15.5]) for (const y of [1.55, 4]) window(building, side * x, y, -12.52);
    const wing = new THREE.Group(); wing.position.set(side * 9.96, 0, -7); wing.rotation.y = -side * Math.PI / 2; building.add(wing);
    for (const x of [-4, 0, 4]) for (const y of [1.55, 3.75]) window(wing, x, y, .02);
    block(building, .55, 5.6, .7, side * 3.15, 2.8, -12.3, trim);
    block(building, .35, 5.3, .4, side * 17.4, 2.65, -12.4, trim);
    block(building, .32, .6, .28, side * 2.45, 2.35, -12.08, light);
    block(building, .4, .12, .4, side * 2.45, 2.7, -12.08, metal);
  }
  block(building, 6.8, .42, 1.15, 0, 4.85, -12.2, trim);
  block(building, 5.9, .7, .5, 0, 5.5, -12.42, trim);
  block(building, .9, 1.15, .1, 0, 5.45, -12.12, light);
  block(building, 1.45, .38, .1, 0, 5.45, -12.06, light);
  block(building, 4.1, 3.55, .16, 0, 1.78, -12.52, metal);
  for (const side of [-1, 1]) {
    block(building, 1.75, 3.2, .09, side * .94, 1.65, -12.39, roof);
    block(building, .08, 3, .08, side * 1.67, 1.65, -12.31, trim);
    block(building, .16, .16, .1, side * .18, 1.35, -12.29, light);
  }
  block(building, 4.8, .18, 1, 0, .09, -11.85, trim);
}
