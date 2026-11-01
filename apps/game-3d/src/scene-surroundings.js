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
    if (config.kind === 'beach') {
      // 近岸水面止于场景边界，远海向外延伸并由雾自然收至天际。
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshToonMaterial({ color: '#668b8f' }));
      sea.name = '海滩远海'; sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, .035, -depth / 2 + 11.5 - 150); group.add(sea);
    }
    world.background = skies[config.kind] || '#83918e'; world.fog = world.background;
    return;
  }
  const material = new THREE.MeshBasicMaterial({ color: config.tone === 'clinical' ? '#71837e' : '#766e60', side: THREE.DoubleSide });
  // 本地贴图提供石墙细节；非浏览器场景构造测试不加载图片。
  if (typeof document !== 'undefined' && config.tone !== 'clinical') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-wall.jpg');
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 2); material.map = texture;
  } else if (typeof document !== 'undefined') {
    // 门洞后的背景延续医疗墙砖，避免出现大块没有细节的灰色平面。
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#73847e'; context.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      context.fillStyle = (x + y) % 3 ? '#d0d9cb' : '#bbc9bb';
      context.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 2);
    material.map = texture;
  }
  const height = 10, margin = 1.3, w = width + margin * 2, d = depth + margin * 2;
  // 开放门洞和墙面之间的地面也需覆盖，避免转身时露出背景色的细条。
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material.clone());
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.29; group.add(floor);
  function wall(x, z, sizeX, sizeZ, h = height, y = h / 2) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sizeX, h, sizeZ), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; group.add(mesh);
    world.cameraColliders.push({ x, z, w: sizeX, d: sizeZ, h: y + h / 2, camera: true });
  }
  if (config.id === 'pipeNetwork') {
    // 雨夜出口处保留视野，其余区域仍有背景墙和镜头碰撞。
    const left = 6.5, right = 11.5;
    const start = -w / 2, end = w / 2;
    wall((start + left) / 2, -d / 2, left - start, .25);
    wall((right + end) / 2, -d / 2, end - right, .25);
    world.background = '#384d59'; world.fog = world.background;
  } else wall(0, -d / 2, w, .25);
  if (config.id === 'cellCorridor') {
    // 院子入口保持开阔；墙垛仍供镜头避让，不改变玩家移动碰撞。
    const opening = 11.6, side = (w - opening) / 2;
    wall(-(opening + side) / 2, d / 2, side, .25);
    wall((opening + side) / 2, d / 2, side, .25);
    world.background = '#82918d'; world.fog = world.background;
  } else if (config.id === 'cell') {
    const left = -4.9, right = -2.0, start = -w / 2, end = w / 2;
    wall((start + left) / 2, d / 2, left - start, .25);
    wall((right + end) / 2, d / 2, end - right, .25);
  } else wall(0, d / 2, w, .25);
  wall(-w / 2, 0, .25, d);
  if (config.id === 'cellCorridor') {
    const opening = 2.2, side = (d - opening) / 2;
    wall(w / 2, -(opening + side) / 2, .25, side);
    wall(w / 2, (opening + side) / 2, .25, side);
  } else wall(w / 2, 0, .25, d);
}
