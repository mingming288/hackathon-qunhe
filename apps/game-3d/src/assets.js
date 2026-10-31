import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();

export function validateModelEntry(entry) {
  if (!entry || typeof entry.url !== 'string' || !entry.url.startsWith('/assets/models/')) {
    throw new Error('模型地址必须位于当前应用的 /assets/models/ 目录。');
  }
  const path = new URL(entry.url, 'https://local.invalid').pathname;
  if (!path.startsWith('/assets/models/') || !/^\/assets\/models\/[a-z0-9_./-]+\.glb$/i.test(entry.url) || entry.url.split('/').includes('..')) {
    throw new Error('模型地址格式不正确。');
  }
  if (entry.height !== undefined && (!Number.isFinite(entry.height) || entry.height <= 0)) {
    throw new Error('模型高度必须大于零。');
  }
  if (entry.rotationY !== undefined && !Number.isFinite(entry.rotationY)) throw new Error('朝向必须是有限数值。');
  if (entry.normalize !== undefined && typeof entry.normalize !== 'boolean') throw new Error('归一化选项必须是布尔值。');
  return entry;
}

export async function readModelCatalog() {
  const response = await fetch('/assets/models.json');
  if (!response.ok) throw new Error('模型清单加载失败。');
  const catalog = await response.json();
  if (catalog.version !== 1 || !catalog.models || typeof catalog.models !== 'object' || Array.isArray(catalog.models)) {
    throw new Error('模型清单格式不正确。');
  }
  Object.values(catalog.models).forEach(validateModelEntry);
  return catalog.models;
}

export async function replaceAsset(anchor, entry) {
  validateModelEntry(entry);
  if (anchor.userData.replaced) return anchor.userData.mixer || null;
  if (!cache.has(entry.url)) {
    const pending = loader.loadAsync(entry.url).catch(error => { cache.delete(entry.url); throw error; });
    cache.set(entry.url, pending);
  }
  const gltf = await cache.get(entry.url);
  if (!anchor.parent) return null; // 切换场景后，不再把旧的异步结果放入场景。
  if (anchor.userData.replaced) return anchor.userData.mixer || null;
  const model = clone(gltf.scene);
  // 正式模型与基础几何使用同一套光照；三维文件不会保存引擎的阴影开关。
  model.traverse(node => {
    if (node.isMesh) node.castShadow = node.receiveShadow = true;
  });
  model.rotation.y = entry.rotationY || 0;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const height = box.max.y - box.min.y;
  if (!Number.isFinite(height) || height <= 0) throw new Error('模型没有有效的空间尺寸。');
  if (entry.normalize !== false) {
    const scale = (entry.height || anchor.userData.targetHeight || height) / height;
    model.scale.multiplyScalar(scale);
    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
    model.position.set(-center.x, -box.min.y * scale, -center.z);
  }
  model.userData.externalAsset = true;
  anchor.userData.placeholder.visible = false;
  anchor.add(model);
  anchor.userData.replaced = true;
  const mixer = gltf.animations.length ? new THREE.AnimationMixer(model) : null;
  if (mixer) mixer.clipAction(gltf.animations[0]).play();
  if (mixer && (entry.walkUrl || Number.isInteger(entry.walkAnimation))) {
    let walking = gltf;
    if (entry.walkUrl) {
      validateModelEntry({ url: entry.walkUrl });
      walking = await loader.loadAsync(entry.walkUrl);
    }
    const idle = mixer.clipAction(gltf.animations[0]);
    const clip = walking.animations[entry.walkAnimation ?? 0];
    const walk = clip && mixer.clipAction(clip);
    if (walk) {
      let moving = false;
      mixer.setMoving = value => {
        if (moving === value) return;
        moving = value;
        const next = value ? walk : idle;
        const previous = value ? idle : walk;
        previous.fadeOut(.2);
        next.reset().fadeIn(.2).play();
      };
    }
  }
  anchor.userData.mixer = mixer;
  return mixer;
}
