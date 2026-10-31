import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function unpack(data) {
  const length = data.readUInt32LE(12);
  return { json: JSON.parse(data.subarray(20, 20 + length)), bin: data.subarray(28 + length), size: data.length };
}
function bytes(model, viewIndex) {
  const view = model.json.bufferViews[viewIndex];
  return model.bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}

test('瑞德模型压缩贴图后保留顶点、骨骼和动画', async () => {
  const base = new URL('../public/assets/models/', import.meta.url);
  const source = unpack(await readFile(new URL('red-idle-walk.glb', base)));
  const optimized = unpack(await readFile(new URL('red-optimized.glb', base)));
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url)));
  assert.equal(catalog.models.red.url, '/assets/models/red-optimized.glb');
  assert.ok(optimized.size < source.size * .8);
  assert.deepEqual(optimized.json.animations, source.json.animations);
  assert.deepEqual(optimized.json.skins, source.json.skins);
  assert.deepEqual(optimized.json.meshes, source.json.meshes);
  assert.deepEqual(optimized.json.accessors, source.json.accessors);
  for (const accessor of source.json.accessors) {
    if (accessor.bufferView !== undefined) assert.ok(bytes(source, accessor.bufferView).equals(bytes(optimized, accessor.bufferView)));
  }
});
