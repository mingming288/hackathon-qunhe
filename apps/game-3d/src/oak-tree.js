import * as THREE from 'three';

// 共享树干、枝桠与树冠几何，背景树复用同一套低绘制次数的结构。
export function createOakTree(group, landmark = false) {
  const bark = new THREE.MeshStandardMaterial({ color: '#665745', roughness: 1 });
  const leaves = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.36, .6, 3.7, 9, 1), bark);
  trunk.position.y = 1.85; trunk.castShadow = trunk.receiveShadow = true; group.add(trunk);
  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(.11, .24, 1, 7), bark, 8);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leaves, 17);
  const transform = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 8; i++) {
    const spread = landmark ? 2.2 : 1.7;
    const angle = i * Math.PI / 4, direction = new THREE.Vector3(Math.cos(angle) * spread, 1.5 + (i % 3) * .2, Math.sin(angle) * spread);
    transform.position.set(direction.x / 2, 3.05 + direction.y / 2, direction.z / 2);
    transform.quaternion.setFromUnitVectors(up, direction.clone().normalize());
    transform.scale.set(1, direction.length(), 1); transform.updateMatrix(); branches.setMatrixAt(i, transform.matrix);
  }
  const palette = ['#75845f', '#687c59', '#89936b', '#667a58'];
  for (let i = 0; i < 17; i++) {
    const angle = i * 2.39996, ring = (i === 0 ? 0 : 1.05 + (i % 3) * .46) * (landmark ? 1.3 : 1);
    transform.position.set(Math.cos(angle) * ring, 5.05 + (i % 4) * .27, Math.sin(angle) * ring);
    transform.quaternion.identity(); transform.scale.set(1.05 + (i % 3) * .15, .78 + (i % 2) * .12, .95 + (i % 3) * .1);
    transform.updateMatrix(); crowns.setMatrixAt(i, transform.matrix); crowns.setColorAt(i, new THREE.Color(palette[i % palette.length]));
  }
  for (const mesh of [branches, crowns]) {
    mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  crowns.instanceColor.needsUpdate = true;
}
