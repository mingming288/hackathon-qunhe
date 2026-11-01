import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function unpack(file) {
  const data = readFileSync(file), length = data.readUInt32LE(12);
  return { json: JSON.parse(data.subarray(20, 20 + length)), bin: data.subarray(28 + length), length: data.length };
}
function view(model, index) {
  const entry = model.json.bufferViews[index], start = entry.byteOffset || 0;
  return model.bin.subarray(start, start + entry.byteLength);
}
function compareAccessor(before, a, after, b) {
  const left = before.json.accessors[a], right = after.json.accessors[b];
  const { bufferView: leftView, ...leftFields } = left;
  const { bufferView: rightView, ...rightFields } = right;
  assert.deepEqual(rightFields, leftFields);
  assert.ok(view(before, leftView).equals(view(after, rightView)));
}

test('清理人物无引用数据时保留网格、骨骼、动画和贴图字节', () => {
  const dir = mkdtempSync(join(tmpdir(), '人物模型测试-'));
  try {
    const source = fileURLToPath(new URL('../public/assets/models/andy-walk.glb', import.meta.url));
    const script = fileURLToPath(new URL('../scripts/prune-character-glb.py', import.meta.url));
    const output = join(dir, '精简.glb');
    execFileSync('python3', [script, source, output]);
    const before = unpack(source), after = unpack(output);
    assert.ok(after.length < before.length * .7);
    for (let i = 0; i < before.json.meshes.length; i++) {
      for (let j = 0; j < before.json.meshes[i].primitives.length; j++) {
        const a = before.json.meshes[i].primitives[j], b = after.json.meshes[i].primitives[j];
        compareAccessor(before, a.indices, after, b.indices);
        for (const key of Object.keys(a.attributes)) compareAccessor(before, a.attributes[key], after, b.attributes[key]);
      }
    }
    for (let i = 0; i < before.json.skins.length; i++) compareAccessor(before, before.json.skins[i].inverseBindMatrices, after, after.json.skins[i].inverseBindMatrices);
    for (let i = 0; i < before.json.animations.length; i++) {
      const a = before.json.animations[i], b = after.json.animations[i];
      assert.deepEqual(b.channels, a.channels);
      for (let j = 0; j < a.samplers.length; j++) for (const key of ['input', 'output']) compareAccessor(before, a.samplers[j][key], after, b.samplers[j][key]);
    }
    for (let i = 0; i < before.json.images.length; i++) assert.ok(view(before, before.json.images[i].bufferView).equals(view(after, after.json.images[i].bufferView)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
