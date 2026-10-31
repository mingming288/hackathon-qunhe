import * as THREE from 'three';
import { box, cylinder, makeProp, PROP_COLLIDERS, COLORS, CHARACTER_NAMES } from './kit.js';
import { SCENE_BY_ID } from './scenes.js';
import { PORTALS } from './navigation.js';
import { addYardBuildings } from './yard-buildings.js';
import { YARD_BUILDINGS } from './yard-layout.js';

const TONES = {
  warm: ['#d4c8ad', '#a9a18d', '#eee3c9'], dark: ['#a3ada5', '#6f7e7c', '#cccbb6'],
  earth: ['#beab8b', '#8f806a', '#d6c4a4'], night: ['#7c9398', '#5b737c', '#b0c5c7'],
  field: ['#d9d9b4', '#a0ae83', '#f0e7c8'], coast: ['#e4d9b4', '#c9ba91', '#f8ebc9'],
  clinical: ['#cbd7d0', '#99aaa5', '#edf0d8'], default: ['#c9cbb5', '#929e96', '#e7dfc8']
};

export function createWorld(config, { includeCharacters = true, includeHelpers = true } = {}) {
  const root = new THREE.Group(), architecture = new THREE.Group(); root.add(architecture);
  const shell = new THREE.Group(); architecture.add(shell);
  architecture.userData = { assetKey: config.id + '-architecture', placeholder: shell, targetHeight: 4 };
  const [background, wallColor, floorColor] = TONES[config.tone] || TONES.default;
  const world = { root, config, colliders: [], anchors: [architecture], portals: [], animations: [], background, fog: background };
  const [width, depth] = config.size;
  box(shell, width + 1, .35, depth + 1, 0, -.2, 0, floorColor);
  if (includeHelpers) {
    const grid = new THREE.GridHelper(Math.max(width, depth), Math.round(Math.max(width, depth)), '#aca991', '#c2bca4');
    grid.position.y = .005; grid.material.transparent = true; grid.material.opacity = .18; shell.add(grid);
  }

  function obstacle(w, h, d, x, z, color = wallColor, y = h / 2) {
    const mesh = box(shell, w, h, d, x, y, z, color);
    world.colliders.push({ x, z, w, d, h: y + h / 2, camera: h > 2.7 });
    return mesh;
  }
  function prop(kind, x, z, angle = 0) {
    if (!includeCharacters && Object.hasOwn(CHARACTER_NAMES, kind)) return null;
    const anchor = makeProp(kind); anchor.position.set(x, 0, z); anchor.rotation.y = angle;
    if (['hammer', 'bible', 'books', 'ledger', 'letter', 'bag', 'groceries'].includes(kind)) anchor.position.y = 1.32;
    root.add(anchor); world.anchors.push(anchor);
    if (anchor.userData.animate) world.animations.push(anchor);
    let dimensions = PROP_COLLIDERS[kind];
    if (anchor.userData.label) dimensions = [1, 1];
    if (dimensions) {
      const rotated = Math.abs(Math.sin(angle)) > .7;
      world.colliders.push({ x, z, w: dimensions[rotated ? 1 : 0], d: dimensions[rotated ? 0 : 1], h: anchor.userData.targetHeight, camera: false });
    }
    return anchor;
  }
  function windowFrame(x, z) {
    box(shell, 2.2, 2, .1, x, 2.4, z, '#b8cfca');
    for (let i = -1; i <= 1; i++) box(shell, .075, 2.1, .2, x + i * .6, 2.4, z + .1, COLORS.steel);
    box(shell, 2.35, .12, .3, x, 1.35, z + .12, COLORS.trim);
  }
  function tower(x, z) {
    obstacle(2.7, 7.5, 2.7, x, z, '#8d9995');
    box(shell, 4, 2, 4, x, 8, z, COLORS.trim);
    box(shell, 4.4, .3, 4.4, x, 9.1, z, COLORS.steel);
    for (const side of [-1, 1]) box(shell, 3.6, 1.1, .05, x, 8, z + side * 2.02, '#6e9299');
  }
  function building(x, z, w = 6, d = 8, h = 9) {
    obstacle(w, h, d, x, z, '#a5ada3');
    box(shell, w + .3, .3, d + .3, x, h + .15, z, COLORS.trim);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) box(shell, 1, 1.5, .08, x + (col - .5) * w * .43, 1.8 + row * 2.7, z + d / 2 + .06, '#68858d');
    }
  }

  if (config.kind === 'corridor') {
    // 与双侧门洞模型共用墙体尺寸，入口只保留墙垛碰撞。
    const centers = [-11.2, -5.6, 0, 5.6, 11.2];
    for (const x of [-6.1, 6.1]) {
      let start = -14;
      for (const center of centers) {
        const end = center - 1.1;
        obstacle(.6, 4, end - start, x, (start + end) / 2);
        box(shell, .6, .93, 2.2, x, 3.535, center, wallColor);
        start = center + 1.1;
      }
      obstacle(.6, 4, 14 - start, x, (start + 14) / 2);
    }
    obstacle(12.8, 4, .6, 0, -14.1);
  } else if (config.id === 'cell') {
    // 牢房源模型朝镜头侧敞开；以房间边界限制移动，墙体碰撞对齐内部墙面。
    obstacle(12.4, 4, .5, 0, -6.2);
    obstacle(.5, 4, 12.4, -6.1, 0);
    obstacle(.5, 4, 12.4, 6.1, 0);
  } else if (config.id === 'library') {
    obstacle(21.6, 4, .5, 0, -10);
    obstacle(.5, 4, 20, -10.75, 0);
    obstacle(.5, 4, 20, 10.75, 0);
  } else if (config.kind === 'room') {
    obstacle(width, 4, .4, 0, -depth / 2);
    obstacle(.4, 4, depth, -width / 2, 0); obstacle(.4, 4, depth, width / 2, 0);
    // 镜头侧保留中央开口，墙体仍有实体碰撞；后续可用同尺寸建筑模型替换。
    const sideWidth = (width - 4) / 2;
    obstacle(sideWidth, 2.1, .4, -(width + 4) / 4, depth / 2);
    obstacle(sideWidth, 2.1, .4, (width + 4) / 4, depth / 2);
    windowFrame(0, -depth / 2 + .25);
    if (config.id === 'livingRoom') box(shell, 5.2, .035, 3.5, 0, .025, -.8, '#b5aa8c');
    if (config.id === 'supermarket') {
      for (let x = -10; x <= 10; x += 2) box(shell, .03, .015, depth - 1, x, .02, 0, '#c4cabb', false);
    }
  } else if (config.kind === 'yard') {
    obstacle(width, 6, .6, 0, -depth / 2); obstacle(.6, 6, depth, -width / 2, 0); obstacle(.6, 6, depth, width / 2, 0);
    const towerOffset = width / 2 - 2.5;
    tower(-towerOffset, -depth / 2 + 2.5); tower(towerOffset, -depth / 2 + 2.5);
    if (config.id === 'yard') addYardBuildings(world, shell);
    else {
      building(-width / 2 + 6, -depth / 2 + 9, 6, 10, 10);
      building(width / 2 - 6, -depth / 2 + 9, 6, 10, 10);
    }
    box(shell, 5, 4.4, .25, 0, 2.2, -depth / 2 + .4, '#576e72');
    for (let i = -3; i <= 3; i++) box(shell, .07, 4.5, .35, i * .7, 2.25, -depth / 2 + .6, COLORS.trim);
    cylinder(shell, 1, 14, -width / 2 + 7, 7, -depth / 2 + 5, '#ad9074');
  } else if (config.kind === 'tunnel' || config.kind === 'maze') {
    obstacle(.6, 3.2, depth, -width / 2, 0, '#7a8077'); obstacle(.6, 3.2, depth, width / 2, 0, '#7a8077');
    obstacle(width, 3.2, .6, 0, -depth / 2, '#7a8077');
    for (let z = -depth / 2 + 2; z < depth / 2; z += 4) {
      for (const side of [-1, 1]) cylinder(shell, .12, 3.5, side * (width / 2 - .5), 1.75, z, '#a3ab9d');
      // 基础版采用顶部剖视，支撑梁只保留两侧，保证第三人称镜头能看见主角。
      for (const side of [-1, 1]) box(shell, 1.4, .2, .25, side * (width / 2 - 1), 3.4, z, '#a3ab9d');
    }
    if (config.kind === 'maze') {
      [[-5, 4, 1, 15], [5, -4, 1, 15], [-9, -6, 7, 1], [9, 7, 7, 1], [0, -11, 9, 1]].forEach(([x, z, w, d]) => obstacle(w, 2.3, d, x, z, '#647b7c'));
      for (const x of [-9, 0, 9]) box(shell, .8, .04, depth - 3, x, .03, 0, '#8ba6a0', false);
    }
    if (config.id === 'dig') {
      for (let i = 0; i < 9; i++) box(shell, .8, .5 + i % 3 * .2, .8, (i % 2 ? -1 : 1) * (width / 2 - 1), .25, -depth / 2 + 2 + i * 2, '#958267');
    }
  } else if (config.kind === 'field') {
    for (let z = -12; z < 11; z += 1.5) box(shell, .8, .7, 1.4, -6, .35, z, '#9a9b87');
    for (let i = 0; i < 12; i++) prop('oak', (i % 2 ? -1 : 1) * (width / 2 - 3), -depth / 2 + 3 + Math.floor(i / 2) * 5);
    box(shell, 2, .02, depth, 0, .02, 0, '#c1b58f', false);
  } else if (config.kind === 'road') {
    box(shell, 9, .04, depth, 0, .03, 0, '#87908d', false);
    for (let z = -depth / 2; z < depth / 2; z += 4) box(shell, .12, .02, 1.8, 0, .06, z, '#e2d4aa', false);
    building(-13, -8); building(13, -9); building(-13, 6, 6, 6, 6);
    for (const x of [-7, 7]) for (const z of [-17, 12]) prop('oak', x, z);
  } else if (config.kind === 'beach') {
    box(shell, width, .04, 11, 0, .01, -depth / 2 + 5.5, '#7eaeb2', false);
    world.colliders.push({ x: 0, z: -depth / 2 + 5.5, w: width, d: 11, h: .1, camera: false });
    for (let i = 0; i < 7; i++) box(shell, width, .01, .05, 0, .045, -depth / 2 + 2 + i * 1.3, '#b8d7ca', false);
    prop('oak', 15, 8); prop('oak', -15, 10);
  } else if (config.kind === 'rain') {
    obstacle(width, 5, .7, 0, -depth / 2, '#657b83');
    const positions = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      positions[i * 3] = Math.sin(i * 133.1) * width / 2;
      positions[i * 3 + 1] = (i * .137) % 12;
      positions[i * 3 + 2] = Math.cos(i * 71.7) * depth / 2;
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    world.rain = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#d9e6d8', size: .065, transparent: true, opacity: .6 }));
    root.add(world.rain);
    for (let i = 0; i < 6; i++) {
      const puddle = cylinder(shell, 2, .015, Math.sin(i * 4) * 12, .015, Math.cos(i * 3) * 11, '#8fa8a6', 20); puddle.scale.z = .5;
    }
  }
  config.props.forEach(([kind, x, z, rotation]) => prop(kind, x, z, rotation));
  if (config.id === 'yard') {
    prop('gate', 0, -17); prop('warden', 0, -7);
    prop('tommy', -3, 2); prop('haywood', -10, 4); prop('floyd', 8, 4);
    const soil = prop('rubble', -10, 7); soil.userData.assetKey = 'soilSpot';
  }
  if (includeHelpers) config.links.forEach((targetId, index) => {
    const target = SCENE_BY_ID.get(targetId);
    const marker = new THREE.Group();
    const placement = PORTALS[config.id]?.[targetId] || [(index - (config.links.length - 1) / 2) * 3.2, depth / 2 - 2.4];
    marker.position.set(placement[0], 0, placement[1]); marker.rotation.y = placement[2] || 0;
    const exterior = config.id === 'yard' && YARD_BUILDINGS.find(building => building.id === targetId);
    if (exterior) marker.userData = { exteriorKey: exterior.assetKey, labelHeight: 1.1 };
    else if (config.id !== 'yard') {
      for (const side of [-1, 1]) box(marker, .13, 3, .15, side * 1.05, 1.5, 0, COLORS.steel);
      box(marker, 2.3, .15, .2, 0, 3, 0, COLORS.trim);
    }
    cylinder(marker, .5, .04, 0, .025, 0, COLORS.gold, 24);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.62, .035, 6, 24), new THREE.MeshBasicMaterial({ color: '#f4e4b8' }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .09; marker.add(ring); root.add(marker);
    world.portals.push({ id: targetId, name: target.name, object: marker, ring });
  });
  return world;
}

export function disposeWorld(world) {
  // 载入的模型由缓存持有；只释放本次构造的基础几何和材质。
  function release(node) {
    if (node.userData.externalAsset) return;
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    materials.forEach(material => { material.map?.dispose(); material.dispose(); });
    node.children.forEach(release);
  }
  release(world.root); world.root.removeFromParent(); world.root.clear();
}
