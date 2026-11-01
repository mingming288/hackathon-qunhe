import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function unpack(data) {
  const size = data.readUInt32LE(12);
  return { json: JSON.parse(data.subarray(20, 20 + size)), bin: data.subarray(28 + size), size: data.length };
}
function bytes(model, index) {
  const view = model.json.bufferViews[index];
  return model.bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}

test('主要人物压缩颜色贴图后保留骨骼、动作及其他资源', async () => {
  const base = new URL('../public/assets/models/', import.meta.url);
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const [source, ids] of [
    ['andy-idle', ['andy']], ['brooks-idle-walk', ['brooks']],
    ['norton-idle-walk', ['warden', 'manager', 'clerk']],
  ]) {
    const original = unpack(await readFile(new URL(source + '.glb', base)));
    const optimized = unpack(await readFile(new URL(source + '-optimized.glb', base)));
    for (const id of ids) assert.equal(catalog[id].url, '/assets/models/' + source + '-optimized.glb');
    assert.ok(optimized.size < original.size * .8);
    for (const key of ['nodes', 'meshes', 'accessors', 'materials', 'textures', 'animations', 'skins'])
      assert.deepEqual(optimized.json[key], original.json[key], source + ' ' + key);
    const changed = new Set(original.json.images.filter((image, i) => image.mimeType !== optimized.json.images[i].mimeType).map(image => image.bufferView));
    assert.equal(changed.size, 1);
    original.json.bufferViews.forEach((view, index) => {
      if (!changed.has(index)) assert.ok(bytes(original, index).equals(bytes(optimized, index)), source + ' buffer ' + index);
    });
  }
});
