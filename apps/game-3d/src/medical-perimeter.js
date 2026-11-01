import * as THREE from 'three';

// 前门的开口和场景出口共用中心线；围墙以低碰撞阻挡穿越，不遮挡镜头。
export function addMedicalPerimeter(world) {
  const group = new THREE.Group(); group.name = '医疗机构围墙'; world.root.add(group);
  const masonry = new THREE.MeshStandardMaterial({ color: '#8e8d80', roughness: 1 });
  const iron = new THREE.MeshStandardMaterial({ color: '#353d39', roughness: .75, metalness: .4 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  for (const side of [-1, 1]) {
    const x = side * 10.95;
    block(14.5, .95, .45, x, .475, 14.7, masonry);
    block(14.5, .12, .55, x, 1.01, 14.7, masonry);
    for (const y of [1.13, 2.15]) block(14.5, .07, .08, x, y, 14.7, iron);
    for (let i = 0; i < 29; i++) block(.055, 1.1, .07, side * (3.95 + i * .5), 1.65, 14.7, iron);
    for (const postX of [3.55, 18.25]) {
      block(.65, 2.55, .65, side * postX, 1.275, 14.7, masonry);
      block(.83, .18, .83, side * postX, 2.64, 14.7, masonry);
    }
    block(.45, 1.05, 15.3, side * 18.2, .525, 7.05, masonry);
    world.colliders.push({ x, z: 14.7, w: 14.5, d: .65, h: 2.7, camera: false });
    world.colliders.push({ x: side * 18.2, z: 7.05, w: .65, d: 15.3, h: 1.1, camera: false });
  }
  const pathMaterial = new THREE.MeshStandardMaterial({ color: '#b0a794', roughness: 1 });
  if (typeof document !== 'undefined') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-floor.jpg');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 7); pathMaterial.map = texture;
  }
  const path = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 27.8), pathMaterial);
  path.name = '医疗机构入口道路'; path.rotation.x = -Math.PI / 2;
  path.position.set(0, -.015, 1.7); path.receiveShadow = true; world.root.add(path);
}
