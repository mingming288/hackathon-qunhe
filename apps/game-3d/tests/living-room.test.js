import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand } from '../src/movement.js';

test('客厅主体与独立家具自包含，电视目标和入口保持可接近', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const key of ['livingRoom-architecture', 'livingRoom:sofa', 'livingRoom:television', 'livingRoom:table', 'livingRoom:lamp']) {
    const entry = catalog[key];
    assert.equal(entry.normalize, false);
    const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
    assert.equal(model.externalResources, 0, key);
    assert.ok(model.bounds.size.every(size => size > 0), key);
  }
  const world = createWorld(SCENE_BY_ID.get('livingRoom'));
  const tv = world.anchors.find(anchor => anchor.userData.assetKey === 'television');
  assert.deepEqual([tv.position.x, tv.position.z], [0, -4]);
  assert.ok(canStand(0, -2.5, world.config.size, world.colliders));
  assert.ok(world.portals.every(({ object }) => canStand(object.position.x, object.position.z, world.config.size, world.colliders)));
  assert.ok(world.root.children.some(child => child.isPointLight));
  disposeWorld(world);
});
