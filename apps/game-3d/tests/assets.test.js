import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { replaceAsset } from '../src/assets.js';

function anchor() {
  const root = new THREE.Group(), result = new THREE.Group(), placeholder = new THREE.Group();
  root.add(result); result.add(placeholder);
  result.userData = { placeholder, targetHeight: 2 };
  return result;
}

test('正式模型及缓存副本参与阴影，落地缩放不改变缓存源模型', async context => {
  const source = new THREE.Group(), nested = new THREE.Group(); source.add(nested);
  nested.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
  const load = context.mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({ scene: source, animations: [] }));
  const first = anchor(), second = anchor(), entry = { url: '/assets/models/shadow-test.glb', height: 2 };
  await replaceAsset(first, entry); await replaceAsset(second, entry);
  assert.equal(load.mock.callCount(), 1, '同一模型只读取一次');
  for (const item of [first, second]) {
    assert.equal(item.userData.placeholder.visible, false);
    const model = item.children[1];
    const mesh = model.children[0].children[0];
    assert.ok(mesh.castShadow && mesh.receiveShadow, '嵌套网格也必须参与阴影');
    const bounds = new THREE.Box3().setFromObject(model);
    assert.equal(bounds.min.y, 0); assert.equal(bounds.max.y, 2);
  }
  assert.notEqual(first.children[1], second.children[1]);
  assert.equal(nested.children[0].castShadow, false, '不能修改共享缓存的源场景');
  await replaceAsset(first, entry); assert.equal(first.children.length, 2, '重复接入不添加副本');
});

test('加载失败保留占位物且允许重试，已离开场景的结果不再接入', async context => {
  const source = new THREE.Group(); source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  let fail = true;
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async () => {
    if (fail) throw new Error('模拟读取失败');
    return { scene: source, animations: [] };
  });
  const target = anchor(), entry = { url: '/assets/models/retry-test.glb' };
  await assert.rejects(replaceAsset(target, entry), /模拟读取失败/);
  assert.equal(target.userData.placeholder.visible, true);
  fail = false; await replaceAsset(target, entry);
  assert.equal(target.userData.replaced, true);
  const detached = anchor(); detached.removeFromParent();
  await replaceAsset(detached, entry);
  assert.equal(detached.userData.placeholder.visible, true);
  assert.equal(detached.children.length, 1);
});

test('裁切远景只克隆材质，不修改缓存模型和共享贴图', async context => {
  const source = new THREE.Group(), material = new THREE.MeshStandardMaterial();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material));
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({ scene: source, animations: [] }));
  const target = anchor(); target.userData.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -15);
  await replaceAsset(target, { url: '/assets/models/clipped-test.glb' });
  const model = target.children[1], clipped = model.children[0].material;
  assert.notEqual(clipped, material);
  assert.equal(material.clippingPlanes, null);
  assert.deepEqual(clipped.clippingPlanes, [target.userData.clipPlane]);
  assert.equal(model.userData.ownsClippedMaterials, true);
});

test('场景已切换时，仍有父节点的远景不会接入过期模型', async context => {
  const source = new THREE.Group(); source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  let finish;
  context.mock.method(GLTFLoader.prototype, 'loadAsync', () => new Promise(resolve => { finish = resolve; }));
  const target = anchor(); let current = true;
  const pending = replaceAsset(target, { url: '/assets/models/late-vista-test.glb' }, () => current);
  current = false; finish({ scene: source, animations: [] });
  assert.equal(await pending, null);
  assert.equal(target.children.length, 1);
  assert.equal(target.userData.placeholder.visible, true);
});

test('人物行走动画仍在加载时切换场景，可以复用已创建的待机混合器', async context => {
  const source = new THREE.Group(); source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  const idle = new THREE.AnimationClip('idle', 1, []), walk = new THREE.AnimationClip('walk', 1, []);
  let finishWalk;
  context.mock.method(GLTFLoader.prototype, 'loadAsync', url => url.endsWith('walk-pending.glb')
    ? new Promise(resolve => { finishWalk = resolve; })
    : Promise.resolve({ scene: source, animations: [idle] }));
  const target = anchor(), entry = { url: '/assets/models/idle-pending.glb', walkUrl: '/assets/models/walk-pending.glb' };
  const first = replaceAsset(target, entry);
  await new Promise(resolve => setImmediate(resolve));
  const reused = await replaceAsset(target, entry);
  assert.ok(reused, '行走动画未完成时待机混合器仍可被新场景使用');
  finishWalk({ scene: source, animations: [walk] });
  assert.equal(await first, reused);
  assert.equal(typeof reused.setMoving, 'function');
});

test('多个角色共用行走动作时只加载一次', async context => {
  const source = new THREE.Group(); source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  const load = context.mock.method(GLTFLoader.prototype, 'loadAsync', async url => ({
    scene: source, animations: [new THREE.AnimationClip(url.includes('shared-walk') ? 'walk' : 'idle', 1, [])]
  }));
  await Promise.all([
    replaceAsset(anchor(), { url: '/assets/models/cache-idle-a.glb', walkUrl: '/assets/models/shared-walk.glb' }),
    replaceAsset(anchor(), { url: '/assets/models/cache-idle-b.glb', walkUrl: '/assets/models/shared-walk.glb' })
  ]);
  assert.equal(load.mock.calls.filter(call => call.arguments[0].endsWith('shared-walk.glb')).length, 1);
});
