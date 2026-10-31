import * as THREE from 'three';
import { makeProp } from './kit.js';
import { YARD_BUILDINGS } from './yard-layout.js';
import { PORTALS } from './navigation.js';
import { addCorridorDetails } from './corridor-details.js';

// 两端入口面对相反方向，旋转半周后以入口坐标对齐。
export function corridorYardTransform() {
  return PORTALS.cellCorridor.yard[1] + PORTALS.yard.cellCorridor[1];
}

export function addCorridorYardVista(world) {
  const root = new THREE.Group(); root.name = '走廊外的院子';
  root.rotation.y = Math.PI; root.position.z = corridorYardTransform();
  world.root.add(root);
  world.vistaAnchors = [];
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -15.1);
  function anchor(key, position, rotation = 0, height = 4) {
    const group = new THREE.Group(), placeholder = new THREE.Group();
    group.add(placeholder); group.position.set(...position); group.rotation.y = rotation;
    group.userData = { assetKey: key, placeholder, targetHeight: height, clipPlane };
    root.add(group); world.vistaAnchors.push(group);
  }
  anchor('yard-architecture', [0, 0, 0]);
  for (const building of YARD_BUILDINGS) {
    anchor(building.assetKey, [building.position[0], 0, building.position[1]], building.rotation, building.size[2]);
  }
  const gate = makeProp('gate'); gate.position.set(0, 0, -17); root.add(gate);
  // 加载前保留一块连续的远景地面；不参与碰撞或剧情。
  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#b7a997', roughness: 1 });
  if (typeof document !== 'undefined') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-floor.jpg');
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(11.1, 10); groundMaterial.map = texture;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 36), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.015, -2); root.add(ground);
}

export function addYardCorridorVista(world) {
  const root = new THREE.Group(); root.name = '院子外的监区走廊';
  root.rotation.y = Math.PI; root.position.z = corridorYardTransform();
  world.root.add(root);
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -19.1);
  const anchor = new THREE.Group(), placeholder = new THREE.Group();
  anchor.add(placeholder);
  anchor.userData = { assetKey: 'cellCorridor-architecture', placeholder, targetHeight: 4, clipPlane };
  root.add(anchor); world.vistaAnchors = [anchor];
  // 院子入口两侧是监区外墙，填充走廊以外的裸露背景。
  const facade = new THREE.MeshStandardMaterial({ color: '#a59b89', roughness: 1 });
  if (typeof document !== 'undefined') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-wall.jpg');
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2); facade.map = texture;
  }
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(13.6, 6, .5), facade);
    wall.name = '监区入口外墙'; wall.position.set(side * 13.2, 3, 10.1);
    wall.castShadow = wall.receiveShadow = true; root.add(wall);
  }
  const details = addCorridorDetails(root);
  details.traverse(node => {
    if (!node.isMesh) return;
    for (const material of [node.material].flat()) {
      material.clippingPlanes = [clipPlane]; material.clipShadows = true;
    }
  });
  const groundMaterial = new THREE.MeshStandardMaterial({ color: '#b7a997', roughness: 1 });
  if (typeof document !== 'undefined') {
    const texture = new THREE.TextureLoader().load('/assets/textures/stone-floor.jpg');
    texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3.55, 8); groundMaterial.map = texture;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 28.8), groundMaterial);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.015; root.add(ground);
}
