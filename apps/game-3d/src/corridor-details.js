import * as THREE from 'three';

// 建筑主体与细节分开，两处剧情入口的门扇沿墙打开。
export function addCorridorDetails(root) {
  const group = new THREE.Group(); group.name = '监区走廊细节'; root.add(group);
  const iron = new THREE.MeshStandardMaterial({ color: '#403a32', metalness: .72, roughness: .67 });
  const stone = new THREE.MeshStandardMaterial({ color: '#716b5d', roughness: .95 });
  const glass = new THREE.MeshStandardMaterial({ color: '#ffd58b', emissive: '#e9a447', emissiveIntensity: 1.25, roughness: .65 });
  const centers = [-11.2, -5.6, 0, 5.6, 11.2];
  function block(w, h, d, x, y, z, material, parent = group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  for (const side of [-1, 1]) {
    const wall = side * 5.77;
    block(.11, .11, 28, wall, 3.48, 0, iron);
    for (let i = 0; i < centers.length; i++) {
      const z = centers[i];
      for (const edge of [-1, 1]) block(.28, 3.12, .22, wall, 1.56, z + edge * 1.1, stone);
      block(.28, .25, 2.42, wall, 3.15, z, stone);
      const isEntry = (side === 1 && z === 0) || (side === -1 && z === -5.6);
      const door = new THREE.Group(); door.position.set(wall - side * .1, 0, z - 1.02);
      door.rotation.y = isEntry ? side * Math.PI / 2 : 0; group.add(door);
      for (let n = 0; n <= 7; n++) block(.09, 2.88, .065, 0, 1.47, n * .29, iron, door);
      for (const y of [.12, .88, 2.05, 2.9]) block(.09, .12, 2.1, 0, y, 1.015, iron, door);
      block(.12, .42, .35, wall - side * .18, 3.08, z + 1.78, glass);
      block(.22, .08, .52, wall - side * .18, 3.32, z + 1.78, iron);
      block(.14, .06, .38, wall - side * .18, 2.84, z + 1.78, iron);
      if (i % 2 === 0) {
        const light = new THREE.PointLight('#ffbd6a', 8, 7, 2);
        light.position.set(wall - side * .7, 3.05, z + 1.78); group.add(light);
      }
    }
    block(.42, .025, 27.5, side * 5.25, .015, 0, iron);
    for (let z = -13.5; z <= 13.5; z += .5) block(.44, .025, .045, side * 5.25, .032, z, stone);
  }
  return group;
}
