import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function unpack(data) {
  const length = data.readUInt32LE(12);
  return { json: JSON.parse(data.subarray(20, 20 + length).toString()), bin: data.subarray(28 + length) };
}
function bytes(model, index) {
  const accessor = model.json.accessors[index], view = model.json.bufferViews[accessor.bufferView];
  return model.bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}

test('独立行走动画保留骨架及逐字节动作数据，并可由游戏加载和播放', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  const entry = catalog.andy;
  assert.equal(entry.walkUrl, '/assets/models/andy-walk-only.glb');
  const original = unpack(await readFile(new URL('../public/assets/models/andy-walk.glb', import.meta.url)));
  const file = await readFile(new URL('../public' + entry.walkUrl, import.meta.url));
  const compact = unpack(file);
  assert.ok(file.length < 100_000);
  assert.ok(!compact.json.meshes && !compact.json.images && !compact.json.skins);
  assert.deepEqual(compact.json.nodes.map(n => n.name), original.json.nodes.map(n => n.name));
  assert.deepEqual(compact.json.animations[0].channels, original.json.animations[0].channels);
  for (let i = 0; i < original.json.animations[0].samplers.length; i++) {
    for (const key of ['input', 'output']) {
      assert.ok(bytes(original, original.json.animations[0].samplers[i][key]).equals(bytes(compact, compact.json.animations[0].samplers[i][key])));
    }
  }
  const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const loaded = await new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, '', resolve, reject));
  assert.equal(loaded.animations[0].tracks.length, original.json.animations[0].channels.length);
  const mixer = new THREE.AnimationMixer(loaded.scene);
  const hips = loaded.scene.getObjectByName('mixamorigHips');
  const initial = hips.position.clone();
  mixer.clipAction(loaded.animations[0]).play(); mixer.update(.5);
  assert.ok(hips.position.distanceTo(initial) > .001, '行走动作应实际驱动骨骼');
});
