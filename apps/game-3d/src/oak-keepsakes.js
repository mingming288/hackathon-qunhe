import * as THREE from 'three';

// 标记石和铁盒独立，便于按剧情阶段显示或隐藏。
export function createOakKeepsake(group, kind) {
  if (kind === 'stone') {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(.7, 1), new THREE.MeshStandardMaterial({ color: '#4c4d45', roughness: 1, flatShading: true }));
    stone.scale.set(1.15, .3, .78); stone.position.y = .16; stone.castShadow = stone.receiveShadow = true; group.add(stone);
    return;
  }
  const metal = new THREE.MeshStandardMaterial({ color: '#565147', roughness: .85, metalness: .45 });
  const dark = new THREE.MeshStandardMaterial({ color: '#373b37', roughness: .85, metalness: .5 });
  const rusty = new THREE.MeshStandardMaterial({ color: '#866e53', roughness: .9, metalness: .35 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  block(1.05, .33, .62, 0, .165, 0, metal);
  block(1.08, .10, .65, 0, .395, 0, metal);
  for (const x of [-.39, .39]) {
    block(.035, .42, .025, x, .22, .326, rusty);
    block(.035, .025, .65, x, .46, 0, rusty);
    block(.15, .08, .05, x, .35, -.335, dark);
  }
  block(.15, .16, .045, 0, .29, .338, dark);
  block(.06, .08, .05, 0, .29, .365, rusty);
}
