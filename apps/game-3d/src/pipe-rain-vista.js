import * as THREE from 'three';
import { PORTALS } from './navigation.js';
import { SCENE_BY_ID } from './scenes.js';

// 管网出口和雨夜排水口相对：远景只显示墙外地面，不携带剧情对象。
export function addPipeRainVista(world) {
  const [exitX] = PORTALS.pipeNetwork.rain;
  const drainZ = SCENE_BY_ID.get('rain').props.find(([kind]) => kind === 'drain')[2] - .8;
  const openingZ = -world.config.size[1] / 2;
  const root = new THREE.Group(); root.name = '管网外的雨夜';
  root.position.set(exitX, 0, openingZ + drainZ); root.rotation.y = Math.PI;
  world.root.add(root);
  const anchor = new THREE.Group(), placeholder = new THREE.Group();
  anchor.add(placeholder);
  anchor.userData = { assetKey: 'rain-architecture', placeholder, targetHeight: 4,
    clipPlane: new THREE.Plane(new THREE.Vector3(0, 0, -1), -15.85) };
  root.add(anchor); world.vistaAnchors = [anchor];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 32), new THREE.MeshStandardMaterial({ color: '#454e50', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.3; root.add(ground);
  const positions = new Float32Array(350 * 3);
  for (let i = 0; i < 350; i++) {
    positions[i * 3] = exitX + Math.sin(i * 73.2) * 12;
    positions[i * 3 + 1] = (i * .137) % 12;
    positions[i * 3 + 2] = -16 - (i * .173) % 20;
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  world.rain = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#d9e6d8', size: .065, transparent: true, opacity: .6 }));
  world.root.add(world.rain);
}
