import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';

test('办公室布帘保留剧情位置，褶皱具有实际深度且可接近', () => {
  const world = createWorld(SCENE_BY_ID.get('office'));
  const anchor = world.anchors.find(item => item.userData.assetKey === 'curtain');
  assert.deepEqual([anchor.position.x, anchor.position.z], [7.3, -6]);
  const fabric = anchor.userData.placeholder.children[0];
  fabric.geometry.computeBoundingBox();
  assert.ok(fabric.geometry.boundingBox.max.z - fabric.geometry.boundingBox.min.z > .1);
  assert.ok(canStand(7.3, -4, world.config.size, world.colliders));
  disposeWorld(world);
});
