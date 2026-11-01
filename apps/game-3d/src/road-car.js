import * as THREE from 'three';

// 低面数旧轿车，尺寸与公路场景已有碰撞范围一致。
export function createRoadCar(group, { police = false } = {}) {
  const paint = new THREE.MeshStandardMaterial({ color: police ? '#252d2d' : '#41574f', roughness: .47, metalness: .35 });
  const glass = new THREE.MeshStandardMaterial({ color: '#3e575a', roughness: .28, metalness: .2 });
  const trim = new THREE.MeshStandardMaterial({ color: '#a19b87', roughness: .45, metalness: .7 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#242724', roughness: .95 });
  const red = new THREE.MeshStandardMaterial({ color: '#8e3f32', roughness: .45 });
  const lamp = new THREE.MeshStandardMaterial({ color: '#d9c897', roughness: .4 });
  function block(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  block(2.3,.55,4.55,0,.78,0,paint);
  block(2.18,.18,1.25,0,1.12,-1.5,paint);
  block(2.18,.14,.95,0,1.11,1.63,paint);
  block(1.88,.7,2.1,0,1.43,.05,glass);
  const ivory = police ? new THREE.MeshStandardMaterial({ color: '#c5c2ad', roughness: .75 }) : paint;
  block(1.98,.14,2.15,0,1.83,.05,ivory);
  for (const x of [-.95,.95]) {
    block(.08,.7,.1,x,1.43,-.98,paint); block(.08,.7,.1,x,1.43,1.08,paint);
    block(.06,.65,.08,x,1.43,.05,paint);
    block(.04,.045,3.3,x * 1.21,.91,0,trim);
    for (const z of [-1.45,1.45]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.25,20),rubber);
      tire.rotation.z = Math.PI / 2; tire.position.set(x * 1.17,.43,z); tire.castShadow = true; group.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.265,20),trim);
      hub.rotation.z = Math.PI / 2; hub.position.copy(tire.position); group.add(hub);
    }
    block(.4,.16,.04,x*.72,.84,-2.29,lamp);
    block(.36,.14,.04,x*.72,.84,2.29,red);
  }
  for (const z of [-2.32,2.32]) block(2.38,.12,.12,0,.57,z,trim);
  block(.75,.22,.03,0,.79,-2.3,trim);
  if (police) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(.19, 16, 10), red);
    beacon.position.set(0, 2.09, .05); beacon.scale.y = .8; group.add(beacon);
    block(.48,.08,.45,0,1.95,.05,trim);
    for (const x of [-1, 1]) {
      block(.025,.46,1.55,x*1.16,.8,.12,ivory);
      block(.03,.035,.25,x*1.18,1.02,-.32,trim);
      block(.03,.035,.25,x*1.18,1.02,.53,trim);
      const badge = new THREE.Mesh(new THREE.CircleGeometry(.2, 20), paint);
      badge.rotation.y = x * Math.PI / 2; badge.position.set(x*1.178,.77,.12); group.add(badge);
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .065 : .15;
        if (!i) star.moveTo(Math.cos(a)*r, Math.sin(a)*r);
        else star.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      star.closePath();
      const emblem = new THREE.Mesh(new THREE.ShapeGeometry(star), ivory);
      emblem.rotation.y = x * Math.PI / 2; emblem.position.set(x*1.18,.77,.12); group.add(emblem);
    }
    for (const y of [.65, .72, .79, .86]) block(1.18,.025,.025,0,y,-2.33,trim);
  }
}
