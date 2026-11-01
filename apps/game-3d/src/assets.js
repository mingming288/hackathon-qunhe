import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const cache = new Map();

function loadModel(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url).catch(error => { cache.delete(url); throw error; }));
  return cache.get(url);
}

// 在离开当前场景前准备目标场景的模型和动作，复用正式加载缓存。
export async function preloadModel(entry) {
  validateModelEntry(entry);
  const urls = [entry.url, entry.idleUrl, entry.walkUrl].filter(Boolean);
  await Promise.all(urls.map(url => { validateModelEntry({ url }); return loadModel(url); }));
}

function inPlaceClip(source, model) {
  const clip = source.clone();
  for (const track of clip.tracks) {
    const binding = THREE.PropertyBinding.parseTrackName(track.name);
    if (binding.propertyName !== 'position' || track.getValueSize() !== 3) continue;
    const bone = THREE.PropertyBinding.findNode(model, binding.nodeName);
    if (!bone?.isBone || bone.parent?.isBone) continue;
    // The controller owns horizontal travel; keep vertical bob and the cached clip intact.
    for (let index = 0; index < track.values.length; index += 3) {
      track.values[index] = bone.position.x;
      track.values[index + 2] = bone.position.z;
    }
  }
  return clip;
}

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

export async function replaceAsset(anchor, entry, isCurrent = () => true) {
  validateModelEntry(entry);
  if (anchor.userData.replaced) return anchor.userData.loadAnimation?.() ?? anchor.userData.mixer ?? null;
  const gltf = await loadModel(entry.url);
  if (!anchor.parent || !isCurrent()) return null; // 切换场景后，不再把旧的异步结果放入场景。
  if (anchor.userData.replaced) return anchor.userData.loadAnimation?.() ?? anchor.userData.mixer ?? null;
  const model = clone(gltf.scene);
  // 正式模型与基础几何使用同一套光照；三维文件不会保存引擎的阴影开关。
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = node.receiveShadow = true;
    if (anchor.userData.clipPlane) {
      const clipped = material => {
        const copy = material.clone(); copy.clippingPlanes = [anchor.userData.clipPlane];
        copy.clipShadows = true; return copy;
      };
      node.material = Array.isArray(node.material) ? node.material.map(clipped) : clipped(node.material);
    }
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
  model.userData.ownsClippedMaterials = Boolean(anchor.userData.clipPlane);
  anchor.userData.placeholder.visible = false;
  anchor.add(model);
  anchor.userData.replaced = true;
  const hasWalk = entry.walkUrl || Number.isInteger(entry.walkAnimation);
  let mixer = null, idleClip = null, pending;
  anchor.userData.loadAnimation = () => {
    if (pending) return pending;
    pending = (async () => {
      if (!mixer) {
        let idleGltf = gltf;
        if (entry.idleUrl) {
          validateModelEntry({ url: entry.idleUrl });
          idleGltf = await loadModel(entry.idleUrl);
          if (!idleGltf.animations.length) throw new Error('人物待机动作不存在。');
        }
        const source = idleGltf.animations[0];
        idleClip = source ? (hasWalk ? inPlaceClip(source, model) : source.clone()) : null;
        // 外部骨架比例可能不同，保留目标人物的位置，只复用关节旋转。
        if (entry.idleUrl && idleClip) idleClip.tracks = idleClip.tracks.filter(track => track.name.endsWith('.quaternion'));
        if (idleClip) {
          mixer = new THREE.AnimationMixer(model);
          anchor.userData.mixer = mixer;
          mixer.clipAction(idleClip).play();
        }
      }
      if (mixer && !mixer.setMoving && hasWalk) {
        let walking = gltf;
        if (entry.walkUrl) {
          validateModelEntry({ url: entry.walkUrl });
          walking = await loadModel(entry.walkUrl);
        }
        const idle = mixer.clipAction(idleClip);
        const clip = walking.animations[entry.walkAnimation ?? 0];
        if (!clip) throw new Error('人物行走动作不存在。');
        const walk = mixer.clipAction(inPlaceClip(clip, model));
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
      return mixer;
    })().catch(error => { pending = null; throw error; });
    return pending;
  };
  return anchor.userData.loadAnimation();
}
