import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';

test('管网模型自包含，迷宫隔墙与玩家碰撞位置和尺寸一致', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  const entry = catalog['pipeNetwork-architecture'];
  assert.equal(entry.normalize, false);
  const data = await readFile(new URL('../public' + entry.url, import.meta.url));
  const model = inspectGlb(data);
  assert.equal(model.externalResources, 0);
  assert.ok(model.materials.some(material => material.normal));
  const document = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
  const walls = document.nodes.filter(node => node.name?.startsWith('迷宫隔墙'));
  assert.equal(walls.length, 5);
  const world = createWorld(SCENE_BY_ID.get('pipeNetwork'));
  for (const wall of walls) {
    const position = document.accessors[document.meshes[wall.mesh].primitives[0].attributes.POSITION];
    const [x, , z] = wall.translation;
    const w = position.max[0] - position.min[0], d = position.max[2] - position.min[2];
    assert.ok(world.colliders.some(c => c.x === x && c.z === z && c.w === w && c.d === d), wall.name);
  }
  assert.equal(world.root.children.filter(child => child.isPointLight).length, 3);
  disposeWorld(world);
});
