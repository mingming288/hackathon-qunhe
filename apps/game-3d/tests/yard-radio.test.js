import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';

test('院子收音机模型自包含，原有维修目标仍然可以接近', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  const entry = catalog['yard:radio'];
  assert.equal(entry.normalize, false);
  const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
  assert.equal(model.externalResources, 0);
  assert.ok(model.materials.some(material => material.baseColor));
  assert.ok(model.bounds.size[0] > 1 && model.bounds.size[1] > .8);
  const world = createWorld(SCENE_BY_ID.get('yard'));
  const radio = world.anchors.find(anchor => anchor.userData.assetKey === 'radio');
  assert.deepEqual([radio.position.x, radio.position.z], [3.9, -2.5]);
  assert.ok(canStand(4, -1, world.config.size, world.colliders));
  disposeWorld(world);
});
