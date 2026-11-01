import * as THREE from 'three';

// 旧船分为船壳、内侧肋骨和座板，尺寸与海滩中的既有碰撞范围一致。
export function createBeachBoat(group) {
  const wood = new THREE.MeshStandardMaterial({ color: '#75644f', roughness: .95 });
  const dark = new THREE.MeshStandardMaterial({ color: '#4e463a', roughness: 1 });
  const trim = new THREE.MeshStandardMaterial({ color: '#90806a', roughness: .95 });
  const planks = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  const sections = [
    [-3.18, .08, .38], [-2.8, .54, .18], [-2.1, .95, .08], [-1.2, 1.18, .03],
    [0, 1.25, .02], [1.2, 1.15, .03], [2.1, .93, .09], [2.8, .68, .18], [3.15, .55, .27],
  ];
  function width(section, height) { return section[1] * (.28 + .72 * height); }
  function point(section, side, height, inset = 0) {
    return new THREE.Vector3(side * Math.max(0, width(section, height) - inset), section[2] + height * .91, section[0]);
  }
  const positions = [], colors = [];
  const shades = ['#6e7063', '#6b5948', '#77705f', '#555d54'];
  for (const side of [-1, 1]) for (let level = 0; level < 4; level++) {
    for (let i = 0; i < sections.length - 1; i++) {
      const a = point(sections[i], side, level / 4), b = point(sections[i + 1], side, level / 4);
      const c = point(sections[i], side, (level + 1) / 4), d = point(sections[i + 1], side, (level + 1) / 4);
      const color = new THREE.Color(shades[(i + level * 2) % shades.length]);
      for (const p of [a, b, c, b, d, c]) { positions.push(p.x, p.y, p.z); colors.push(color.r, color.g, color.b); }
    }
  }
  const hullGeometry = new THREE.BufferGeometry();
  hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  hullGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  hullGeometry.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeometry, planks); hull.castShadow = hull.receiveShadow = true; group.add(hull);
  function beam(a, b, thickness, material) {
    const length = a.distanceTo(b);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize());
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < sections.length - 1; i++) {
      beam(point(sections[i], side, 1), point(sections[i + 1], side, 1), .09, trim);
      for (const level of [.25, .5, .75]) beam(point(sections[i], side, level), point(sections[i + 1], side, level), .025, dark);
    }
    for (const index of [2, 3, 4, 5, 6]) beam(point(sections[index], side, .12, .05), point(sections[index], side, .94, .05), .07, dark);
  }
  for (const z of [-1.8, 0, 1.8]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, .1, .36), wood);
    seat.position.set(0, .7, z); seat.castShadow = seat.receiveShadow = true; group.add(seat);
  }
  for (const x of [-.42, -.14, .14, .42]) {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(.25, .08, 4.65), x < 0 ? wood : trim);
    floor.position.set(x, .24, 0); floor.castShadow = floor.receiveShadow = true; group.add(floor);
  }
  beam(point(sections[8], -1, 1), point(sections[8], 1, 1), .1, trim);
}
