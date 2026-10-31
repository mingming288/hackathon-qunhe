import * as THREE from 'three';

// 推车和记录保持在原剧情锚点内，方便从四周靠近。
export function createMedicalCart(group) {
  const metal = new THREE.MeshStandardMaterial({ color: '#6e7770', roughness: .7, metalness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: '#424c48', roughness: .8, metalness: .4 });
  const paper = new THREE.MeshStandardMaterial({ color: '#cdbf9e', roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: '#695646', roughness: .9 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  for (const y of [.38, 1.2]) {
    block(2.35, .1, 1.35, 0, y, 0, metal);
    for (const z of [-.66, .66]) block(2.35, .12, .06, 0, y + .08, z, dark);
    for (const x of [-1.14, 1.14]) block(.06, .12, 1.35, x, y + .08, 0, dark);
  }
  for (const x of [-1.05, 1.05]) for (const z of [-.55, .55]) {
    block(.08, 1.4, .08, x, .83, z, dark);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .1, 14), dark);
    wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .14, z); wheel.castShadow = true; group.add(wheel);
  }
  block(2.05, .3, 1.15, 0, 1.02, 0, metal);
  for (const x of [-.53, .53]) {
    block(.92, .24, .04, x, 1.02, .6, dark);
    block(.26, .045, .06, x, 1.04, .64, metal);
  }
  block(.68, .06, .9, -.55, 1.3, -.05, wood);
  block(.6, .035, .82, -.55, 1.35, -.05, paper);
  for (let i = 0; i < 5; i++) block(.42, .005, .015, -.55, 1.37, -.3 + i * .1, dark);
  block(.74, .38, .56, .1, .62, 0, dark);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .35, 12), metal);
  bottle.position.set(.7, 1.42, 0); bottle.castShadow = true; group.add(bottle);
}
