import * as THREE from 'three';

// 院内和走廊远景共用同一座石拱铁门，不另行添加行走碰撞。
export function createPrisonGate(group) {
  const stone = new THREE.MeshStandardMaterial({ color: '#928879', roughness: 1 });
  if (typeof document !== 'undefined') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-wall.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    stone.map = texture;
  }
  const iron = new THREE.MeshStandardMaterial({ color: '#444944', roughness: .75, metalness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: '#272d2a', roughness: .85, metalness: .4 });
  const brass = new THREE.MeshStandardMaterial({ color: '#ad9470', roughness: .65, metalness: .55 });
  function block(w, h, d, x, y, z, material, rotation = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.rotation.z = rotation;
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  for (const side of [-1, 1]) {
    block(.42, 3.5, .55, side * 1.72, 1.75, 0, stone);
    block(.62, .25, .7, side * 1.72, .125, 0, stone);
    block(.62, .25, .7, side * 1.72, 3.42, 0, stone);
    block(1.48, 3.16, .18, side * .76, 1.58, .08, iron);
    for (const y of [.25, 1.15, 2.15, 3.05]) block(1.46, .06, .05, side * .76, y, .19, dark);
    for (const x of [.34, .76, 1.18]) block(.035, 3.04, .05, side * x, 1.62, .19, dark);
    block(.21, .24, .06, side * .38, 1.9, .22, dark);
    block(.11, .035, .07, side * .38, 1.9, .26, brass);
  }
  // 拱顶分段形成石缝，顶部不遮挡既有墙体后的视野。
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI * (i + .5) / 9, radius = 1.72;
    block(.54, .43, .56, Math.cos(angle) * radius, 3.25 + Math.sin(angle) * .63, 0, stone, angle - Math.PI / 2);
  }
  block(.08, 2.95, .09, 0, 1.55, .22, dark);
  block(.62, .08, .09, 0, 1.4, .26, brass);
}
