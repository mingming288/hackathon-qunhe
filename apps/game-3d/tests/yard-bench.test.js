import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';

test('院子长椅模型自包含，位置和碰撞范围保持一致', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  const entry = catalog['yard:bench']; assert.equal(entry.normalize, false);
  const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
  assert.equal(model.externalResources, 0);
  assert.ok(model.materials.some(material => material.baseColor));
  assert.ok(model.bounds.size[0] <= 3.4 && model.bounds.size[1] > 1.4 && model.bounds.size[2] <= 1.4);
  const world = createWorld(SCENE_BY_ID.get('yard'));
  const bench = world.anchors.find(anchor => anchor.userData.assetKey === 'bench');
  assert.deepEqual([bench.position.x, bench.position.z], [-5, -1]);
  assert.equal(canStand(-5, -1, world.config.size, world.colliders), false);
  assert.equal(canStand(-5, 1, world.config.size, world.colliders), true);
  disposeWorld(world);
});
