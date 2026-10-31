import * as THREE from 'three';

// 商品与纸袋各自独立，放在柜台上时保留清楚的轮廓。
export function createStoreProp(group, kind) {
  const materials = {};
  const material = color => materials[color] ||= new THREE.MeshStandardMaterial({ color, roughness: .84 });
  function part(geometry, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  const block = (w, h, d, color, x, y, z) => part(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  if (kind === 'bag') {
    block(.66, .035, .46, '#9e7950', 0, .02, 0);
    for (const z of [-.225, .225]) block(.66, .78, .035, '#b89363', 0, .41, z);
    for (const x of [-.312, .312]) block(.035, .78, .44, '#aa8459', x, .41, 0);
    block(.48, .035, .02, '#8d6c4c', 0, .69, .246);
    return;
  }
  // 面粉纸袋、罐头、面包和鸡蛋盒，排列在柜台同一侧。
  block(.36, .57, .3, '#c7af80', -.72, .285, 0);
  block(.38, .055, .31, '#ae9268', -.72, .59, 0);
  block(.25, .25, .012, '#e5d4ad', -.72, .33, .157);
  block(.19, .035, .014, '#91714c', -.72, .33, .166);
  part(new THREE.CylinderGeometry(.17, .17, .39, 20), '#9a4b3f', -.22, .21, 0);
  for (const y of [.025, .405]) part(new THREE.CylinderGeometry(.175, .175, .025, 20), '#b6afa0', -.22, y, 0);
  block(.25, .17, .014, '#ddcaa4', -.22, .22, .17);
  const bread = part(new THREE.SphereGeometry(1, 16, 10), '#bd8750', .28, .18, 0);
  bread.scale.set(.27, .18, .16);
  for (const x of [.17, .28, .39]) {
    const cut = block(.018, .12, .018, '#e7c28b', x, .27, .13);
    cut.rotation.z = -.45;
  }
  block(.45, .16, .31, '#a9a18b', .78, .08, 0);
  block(.43, .035, .29, '#c2bba6', .78, .17, 0);
  for (const x of [.68, .88]) for (const z of [-.07, .07]) {
    const egg = part(new THREE.SphereGeometry(.06, 10, 8), '#e9dfc5', x, .2, z);
    egg.scale.y = 1.2;
  }
}
