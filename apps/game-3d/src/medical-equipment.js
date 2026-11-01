import * as THREE from 'three';

// 保留旧场景占地，避免替换模型后改变玩家行走空间。
export function createMedicalEquipment(group, kind) {
  const steel = new THREE.MeshStandardMaterial({ color: '#777c72', roughness: .7, metalness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: '#353e3c', roughness: .8, metalness: .3 });
  const leather = new THREE.MeshStandardMaterial({ color: '#55544b', roughness: .9 });
  const light = new THREE.MeshStandardMaterial({ color: '#d8d8bd', emissive: '#9a956b', emissiveIntensity: .45 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  function cylinder(radius, height, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 18), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  if (kind === 'lamp') {
    cylinder(.42, .12, 0, .06, 0, steel);
    cylinder(.08, 2.75, 0, 1.44, 0, dark);
    block(1.05, .09, .09, .48, 2.75, 0, steel);
    cylinder(.58, .22, .88, 2.56, 0, steel);
    cylinder(.49, .035, .88, 2.43, 0, light);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      cylinder(.09, .04, .88 + Math.cos(angle) * .28, 2.4, Math.sin(angle) * .28, light);
    }
    return;
  }
  block(1.75, .16, 3.35, 0, 1.0, 0, steel);
  for (const z of [-1.12, 0, 1.12]) block(1.65, .21, 1.02, 0, 1.18, z, leather);
  block(1.25, .18, .44, 0, 1.31, -1.42, leather);
  for (const z of [-.6, .66]) {
    block(1.8, .025, .13, 0, 1.3, z, dark);
    block(.16, .035, .2, .3, 1.32, z, steel);
  }
  cylinder(.33, .75, 0, .55, 0, steel);
  cylinder(.52, .12, 0, .17, 0, dark);
  for (const x of [-.8, .8]) for (const z of [-1.25, 1.25]) {
    block(.18, .14, 1.3, x, .18, z * .5, steel);
    const wheel = cylinder(.14, .12, x, .14, z, dark); wheel.rotation.z = Math.PI / 2;
  }
  for (const x of [-.93, .93]) block(.07, .08, 3.1, x, .95, 0, dark);
}
