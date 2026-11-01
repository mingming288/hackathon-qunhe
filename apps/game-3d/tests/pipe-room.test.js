import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand } from '../src/movement.js';

test('砸管处模型自包含，剧情管道和两个入口保持可接近', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const key of ['pipe-architecture', 'pipe:pipeTarget']) {
    const entry = catalog[key];
    assert.equal(entry.normalize, false);
    const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
    assert.equal(model.externalResources, 0);
    assert.ok(model.bounds.size[0] > 4);
  }
  const world = createWorld(SCENE_BY_ID.get('pipe'));
  assert.ok(world.anchors.some(anchor => anchor.userData.assetKey === 'pipeTarget'));
  assert.ok(canStand(0, -2, world.config.size, world.colliders));
  for (const portal of world.portals) {
    const { x, z } = portal.object.position;
    assert.ok(canStand(x, z, world.config.size, world.colliders), portal.id);
  }
  assert.equal(world.root.children.filter(child => child.isPointLight).length, 2);
  disposeWorld(world);
});
