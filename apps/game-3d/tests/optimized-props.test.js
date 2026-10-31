import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';

function images(buffer) {
  const jsonLength = buffer.readUInt32LE(12), json = JSON.parse(buffer.subarray(20, 20 + jsonLength));
  const binStart = 20 + jsonLength + 8;
  return json.images.map(image => {
    const view = json.bufferViews[image.bufferView];
    return buffer.subarray(binStart + (view.byteOffset || 0), binStart + (view.byteOffset || 0) + view.byteLength);
  });
}

test('石锤和碎石减少面数，同时保留原贴图和尺度', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const name of ['hammer', 'rubble']) {
    const original = await readFile(new URL('../public/assets/models/' + name + '.glb', import.meta.url));
    const optimized = await readFile(new URL('../public/assets/models/' + name + '-optimized.glb', import.meta.url));
    const before = inspectGlb(original), after = inspectGlb(optimized);
    assert.equal(catalog[name].url, '/assets/models/' + name + '-optimized.glb');
    assert.ok(after.triangles < before.triangles * .6 && after.bytes < before.bytes);
    assert.deepEqual(images(optimized), images(original), '贴图必须逐字节保留');
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(before.bounds.size[i] - after.bounds.size[i]) < .002);
  }
  assert.equal(catalog['yard:soilSpot'].url, catalog.rubble.url);
});
