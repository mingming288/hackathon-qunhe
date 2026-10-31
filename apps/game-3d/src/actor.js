import * as THREE from 'three';

export function createActor({ skin = '#d7a77b', shirt = '#8195a1', hair = '#694b39' } = {}) {
  const root = new THREE.Group();
  const ink = new THREE.MeshBasicMaterial({ color: '#30283e', side: THREE.BackSide });
  const limbs = [];
  function piece(geometry, color, x, y, z, parent = root) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color }));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    const edge = new THREE.Mesh(geometry, ink);
    edge.scale.setScalar(1.045);
    mesh.add(edge);
    parent.add(mesh);
    return mesh;
  }
  piece(new THREE.BoxGeometry(.58, .63, .35), shirt, 0, 1.11, 0);
  const head = piece(new THREE.SphereGeometry(.46, 12, 10), skin, 0, 1.99, 0);
  head.scale.set(.9, 1.18, .86);
  const hairCap = piece(new THREE.SphereGeometry(.45, 10, 8), hair, 0, 2.28, -.035);
  hairCap.scale.set(.94, .65, .9);
  [-1, 1].forEach(side => {
    piece(new THREE.SphereGeometry(.07, 10, 8), '#f8efda', side * .15, 2.03, .356);
    piece(new THREE.SphereGeometry(.034, 8, 6), '#33283c', side * .15, 2.02, .414);
    const leg = new THREE.Group(); leg.position.set(side * .17, .81, 0); root.add(leg);
    piece(new THREE.BoxGeometry(.21, .65, .24), '#48596d', 0, -.32, 0, leg);
    piece(new THREE.BoxGeometry(.25, .15, .4), '#4c3d36', 0, -.71, .065, leg);
    const arm = new THREE.Group(); arm.position.set(side * .38, 1.35, 0); root.add(arm);
    piece(new THREE.BoxGeometry(.16, .58, .19), shirt, 0, -.27, 0, arm);
    piece(new THREE.SphereGeometry(.11, 8, 6), skin, 0, -.61, 0, arm);
    limbs.push({ leg, arm, side });
  });
  root.userData.animate = (time, speed) => {
    const amplitude = Math.min(speed, 1) * .5;
    limbs.forEach(({ leg, arm, side }) => {
      leg.rotation.x = Math.sin(time * 9) * amplitude * side;
      arm.rotation.x = -Math.sin(time * 9) * amplitude * side;
    });
  };
  return root;
}
