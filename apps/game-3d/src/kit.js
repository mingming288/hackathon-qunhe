import * as THREE from 'three';
import { createActor } from './actor.js';
import { createRoadCar } from './road-car.js';
import { createStoreProp } from './store-props.js';
import { createStoreFixture } from './store-fixtures.js';
import { createBeachBoat } from './beach-boat.js';
import { createBeachToolbox } from './beach-toolbox.js';
import { createOakTree } from './oak-tree.js';
import { createOakKeepsake } from './oak-keepsakes.js';
import { createRoadBus } from './road-bus.js';
import { createPrisonGate } from './prison-gate.js';

export const COLORS = { ink: '#34313e', stone: '#9da5a1', trim: '#ddd2b8', wood: '#947558', steel: '#657781', gold: '#d6ac69' };
export const CHARACTER_NAMES = { andy: '安迪', red: '瑞德', brooks: '老布', guard: '狱警', warden: '典狱长', manager: '超市经理', clerk: '银行职员', tommy: '汤米', haywood: '海伍德', floyd: '弗洛伊德' };

export function box(parent, w, h, d, x, y, z, color, outlined = true) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  if (outlined) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: COLORS.ink, transparent: true, opacity: .32 })));
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent, radius, height, x, y, z, color, segments = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), new THREE.MeshToonMaterial({ color }));
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

export function sphere(parent, radius, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), new THREE.MeshToonMaterial({ color }));
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}

function table(group, width = 2.8, depth = 1.6) {
  box(group, width, .16, depth, 0, 1.18, 0, COLORS.wood);
  for (const x of [-width / 2 + .15, width / 2 - .15]) {
    for (const z of [-depth / 2 + .15, depth / 2 - .15]) box(group, .14, 1.1, .14, x, .55, z, '#5d544b');
  }
}

function shelf(group) {
  box(group, 3.5, 3.4, .15, 0, 1.7, -.43, '#756758');
  for (const x of [-1.7, 1.7]) box(group, .15, 3.5, 1, x, 1.75, 0, COLORS.wood);
  for (let row = 0; row < 4; row++) {
    box(group, 3.5, .14, 1, 0, row * .85 + .08, 0, COLORS.wood);
    for (let i = 0; i < 9; i++) {
      const height = .38 + ((i * 7 + row * 3) % 5) * .055;
      box(group, .24, height, .62, -1.35 + i * .33, row * .85 + .18 + height / 2, .02, ['#83917b', '#b98b69', '#617682', '#c0ac7e'][(i + row) % 4], false);
    }
  }
}

function curtain(group) {
  const width = 2.65, height = 3.45, segments = 64, rows = 10;
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    const v = row / rows, y = .08 + v * height;
    for (let column = 0; column <= segments; column++) {
      const u = column / segments, x = (u - .5) * width;
      const fold = Math.sin(u * Math.PI * 16) * (.065 + .025 * (1 - v));
      positions.push(x, y, fold); uvs.push(u, v);
      if (row && column) {
        const a = (row - 1) * (segments + 1) + column - 1, b = a + segments + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const fabric = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#625849', roughness: 1, side: THREE.DoubleSide }));
  fabric.castShadow = fabric.receiveShadow = true; group.add(fabric);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 3, 16), new THREE.MeshStandardMaterial({ color: '#66543a', metalness: .6, roughness: .55 }));
  rod.rotation.z = Math.PI / 2; rod.position.set(0, 3.63, 0); rod.castShadow = true; group.add(rod);
  for (let i = 0; i < 9; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.085, .012, 6, 12), new THREE.MeshStandardMaterial({ color: '#8a7149', metalness: .6, roughness: .55 }));
    ring.position.set(-1.2 + i * .3, 3.58, 0); ring.rotation.y = Math.PI / 2; group.add(ring);
  }
}

function bookStack(group) {
  const covers = ['#51413a', '#756049', '#495a53', '#774e3c'];
  for (let i = 0; i < covers.length; i++) {
    const book = new THREE.Group();
    book.position.set((i % 2) * .035, i * .16, (i % 3 - 1) * .025);
    book.rotation.y = (i - 1.5) * .075; group.add(book);
    const width = .78 - i * .025, depth = .96 - i * .025;
    box(book, width, .105, depth, 0, .08, 0, '#c5b89a', false);
    for (const y of [.015, .145]) box(book, width + .04, .025, depth + .04, 0, y, 0, covers[i], false);
    box(book, .045, .13, depth + .04, -width / 2, .08, 0, covers[i], false);
    for (const z of [-.25, .25]) box(book, .048, .14, .025, -width / 2, .08, z, '#a98d5d', false);
  }
}

