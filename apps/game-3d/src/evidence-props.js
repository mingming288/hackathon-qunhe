import * as THREE from 'three';

// 桌面和信件分离，维持原有道具位置与交互范围。
export function createEvidenceProp(group, kind) {
  const wood = new THREE.MeshStandardMaterial({ color: '#66503a', roughness: .9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#3c3730', roughness: .9 });
  const metal = new THREE.MeshStandardMaterial({ color: '#8d7c60', roughness: .55, metalness: .55 });
  const paper = new THREE.MeshStandardMaterial({ color: '#d2c3a0', roughness: 1 });
  const red = new THREE.MeshStandardMaterial({ color: '#784438', roughness: .8, metalness: .25 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  if (kind === 'desk') {
    block(2.8, .14, 1.6, 0, 1.19, 0, wood);
    block(2.68, .07, 1.5, 0, 1.285, 0, wood);
    for (const x of [-1.2, 1.2]) for (const z of [-.6, .6]) block(.15, 1.2, .15, x, .6, z, dark);
    block(2.4, .34, .1, 0, 1.02, .68, wood);
    for (const x of [-.75, 0, .75]) {
      block(.68, .24, .06, x, 1.03, .75, wood);
      block(.16, .04, .05, x, 1.03, .8, metal);
    }
    return;
  }
  if (kind === 'ledger') {
    block(.78, .13, .98, 0, .08, 0, paper);
    for (const y of [.01, .16]) block(.82, .035, 1.02, 0, y, 0, wood);
    block(.055, .16, 1.02, -.39, .08, 0, dark);
    for (const z of [-.32, .32]) block(.06, .17, .04, -.39, .08, z, metal);
    block(.42, .01, .25, .08, .18, -.1, paper);
    return;
  }
  if (kind === 'letter') {
    block(.75, .035, .95, 0, .025, 0, paper);
    for (let i = 0; i < 5; i++) block(.52 - i * .025, .005, .015, 0, .046, -.28 + i * .105, dark);
    block(.12, .008, .12, .22, .048, .29, red);
    return;
  }
  // 投递口、检修门及底座均可从玩家视角辨识。
  block(1.05, 1.48, .8, 0, .84, 0, red);
  block(1.17, .13, .92, 0, 1.63, 0, red);
  block(1.2, .15, .95, 0, .075, 0, dark);
  block(.7, .11, .035, 0, 1.28, .42, dark);
  block(.7, .66, .035, 0, .7, .42, dark);
  block(.61, .57, .025, 0, .7, .45, red);
  block(.08, .08, .035, .22, .7, .48, metal);
  block(.44, .16, .025, 0, 1.08, .43, paper);
}
