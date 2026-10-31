import * as THREE from 'three';

export function block(parent, w, h, d, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshToonMaterial({ color }));
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

export function lettering(parent, text, x, y, z, width = 1.5, height = .25) {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f1e7cd'; ctx.fillRect(0, 0, 768, 128);
  ctx.fillStyle = '#354c45'; ctx.font = '600 66px "PingFang SC", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 384, 66, 735);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, transparent: true }));
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

function disk(parent, radius, x, y, z, color) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .09, 24), new THREE.MeshToonMaterial({ color }));
  mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

export function hammerModel() {
  const root = new THREE.Group();
  block(root, .16, 1.25, .17, 0, -.12, 0, '#906a4e');
  block(root, .76, .25, .33, .08, .52, 0, '#7d8d8c');
  block(root, .2, .23, .28, -.39, .52, 0, '#b9c0b0'); return root;
}

export function bookModel(color = '#6d796e', cavity = false, title = '圣经') {
  const root = new THREE.Group();
  block(root, 1.3, 1.8, .13, 0, 0, -.09, color);
  block(root, 1.2, 1.68, .17, 0, 0, .05, '#e7dabb');
  if (cavity) block(root, .87, 1.45, .025, 0, 0, .15, '#485247');
  const cover = new THREE.Group(); cover.position.set(-.65, 0, .2); root.add(cover);
  block(cover, 1.3, 1.8, .07, .65, 0, 0, color);
  lettering(cover, title, .65, .3, .05, 1, .2);
  root.userData.cover = cover; return root;
}

function gearModel() {
  const gear = new THREE.Group(); disk(gear, .35, 0, 0, 0, '#b99b61');
  for (let i = 0; i < 12; i++) {
    const tooth = block(gear, .15, .2, .12, Math.sin(i * Math.PI / 6) * .36, Math.cos(i * Math.PI / 6) * .36, 0, '#b99b61');
    tooth.rotation.z = -i * Math.PI / 6;
  }
  disk(gear, .1, 0, 0, .08, '#3d5551'); return gear;
}

export function createPracticeModel(kind) {
  const root = new THREE.Group(), parts = {};
  const control = (name, object) => { object.userData.control = name; parts[name] = object; root.add(object); return object; };
  block(root, 6.2, 3.7, .1, 0, -.05, -.65, '#d9cfb7');
  if (kind === 'wall') {
    const wall = new THREE.Group();
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
      block(wall, .85, .49, .18, (col - 2) * .9 + row % 2 * .12, (row - 1.5) * .54, 0, row % 2 ? '#a7aaa0' : '#b8b7a8');
    }
    const crack = new THREE.Group(); wall.add(crack); parts.crack = crack;
    for (let i = 0; i < 5; i++) {
      const line = block(crack, .035, .35, .025, Math.sin(i * 2) * .13, .75 - i * .32, .11, '#4b574b'); line.rotation.z = Math.sin(i) * .5;
    }
    const dust = block(wall, 4.2, 2.3, .02, 0, 0, .15, '#c3bda6');
    dust.material.transparent = true; dust.material.opacity = .7; parts.dust = dust;
    lettering(root, '砂浆裂缝', 0, 1.45, .2, 1.4, .24); control('wall', wall);
  } else if (kind === 'radio') {
    block(root, 3.7, 1.95, .35, .25, .3, -.25, '#7a705d');
    const cover = block(root, 3.55, 1.8, .08, .25, .3, .12, '#8e8c74'); parts.cover = cover;
    lettering(cover, '旋钮空转，指针没有动', 0, 0, .05, 2.8, .24);
    disk(root, .4, .1, .35, -.01, '#63766a');
    disk(root, .11, .1, .35, .11, '#d6d9c3');
    lettering(root, '空轴', .1, .95, .13, .7, .2);
    control('gear', gearModel());
    const dial = new THREE.Group(); disk(dial, .37, 0, 0, .15, '#536c62');
    block(dial, .045, .27, .04, 0, .13, .23, '#e6c47f'); dial.position.set(2.2, -.85, 0); control('dial', dial);
    block(root, 2.7, .17, .08, -.2, 1.4, 0, '#43584e');
    parts.needle = block(root, .045, .28, .08, 0, 1.4, .08, '#e2b45e');
    lettering(root, '调谐旋钮', 2.05, -1.45, .2, 1.2, .21);
  } else if (kind === 'hide') {
    parts.book = bookModel('#6a7763', true); parts.book.position.x = -.75; root.add(parts.book);
    control('hammer', hammerModel());
    lettering(root, '书页凹槽', -.75, 1.35, .2, 1.3, .22);
    lettering(root, '石锤', 1.8, 1.35, .2, .8, .22);
  } else {
    control('item', kind === 'hammer' ? hammerModel() : bookModel('#71836d', true));
    block(root, 2.65, .45, .08, 0, -1.6, .02, '#9bab8c');
    lettering(root, '查看后，拖到这里接过收好', 0, -1.6, .09, 2.5, .22);
  }
  return { root, parts, update(state) {
    if (kind === 'wall') { parts.crack.scale.setScalar(.65 + state.rubbed * .35); parts.dust.material.opacity = .7 * (1 - state.rubbed); }
    if (kind === 'radio') {
      parts.cover.visible = !state.open; parts.gear.visible = state.open;
      parts.gear.position.set(state.gear.x, state.gear.y, .22);
      parts.gear.rotation.z = state.seated ? -state.frequency * .07 : 0;
      parts.dial.rotation.z = -state.frequency * .05;
      parts.needle.position.x = state.seated ? -1.5 + state.frequency / 100 * 2.6 : -1.5;
    }
    if (kind === 'hide') {
      parts.book.userData.cover.rotation.y = state.open ? -2.25 : 0;
      parts.hammer.position.set(state.hammer.x, state.hammer.y, state.placed ? .21 : .4);
      parts.hammer.rotation.z = state.hammer.angle; parts.hammer.visible = !state.closed;
    }
    if (kind === 'hammer' || kind === 'bible') {
      parts.item.position.set(state.x, state.y, .3); parts.item.rotation.y = state.angle;
      if (kind === 'bible') parts.item.userData.cover.rotation.y = state.viewed ? -1.9 : 0;
    }
  } };
}

export function disposePracticeObject(root) {
  root.traverse(node => {
    node.geometry?.dispose();
    for (const material of [node.material].flat().filter(Boolean)) { material.map?.dispose(); material.dispose(); }
  });
  root.removeFromParent();
}
