import * as THREE from 'three';

// 超市货架和冰柜沿用原碰撞尺寸；重复商品合批，避免增加大量绘制调用。
export function createStoreFixture(group, kind) {
  const materials = {};
  const mat = color => materials[color] ||= new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: .08 });
  function box(w, h, d, x, y, z, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  if (kind === 'freezer') {
    box(2.5, 1.12, 1.5, 0, .56, 0, '#9caeaa');
    box(2.58, .1, 1.58, 0, 1.17, 0, '#d3d6c6');
    for (const x of [-.62, .62]) {
      box(1.08, .03, 1.18, x, 1.235, 0, '#556b6a');
      box(.5, .045, .055, x, 1.26, .46, '#c6c4ad');
    }
    box(2.26, .04, .03, 0, .2, .765, '#71837c');
    for (const x of [-1.05, 1.05]) box(.22, .1, 1.1, x, .05, 0, '#4a5550');
    return;
  }
  box(3.45, .17, .95, 0, .1, 0, '#63716b');
  box(3.38, 3.3, .09, 0, 1.76, -.43, '#aab2a1');
  for (const x of [-1.68, 1.68]) box(.12, 3.45, .95, x, 1.73, 0, '#718078');
  for (let row = 0; row < 4; row++) {
    const y = .2 + row * .79;
    box(3.35, .1, .95, 0, y, 0, '#83938a');
    box(3.32, .065, .025, 0, y + .055, .48, '#d6d0b5');
  }
  const cartons = new THREE.InstancedMesh(new THREE.BoxGeometry(.24, .42, .34), mat('#d3bd91'), 24);
  const cans = new THREE.InstancedMesh(new THREE.CylinderGeometry(.1, .1, .31, 12), mat('#9b5d4c'), 24);
  const transform = new THREE.Object3D();
  let cartonIndex = 0, canIndex = 0;
  for (let row = 0; row < 4; row++) for (let column = 0; column < 12; column++) {
    const y = .25 + row * .79;
    const carton = (column + row) % 2 === 0;
    transform.position.set(-1.46 + column * .265, y + (carton ? .21 : .155), .16);
    transform.updateMatrix();
    (carton ? cartons : cans).setMatrixAt(carton ? cartonIndex++ : canIndex++, transform.matrix);
  }
  for (const batch of [cartons, cans]) {
    batch.castShadow = batch.receiveShadow = true;
    batch.instanceMatrix.needsUpdate = true;
    group.add(batch);
  }
}