export function makeProp(kind, { sceneId, landmark = false } = {}) {
  const anchor = new THREE.Group(), visual = new THREE.Group(); anchor.add(visual);
  anchor.userData = { assetKey: kind, placeholder: visual, label: CHARACTER_NAMES[kind] || '', targetHeight: 1 };
  if (CHARACTER_NAMES[kind]) {
    const actor = createActor({ skin: ['red', 'brooks'].includes(kind) ? '#a67e60' : '#d6ab82', shirt: kind === 'andy' ? '#8195a1' : kind === 'guard' ? '#657d81' : kind === 'warden' ? '#6d7079' : '#8a9d80', hair: ['red', 'brooks'].includes(kind) ? '#b8b7ad' : '#5a4d43' });
    visual.add(actor); anchor.userData.animate = actor.userData.animate;
  } else if (['desk', 'table'].includes(kind)) table(visual);
  else if (kind === 'chair') {
    box(visual, .9, .14, .9, 0, .65, 0, COLORS.wood); box(visual, .9, 1.1, .12, 0, 1.13, -.4, COLORS.wood);
    for (const x of [-.34, .34]) for (const z of [-.34, .34]) box(visual, .1, .6, .1, x, .3, z, COLORS.steel);
  } else if (kind === 'bed' || kind === 'operatingTable') {
    const medical = kind === 'operatingTable';
    box(visual, 2.1, .22, 3.5, 0, .65, 0, COLORS.steel);
    box(visual, 2, .3, 3.3, 0, .91, 0, medical ? '#b5ceca' : '#b2b0a2');
    box(visual, 1.5, .16, .7, 0, 1.13, -1.1, '#e0d8bf');
    for (const x of [-.9, .9]) for (const z of [-1.5, 1.5]) box(visual, .12, .65, .12, x, .33, z, COLORS.steel);
  } else if (sceneId === 'supermarket' && ['shelf', 'freezer'].includes(kind)) createStoreFixture(visual, kind);
  else if (kind === 'shelf') shelf(visual);
  else if (kind === 'sofa' || kind === 'bench') {
    box(visual, 3.3, .5, 1.2, 0, .65, 0, kind === 'sofa' ? '#8d927e' : COLORS.wood);
    box(visual, 3.3, 1.2, .25, 0, 1.2, -.55, kind === 'sofa' ? '#7e8573' : COLORS.wood);
    for (const x of [-1.3, 1.3]) box(visual, .2, .4, .8, x, .2, 0, COLORS.steel);
  } else if (kind === 'television') {
    box(visual, 2.8, .65, .8, 0, .33, 0, COLORS.wood);
    box(visual, 2.4, 1.65, .55, 0, 1.5, 0, '#444c53');
    box(visual, 2.05, 1.27, .04, 0, 1.53, .3, '#b3c9c6');
  } else if (['poster', 'embroidery', 'evidenceBoard'].includes(kind)) {
    const evidence = kind === 'evidenceBoard';
    box(visual, evidence ? 3.2 : 1.8, 2.6, .13, 0, 1.75, 0, COLORS.wood);
    box(visual, evidence ? 2.95 : 1.6, 2.38, .03, 0, 1.75, .08, kind === 'poster' ? '#b98d70' : '#d9cdab');
    for (let i = 0; i < 4; i++) box(visual, .55, .65, .02, (i % 2 - .5) * .75, 1.2 + Math.floor(i / 2) * .9, .11, ['#9fae9d', '#d7b97a'][i % 2]);
  } else if (kind === 'curtain') {
    curtain(visual);
  } else if (kind === 'safe') {
    box(visual, 1.8, 1.9, 1.3, 0, .95, 0, '#66747a');
    box(visual, 1.6, 1.7, .12, 0, .95, .71, '#8c9997');
    const dial = cylinder(visual, .18, .12, .25, 1.1, .82, COLORS.gold); dial.rotation.x = Math.PI / 2;
  } else if (kind === 'lamp') {
    cylinder(visual, .45, .1, 0, .05, 0, COLORS.steel); cylinder(visual, .055, 2.8, 0, 1.4, 0, COLORS.steel);
    cylinder(visual, .65, .42, 0, 2.85, 0, COLORS.trim);
  } else if (kind === 'radio') {
    box(visual, 1.1, .7, .45, 0, .35, 0, COLORS.wood); box(visual, .5, .4, .03, -.17, .4, .24, '#536064');
    for (const x of [.2, .4]) { const knob = cylinder(visual, .07, .06, x, .24, .27, COLORS.gold); knob.rotation.x = Math.PI / 2; }
  } else if (kind === 'books') bookStack(visual);
  else if (['bible', 'ledger', 'letter'].includes(kind)) {
    box(visual, .75, kind === 'letter' ? .02 : .14, .95, 0, .08, 0, kind === 'bible' ? '#4d5663' : kind === 'ledger' ? '#8c6d56' : '#c9bb92');
  } else if (kind === 'hammer') {
    box(visual, .1, .6, .1, 0, .35, 0, COLORS.wood); box(visual, .5, .18, .17, 0, .65, 0, COLORS.steel);
  } else if (sceneId === 'oak' && ['stone', 'box'].includes(kind)) createOakKeepsake(visual, kind);
  else if (['stone', 'rubble'].includes(kind)) {
    for (let i = 0; i < (kind === 'stone' ? 1 : 6); i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(kind === 'stone' ? .5 : .32), new THREE.MeshToonMaterial({ color: '#7e8078' }));
      rock.position.set(Math.sin(i * 3) * .7, .27, Math.cos(i * 2) * .5); visual.add(rock);
    }
  } else if (kind === 'oak') createOakTree(visual, landmark);
  else if (kind === 'car') createRoadCar(visual);
  else if (kind === 'bus') createRoadBus(visual);
  else if (kind === 'policeCar') createRoadCar(visual, { police: true });
  else if (kind === 'boat') createBeachBoat(visual);
  else if (kind === 'toolbox') createBeachToolbox(visual);
  else if (['pipeTarget', 'drain'].includes(kind)) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 4, 14, 1, true), new THREE.MeshToonMaterial({ color: '#657678', side: THREE.DoubleSide }));
    pipe.rotation.z = Math.PI / 2; pipe.position.y = 1.6; visual.add(pipe);
    const flange = new THREE.Mesh(new THREE.TorusGeometry(1.2, .13, 6, 14), new THREE.MeshToonMaterial({ color: '#9aa39b' }));
    flange.rotation.y = Math.PI / 2; flange.position.set(2, 1.6, 0); visual.add(flange);
  } else if (kind === 'roadSign') {
    cylinder(visual, .07, 2.8, 0, 1.4, 0, COLORS.steel); box(visual, 2.3, .7, .1, 0, 2.6, 0, '#778c7b');
  } else if (['counter', 'freezer', 'medicalCart'].includes(kind)) {
    box(visual, kind === 'counter' ? 4 : 2.5, 1.2, 1.5, 0, .6, 0, kind === 'freezer' ? '#b2cac7' : '#b6b099');
    box(visual, kind === 'counter' ? 4.2 : 2.7, .14, 1.7, 0, 1.28, 0, '#e4d9bd');
  } else if (kind === 'gate') createPrisonGate(visual);
  else if (kind === 'postbox') {
    box(visual, 1.1, 1.7, .9, 0, .85, 0, '#8e6c5c'); box(visual, .7, .08, .03, 0, 1.25, .47, '#393d42');
  } else if (kind === 'mat') box(visual, 1.6, .07, 2.8, 0, .04, 0, '#8f8b73');
  else if (['groceries', 'bag'].includes(kind)) createStoreProp(visual, kind);
  else box(visual, 1, .5, .65, 0, .25, 0, '#b49d76');
  const bounds = new THREE.Box3().setFromObject(visual);
  anchor.userData.targetHeight = Math.max(.1, bounds.max.y - bounds.min.y);
  return anchor;
}

export const PROP_COLLIDERS = {
  bed: [2.2, 3.6], desk: [2.9, 1.7], table: [2.9, 1.7], chair: [.9, .9], shelf: [3.6, 1.1],
  sofa: [3.4, 1.4], bench: [3.4, 1.4], television: [2.9, .9], safe: [1.9, 1.4], curtain: [2.7, .6],
  lamp: [.7, .7], oak: [1.2, 1.2], operatingTable: [2.2, 3.6], medicalCart: [2.6, 1.6],
  counter: [4.3, 1.8], freezer: [2.8, 1.8], car: [2.5, 4.9], policeCar: [2.5, 4.9], bus: [3, 7.2], boat: [2.7, 6.7], postbox: [1.2, 1]
};
