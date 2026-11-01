import * as THREE from 'three';
import { cellDoorTransform } from './navigation.js';
import { SCENE_BY_ID } from './scenes.js';
import { addCorridorDetails } from './corridor-details.js';

export { cellDoorTransform } from './navigation.js';

function asset(root, anchors, key, position, clipPlane) {
  const anchor = new THREE.Group(), placeholder = new THREE.Group(); anchor.add(placeholder);
  anchor.position.set(...position);
  anchor.userData = { assetKey: key, placeholder, targetHeight: 4, clipPlane };
  root.add(anchor); anchors.push(anchor);
}

export function addCellVista(world) {
  const transform = cellDoorTransform();
  const root = new THREE.Group(); root.name = '走廊门内的牢房';
  root.rotation.y = -Math.PI / 2; root.position.set(transform.x, 0, transform.z); world.root.add(root);
  const clip = new THREE.Plane(new THREE.Vector3(1, 0, 0), -6.25);
  world.vistaAnchors ||= [];
  asset(root, world.vistaAnchors, 'cell-architecture', [0, 0, 0], clip);
  const cell = SCENE_BY_ID.get('cell');
  for (const [kind, x, z] of cell.props.filter(([name]) => ['bed', 'desk', 'chair'].includes(name))) {
    asset(root, world.vistaAnchors, 'cell:' + kind, [x, 0, z], clip);
  }
}

export function addCellCorridorVista(world) {
  const transform = cellDoorTransform();
  const root = new THREE.Group(); root.name = '牢房门外的走廊';
  root.rotation.y = Math.PI / 2; root.position.set(-transform.z, 0, transform.x); world.root.add(root);
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), -6.35);
  world.vistaAnchors ||= [];
  asset(root, world.vistaAnchors, 'cellCorridor-architecture', [0, 0, 0], clip);
  const details = addCorridorDetails(root);
  details.traverse(node => {
    if (!node.isMesh) return;
    for (const material of [node.material].flat()) { material.clippingPlanes = [clip]; material.clipShadows = true; }
  });
}
