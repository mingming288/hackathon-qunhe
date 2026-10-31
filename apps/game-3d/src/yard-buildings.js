import * as THREE from 'three';
import { box, cylinder } from './kit.js';
import { YARD_BUILDINGS, yardEntrance } from './yard-layout.js';

function sign(parent, text, width, y, z, color) {
  box(parent, width + .18, .95, .18, 0, y, z, '#d6c39c');
  box(parent, width, .78, .03, 0, y, z + .11, color);
  // 命令行的场景检查不依赖浏览器；实际页面使用本机字体绘制中文招牌。
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
  const context = canvas.getContext('2d'); if (!context) return;
  context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fff2cd'; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.font = 'bold 108px "PingFang SC","Microsoft YaHei",sans-serif';
  context.fillText(text, 512, 83, 950);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const lettering = new THREE.Mesh(new THREE.PlaneGeometry(width, .78), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  lettering.position.set(0, y, z + .132); parent.add(lettering);
}

function window(visual, x, y, z, trim) {
  box(visual, 1.75, 2.05, .14, x, y, z, trim);
  box(visual, 1.48, 1.77, .05, x, y, z + .1, '#587b7d');
  box(visual, .07, 1.8, .09, x, y, z + .14, trim);
  box(visual, 1.5, .07, .09, x, y, z + .14, trim);
  box(visual, 1.94, .14, .4, x, y - 1.06, z + .1, '#c7bfaa');
}

function roof(visual, building) {
  const [width, depth, height] = building.size;
  if (building.id === 'library') {
    const rise = 1.6, slope = Math.atan2(rise, width / 2);
    for (const side of [-1, 1]) {
      const panel = box(visual, Math.hypot(width / 2, rise) + .5, .22, depth + .9, side * width / 4, height + rise / 2, 0, building.roof);
      panel.rotation.z = -side * slope;
      const shape = new THREE.Shape().moveTo(-width / 2, 0).lineTo(0, rise).lineTo(width / 2, 0).closePath();
      const gable = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshToonMaterial({ color: building.wall, side: THREE.DoubleSide }));
      gable.position.set(0, height, side * depth / 2); visual.add(gable);
    }
    // 展开的书是图书馆的第二个辨识点，远处也能区别于办公楼。
    for (const side of [-1, 1]) {
      const page = box(visual, .56, .66, .1, side * .29, height + .48, depth / 2 + .16, '#f2e2b6');
      page.rotation.z = side * .13;
    }
  } else {
    box(visual, width + .7, .36, depth + .7, 0, height + .18, 0, building.roof);
    box(visual, width + .2, .16, depth + .2, 0, height - .4, 0, building.trim);
    const clock = cylinder(visual, .5, .1, 0, height - 1.1, depth / 2 + .22, '#e9dec0', 24);
    clock.rotation.x = Math.PI / 2;
    box(visual, .055, .29, .04, 0, height - 1.02, depth / 2 + .29, building.roof);
    box(visual, .24, .055, .04, .09, height - 1.1, depth / 2 + .29, building.roof);
  }
}

function buildingVisual(building) {
  const visual = new THREE.Group(), [width, depth, height] = building.size, front = depth / 2;
  const doorWidth = 2.5, wallWidth = (width - doorWidth) / 2;
  box(visual, width, height, .4, 0, height / 2, -front, building.wall);
  for (const side of [-1, 1]) {
    box(visual, .4, height, depth, side * width / 2, height / 2, 0, building.wall);
    box(visual, wallWidth, height, .4, side * (doorWidth + wallWidth) / 2, height / 2, front, building.wall);
    for (const y of [1.65, 4.95]) window(visual, side * 4.1, y, front + .22, building.trim);
    const door = box(visual, 1.05, 2.8, .12, side * .92, 1.4, front + .15, '#6e6450');
    door.rotation.y = side * .6;
    box(visual, .16, 3.2, .6, side * 1.42, 1.6, front + .1, building.trim);
  }
  box(visual, doorWidth, height - 3.1, .4, 0, 3.1 + (height - 3.1) / 2, front, building.wall);
  box(visual, doorWidth, 3, .05, 0, 1.5, front - .72, '#394a44');
  box(visual, width + .1, .3, depth + .1, 0, .15, 0, '#858d82');
  box(visual, 3.5, .23, 1.8, 0, 3.16, front + .45, building.roof);
  box(visual, 3.7, .055, 2.3, 0, .035, front + .7, '#cfbea0', false);
  sign(visual, building.name, 5.5, 3.97, front + .36, building.roof);
  if (building.id === 'office') window(visual, 0, 5.9, front + .22, building.trim);
  roof(visual, building);
  return visual;
}

export function addYardBuildings(world, ground) {
  for (const building of YARD_BUILDINGS) {
    const anchor = new THREE.Group(), visual = buildingVisual(building);
    anchor.add(visual); anchor.position.set(building.position[0], 0, building.position[1]); anchor.rotation.y = building.rotation;
    anchor.name = building.name;
    anchor.userData = { assetKey: building.assetKey, placeholder: visual, targetHeight: building.size[2] + (building.id === 'library' ? 1.8 : .4) };
    world.root.add(anchor); world.anchors.push(anchor);
    // 入口保留一小段门厅，主体与两侧墙不可穿过。尺寸转换为院子的矩形碰撞。
    const [width, depth, height] = building.size;
    const rectangles = [[width, depth - 1, 0, -.5], [(width - 2.5) / 2, 1, -(width + 2.5) / 4, depth / 2 - .5], [(width - 2.5) / 2, 1, (width + 2.5) / 4, depth / 2 - .5]];
    const cos = Math.cos(building.rotation), sin = Math.sin(building.rotation);
    for (const [w, d, x, z] of rectangles) {
      world.colliders.push({ x: anchor.position.x + x * cos + z * sin, z: anchor.position.z - x * sin + z * cos,
        w: Math.abs(w * cos) + Math.abs(d * sin), d: Math.abs(w * sin) + Math.abs(d * cos), h: height + 1.6, camera: true });
    }
  }
  box(ground, 3.2, .028, 30, 0, .03, -1, '#b9b6a1', false);
  const [left, right] = YARD_BUILDINGS.map(yardEntrance);
  box(ground, right[0] - left[0] + 2.1, .03, 3.2, 0, .035, left[1], '#b9b6a1', false);
  for (const building of YARD_BUILDINGS) {
    const [x, z] = yardEntrance(building);
    box(ground, 3.2, .035, 5.2, x, .045, z, '#c8bfa7', false);
  }
}
