import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { officeHiddenProps } from '../src/story.js';
import { canStand } from '../src/movement.js';

test('办公室道具自包含并维持原剧情目标和显隐顺序', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const kind of ['safe', 'embroidery', 'ledger']) {
    const entry = catalog['office:' + kind];
    assert.equal(entry.normalize, false);
    const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
    assert.equal(model.externalResources, 0, kind);
    assert.ok(model.bounds.size.every(size => size > 0), kind);
  }
  const world = createWorld(SCENE_BY_ID.get('office'));
  const safe = world.anchors.find(anchor => anchor.userData.assetKey === 'safe');
  const embroidery = world.anchors.find(anchor => anchor.userData.assetKey === 'embroidery');
  assert.ok(Math.hypot(safe.position.x - embroidery.position.x, safe.position.z - embroidery.position.z) < .6);
  assert.ok(canStand(-6.4, -7.4, world.config.size, world.colliders));
  assert.ok(Math.abs(embroidery.position.z + 7.4) < 2.7);
  assert.ok(Math.abs(safe.position.z + 7.4) < 2.7);
  assert.ok(officeHiddenProps({ events: [] }).includes('safe'));
  assert.ok(!officeHiddenProps({ events: ['openSafe'] }).includes('embroidery'));
  disposeWorld(world);
});
