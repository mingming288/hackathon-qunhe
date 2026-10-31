import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';

test('银行职员位于墙体前、柜台后，玩家可在柜台前交谈', () => {
  const world = createWorld(SCENE_BY_ID.get('bank'));
  const clerk = world.anchors.find(anchor => anchor.userData.assetKey === 'clerk');
  const counter = world.anchors.find(anchor => anchor.userData.assetKey === 'counter' && anchor.position.x > 0);
  assert.equal(clerk.position.x, 4);
  assert.ok(clerk.position.z > -4.4, '职员不能被模型墙体遮住');
  assert.ok(clerk.position.z < counter.position.z - .9, '职员在柜台后方');
  const customer = { x: 4, z: -1.1 };
  assert.ok(canStand(customer.x, customer.z, world.config.size, world.colliders));
  assert.ok(Math.hypot(customer.x - clerk.position.x, customer.z - clerk.position.z) < 3.4);
  disposeWorld(world);
});
