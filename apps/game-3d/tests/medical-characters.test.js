import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { medicalHiddenProps } from '../src/story.js';
import { canStand } from '../src/movement.js';

test('调查人员有正确称呼，抓捕后典狱长及其碰撞离开现场', () => {
  const world = createWorld(SCENE_BY_ID.get('medicalExterior'));
  const investigator = world.anchors.find(anchor => anchor.userData.assetKey === 'guard');
  const warden = world.anchors.find(anchor => anchor.userData.assetKey === 'warden');
  assert.equal(investigator.userData.label, '调查人员');
  assert.deepEqual(medicalHiddenProps({ events: [] }), []);
  const hidden = medicalHiddenProps({ events: ['twoArrest'] });
  assert.deepEqual(hidden, ['warden']);
  assert.equal(canStand(warden.position.x, warden.position.z, world.config.size, world.colliders), false);
  assert.equal(canStand(warden.position.x, warden.position.z, world.config.size,
    world.colliders.filter(collider => !hidden.includes(collider.assetKey))), true);
  disposeWorld(world);
});
