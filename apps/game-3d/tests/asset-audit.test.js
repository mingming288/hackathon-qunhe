import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectGlb } from '../scripts/inspect-glb.mjs';

function glb(document) {
  const json = Buffer.from(JSON.stringify(document));
  const length = Math.ceil(json.length / 4) * 4;
  const output = Buffer.alloc(20 + length, 32);
  output.write('glTF'); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(length, 12); output.writeUInt32LE(0x4e4f534a, 16); json.copy(output, 20);
  return output;
}

test('资产检查按默认场景实例统计，并应用父子节点变换', () => {
  const file = glb({ asset: { version: '2.0' }, scene: 1, scenes: [{ nodes: [3] }, { nodes: [0] }],
    nodes: [{ translation: [10, 0, 0], children: [1, 2] }, { mesh: 0 }, { mesh: 0, scale: [2, 2, 2] }, { mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ count: 6, min: [0, 0, 0], max: [1, 1, 1] }] });
  const result = inspectGlb(file);
  assert.equal(result.triangles, 4); assert.equal(result.meshInstances, 2);
  assert.deepEqual(result.bounds, { min: [10, 0, 0], max: [12, 2, 2], size: [2, 2, 2] });
  assert.equal(result.sha256.length, 64);
  assert.throws(() => inspectGlb(file.subarray(0, file.length - 1)), /完整/);
});

test('损坏缓冲区和循环节点不能产生看似合格的检查报告', () => {
  assert.throws(() => inspectGlb(glb({ scenes: [{ nodes: [0] }], nodes: [{ children: [0] }] })), /循环/);
  assert.throws(() => inspectGlb(glb({ scenes: [{ nodes: [] }], buffers: [{ byteLength: 10 }],
    bufferViews: [{ buffer: 0, byteLength: 20 }] })), /缓冲区/);
});
