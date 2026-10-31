import * as THREE from 'three';

// 纸张和连线作为独立层放在板面上，实际内容由剧情核对界面提供。
export function createEvidenceBoard(group) {
  const wood = new THREE.MeshStandardMaterial({ color: '#4e3c2e', roughness: 1 });
  const cork = new THREE.MeshStandardMaterial({ color: '#947453', roughness: 1 });
  const paper = new THREE.MeshStandardMaterial({ color: '#c9b99a', roughness: 1 });
  const ink = new THREE.MeshStandardMaterial({ color: '#786f5e', roughness: 1 });
  const thread = new THREE.MeshStandardMaterial({ color: '#8d3731', roughness: 1 });
  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  block(3.2, 2.6, .14, 0, 1.75, 0, wood);
  block(2.94, 2.34, .04, 0, 1.75, .09, cork);
  const notes = [[-1.05,2.38,.52,.62],[-.32,2.35,.48,.48],[.55,2.32,.56,.66],
    [1.05,1.62,.48,.64],[.1,1.45,.75,.7],[-.85,1.35,.58,.66]];
  for (const [x, y, w, h] of notes) {
    block(w, h, .025, x, y, .13, paper);
    for (let i = 0; i < 4; i++) block(w * .75, .018, .01, x, y + h * .2 - i * h * .13, .148, ink);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), thread);
    pin.position.set(x, y + h * .4, .165); group.add(pin);
  }
  for (const [a, b] of [[0,4],[1,4],[2,3],[2,4],[3,4],[4,5]]) {
    const start = new THREE.Vector3(notes[a][0], notes[a][1] + notes[a][3] * .4, .16);
    const end = new THREE.Vector3(notes[b][0], notes[b][1] + notes[b][3] * .4, .16);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, start.distanceTo(end), 6), thread);
    line.position.copy(start).add(end).multiplyScalar(.5);
    line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); group.add(line);
  }
}
