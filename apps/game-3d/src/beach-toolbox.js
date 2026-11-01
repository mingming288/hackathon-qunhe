import * as THREE from 'three';

// 修船工具箱和随箱木槌；部件保持独立，方便后续制作开盖或取用动画。
export function createBeachToolbox(group) {
  const wood = new THREE.MeshStandardMaterial({ color: '#685544', roughness: 1 });
  const lidWood = new THREE.MeshStandardMaterial({ color: '#7d6950', roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: '#484943', metalness: .55, roughness: .8 });
  const brass = new THREE.MeshStandardMaterial({ color: '#9d8868', metalness: .55, roughness: .7 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  function rod(radius, length, x, y, z, material, rotation = Math.PI / 2) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
    mesh.position.set(x, y, z); mesh.rotation.z = rotation;
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  block(1.25, .42, .57, 0, .22, 0, wood);
  block(1.3, .13, .61, 0, .495, 0, lidWood);
  for (const x of [-.49, .49]) {
    block(.095, .56, .025, x, .3, .304, iron);
    block(.095, .025, .62, x, .57, 0, iron);
    for (const y of [.12, .35, .5]) {
      const rivet = rod(.026, .012, x, y, .323, brass, 0);
      rivet.rotation.x = Math.PI / 2;
    }
  }
  block(.18, .18, .035, 0, .43, .324, iron);
  block(.07, .075, .04, 0, .43, .348, brass);
  for (const x of [-.27, .27]) block(.045, .18, .045, x, .665, 0, iron);
  rod(.055, .55, 0, .76, 0, wood);
  // 木槌放在箱侧，避免遮挡箱体和船边的行走路线。
  const handle = rod(.035, .65, .83, .07, .08, lidWood, 0);
  handle.rotation.x = Math.PI / 2;
  rod(.115, .29, .83, .12, -.25, wood);
}
