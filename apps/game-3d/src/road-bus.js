import * as THREE from 'three';

// 赴约巴士沿用道路场景的车辆占地，车窗、车门和灯具分开制作。
export function createRoadBus(group) {
  const cream = new THREE.MeshStandardMaterial({ color: '#c5b59a', roughness: .76, metalness: .15 });
  const red = new THREE.MeshStandardMaterial({ color: '#81463b', roughness: .78, metalness: .15 });
  const glass = new THREE.MeshStandardMaterial({ color: '#485e5c', roughness: .34, metalness: .2 });
  const metal = new THREE.MeshStandardMaterial({ color: '#a39d8b', roughness: .55, metalness: .62 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#292b29', roughness: 1 });
  const lamp = new THREE.MeshStandardMaterial({ color: '#e4cf9c', roughness: .4 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  block(2.65, 1.05, 6.9, 0, .93, 0, red);
  block(2.65, 1.25, 6.9, 0, 2.08, 0, cream);
  block(2.72, .22, 7, 0, 2.8, 0, cream);
  for (const side of [-1, 1]) {
    const x = side * 1.333;
    for (const z of [-2.2, -1.25, -.3, .65, 1.6, 2.55]) {
      block(.025, .77, .74, x, 2.14, z, glass);
      block(.04, .045, .79, x + side * .01, 1.72, z, metal);
    }
    block(.035, .08, 6.8, x, 1.38, 0, metal);
    for (const z of [-2.15, 2.15]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .23, 20), rubber);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1.33, .52, z); wheel.castShadow = true; group.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .24, 20), metal);
      hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); group.add(hub);
    }
  }
  // 车门位于右侧前部，车身轮廓和轮胎不超过原碰撞框。
  for (const z of [-2.96, -2.55]) {
    block(.045, 1.65, .36, 1.36, 1.66, z, metal);
    block(.05, .68, .27, 1.39, 2.04, z, glass);
  }
  for (const x of [-.63, .63]) {
    block(1.08, .9, .035, x, 2.14, -3.47, glass);
    block(.25, .18, .04, x * 1.5, .9, -3.48, lamp);
    block(.25, .13, .04, x * 1.5, .9, 3.48, red);
  }
  for (let y = .65; y <= 1.17; y += .13) block(1.1, .035, .035, 0, y, -3.49, metal);
  for (const z of [-3.51, 3.51]) block(2.72, .12, .1, 0, .48, z, metal);
}
