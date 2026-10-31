import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand } from '../src/movement.js';

test('院子倒土目标复用碎石模型且仍可接近', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  const world = createWorld(SCENE_BY_ID.get('yard'));
  const soil = world.anchors.find(anchor => anchor.userData.assetKey === 'soilSpot');
  assert.deepEqual([soil.position.x, soil.position.z], [-10, 7]);
  assert.equal(catalog['yard:soilSpot'].url, catalog.rubble.url);
  assert.equal(catalog['yard:soilSpot'].height, catalog.rubble.height);
  assert.ok(canStand(-8, 7, world.config.size, world.colliders));
  disposeWorld(world);
});
