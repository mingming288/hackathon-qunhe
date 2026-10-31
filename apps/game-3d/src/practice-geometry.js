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

export function disposePracticeObject(root) {
  root.traverse(node => {
    node.geometry?.dispose();
    for (const material of [node.material].flat().filter(Boolean)) { material.map?.dispose(); material.dispose(); }
  });
  root.removeFromParent();
}
