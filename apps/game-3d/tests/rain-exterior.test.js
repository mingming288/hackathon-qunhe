import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand } from '../src/movement.js';

test('雨夜场景和剧情排水口自包含，目标能靠近且不会与结局入口重叠', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const key of ['rain-architecture', 'rain:drain']) {
    const entry = catalog[key];
    assert.equal(entry.normalize, false);
    const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
    assert.equal(model.externalResources, 0);
    assert.ok(model.bounds.size[0] > 4);
  }
  const world = createWorld(SCENE_BY_ID.get('rain'));
  const drain = world.anchors.find(anchor => anchor.userData.assetKey === 'drain');
  assert.ok(drain);
  assert.ok(canStand(0, -12.4, world.config.size, world.colliders));
  assert.ok(Math.abs(drain.position.z + 12.4) < 2.7);
  for (const portal of world.portals) {
    assert.ok(Math.hypot(portal.object.position.x - drain.position.x, portal.object.position.z - drain.position.z) > 5);
    assert.ok(canStand(portal.object.position.x, portal.object.position.z, world.config.size, world.colliders));
  }
  assert.ok(world.rain);
  disposeWorld(world);
});
