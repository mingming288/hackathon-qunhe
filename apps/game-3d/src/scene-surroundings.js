import * as THREE from 'three';

// 游玩时补足开放建筑外侧的可见范围；环境总览仍保留剖面。
const indoor = new Set(['room', 'corridor', 'tunnel', 'maze']);
const skies = { yard: '#82918d', field: '#a6b5ad', road: '#9caea9', beach: '#9cbec0', rain: '#384d59' };
const grounds = { yard: '#666b5f', field: '#778464', road: '#777c70', beach: '#baa985', rain: '#454e50' };

export function addSceneSurroundings(world) {
  const { config, root } = world, [width, depth] = config.size;
  const group = new THREE.Group(); group.name = '场景远景'; root.add(group);
  world.cameraColliders = [];
  if (!indoor.has(config.kind)) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: grounds[config.kind] || '#687169', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -.32; ground.receiveShadow = true; group.add(ground);
    world.background = skies[config.kind] || '#83918e'; world.fog = world.background;
    return;
  }
  const material = new THREE.MeshBasicMaterial({ color: config.tone === 'clinical' ? '#71837e' : '#766e60', side: THREE.DoubleSide });
  // 本地贴图提供石墙细节；非浏览器场景构造测试不加载图片。
  if (typeof document !== 'undefined' && config.tone !== 'clinical') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-wall.jpg');
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 2); material.map = texture;
  }
  const height = 10, margin = 1.3, w = width + margin * 2, d = depth + margin * 2;
  function wall(x, z, sizeX, sizeZ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sizeX, height, sizeZ), material);
    mesh.position.set(x, height / 2, z); mesh.receiveShadow = true; group.add(mesh);
    world.cameraColliders.push({ x, z, w: sizeX, d: sizeZ, h: height, camera: true });
  }
  wall(0, -d / 2, w, .25); wall(0, d / 2, w, .25);
  wall(-w / 2, 0, .25, d); wall(w / 2, 0, .25, d);
}
