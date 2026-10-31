import * as THREE from 'three';

// 建筑模型中央没有地面，独立铺装同时覆盖正式游玩和环境预览。
export function addMedicalCourtyard(root, size) {
  const material = new THREE.MeshStandardMaterial({ color: '#92958b', roughness: 1 });
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d'), image = context.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      // 稳定的细颗粒让庭院更像旧混凝土，不依赖网络纹理。
      const value = 205 + ((Math.imul(i + 1, 2654435761) >>> 24) % 34);
      image.data.set([value, value, value, 255], i * 4);
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 5);
    material.map = texture;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
  ground.name = '医疗机构庭院铺装';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.03;
  ground.receiveShadow = true;
  root.add(ground);
}
