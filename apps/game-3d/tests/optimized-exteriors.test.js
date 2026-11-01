import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function unpack(data) {
  const length = data.readUInt32LE(12);
  return { json: JSON.parse(data.subarray(20, 20 + length)), bin: data.subarray(28 + length), size: data.length };
}
function bytes(model, index) {
  const view = model.json.bufferViews[index];
  return model.bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}

test('院子建筑优化保留几何及非颜色资源，并接入优化后的模型', async () => {
  const base = new URL('../public/assets/models/', import.meta.url);
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const id of ['library', 'office']) {
    const original = unpack(await readFile(new URL(id + '-exterior.glb', base)));
    const optimized = unpack(await readFile(new URL(id + '-exterior-optimized.glb', base)));
    assert.equal(catalog['yard-' + id + '-exterior'].url, '/assets/models/' + id + '-exterior-optimized.glb');
    assert.ok(optimized.size < original.size * .75);
    for (const key of ['nodes', 'meshes', 'accessors', 'materials', 'textures', 'scenes'])
      assert.deepEqual(optimized.json[key], original.json[key], id + ' ' + key);
    const changed = new Set(original.json.images.filter((image, i) => image.mimeType !== optimized.json.images[i].mimeType).map(image => image.bufferView));
    assert.equal(changed.size, 1);
    original.json.bufferViews.forEach((view, index) => {
      if (!changed.has(index)) assert.ok(bytes(original, index).equals(bytes(optimized, index)), id + ' buffer ' + index);
    });
  }
});
