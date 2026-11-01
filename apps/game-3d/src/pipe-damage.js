import * as THREE from 'three';

// 裂纹和破口是叠加在管道外表面的演出层，不改变剧情交互与碰撞。
export function createPipeDamage(anchor) {
  const root = new THREE.Group(); root.name = '管道破损演出'; anchor.add(root);
  const crack = new THREE.Group(), opening = new THREE.Group(); root.add(crack, opening);
  const lines = [[[-.24, .65], [-.08, .35], [-.17, .12], [.08, -.06], [-.04, -.36], [.13, -.62]],
    [[-.08, .35], [.24, .23], [.42, .32]], [[.08, -.06], [.36, -.18], [.5, -.09]]];
  for (const side of [-1, 1]) {
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const from = new THREE.Vector3(line[i - 1][0] + .65, line[i - 1][1] + 1.6, side * 1.18);
        const to = new THREE.Vector3(line[i][0] + .65, line[i][1] + 1.6, side * 1.18);
        const direction = to.clone().sub(from);
        const segment = new THREE.Mesh(new THREE.CylinderGeometry(.026, .026, direction.length(), 6), new THREE.MeshBasicMaterial({ color: '#171a16' }));
        segment.position.copy(from).add(to).multiplyScalar(.5);
        segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); crack.add(segment);
      }
    }
    const shape = new THREE.Shape();
    [[-.63, .14], [-.46, .48], [-.16, .41], [.04, .62], [.36, .46], [.59, .2], [.46, -.12], [.58, -.35], [.19, -.49], [-.1, -.39], [-.34, -.55], [-.58, -.26]].forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const hole = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#101715', side: THREE.DoubleSide }));
    hole.position.set(.65, 1.6, side * 1.18); opening.add(hole);
  }
  function setHits(hits) { crack.visible = hits >= 3 && hits < 5; opening.visible = hits >= 5; }
  setHits(0);
  return { root, setHits };
}
