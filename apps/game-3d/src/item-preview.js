import * as THREE from 'three';
import { makeProp } from './kit.js';
import { bookModel } from './practice-geometry.js';
import { replaceAsset } from './assets.js';
import { disposeWorld } from './world.js';

// 只展示领取时的已有物件；领取与存档仍由原剧情确认按钮负责。
export const pickupItem = action => ({ takeHammer: 'hammer', getBible: 'bible', sideBrooks: 'bible' })[action.id] || null;

export function showItemPreview(container, item, catalog) {
  const holder = document.createElement('div'); holder.className = 'pickup-preview';
  holder.setAttribute('role', 'img'); holder.setAttribute('aria-label', item === 'hammer' ? '即将领取的石锤' : '即将领取的圣经');
  container.prepend(holder);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
  catch { holder.textContent = item === 'hammer' ? '石锤' : '圣经'; return () => holder.remove(); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(300, 150, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; holder.append(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-2.2, 2.2, 1.1, -1.1, .1, 20);
  camera.position.set(2.8, 2, 4); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight('#fff2d6', '#60503d', 2.2));
  const light = new THREE.DirectionalLight('#fff1d6', 2.5); light.position.set(2, 5, 4); scene.add(light);
  const pivot = new THREE.Group(), anchor = item === 'hammer' ? makeProp('hammer') : bookModel('#485561');
  scene.add(pivot); pivot.add(anchor);
  let active = true;
  function fit() {
    const rotation = pivot.rotation.y; pivot.rotation.y = 0;
    anchor.scale.setScalar(1); anchor.position.set(0, 0, 0); pivot.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(anchor), size = bounds.getSize(new THREE.Vector3());
    const scale = 1.9 / Math.max(size.x, size.y, size.z, .001), center = bounds.getCenter(new THREE.Vector3());
    anchor.scale.setScalar(scale); anchor.position.copy(center).multiplyScalar(-scale);
    pivot.rotation.y = rotation;
  }
  fit();
  if (item === 'hammer' && catalog.hammer) replaceAsset(anchor, catalog.hammer, () => active).then(() => { if (active) fit(); }).catch(() => {});
  let frame;
  const animate = time => { if (!active) return; pivot.rotation.y = Math.sin(time / 2000) * .35; renderer.render(scene, camera); frame = requestAnimationFrame(animate); };
  frame = requestAnimationFrame(animate);
  return () => { active = false; cancelAnimationFrame(frame); disposeWorld({ root: pivot }); renderer.dispose(); holder.remove(); };
}
