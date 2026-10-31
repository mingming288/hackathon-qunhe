import test from 'node:test';
import assert from 'node:assert/strict';
import { officeHiddenProps } from '../src/story.js';

test('办公室的保险柜和人物外观随剧情事件恢复', () => {
  assert.deepEqual(officeHiddenProps({ events: [] }), ['safe', 'ledger']);
  assert.deepEqual(officeHiddenProps({ events: ['meetWarden'] }), ['safe', 'warden', 'ledger']);
  assert.deepEqual(officeHiddenProps({ events: ['meetWarden', 'openSafe'] }), ['embroidery', 'warden', 'ledger']);
  assert.deepEqual(officeHiddenProps({ events: ['riskInspection', 'sideHide'] }), ['safe', 'warden']);
  assert.deepEqual(officeHiddenProps({ events: ['riskInspection', 'sideHide', 'sideRecover'] }), ['safe', 'warden', 'ledger']);
});

test('离开的典狱长不会留下阻挡玩家的碰撞', async () => {
  const { createWorld, disposeWorld } = await import('../src/world.js');
  const { SCENE_BY_ID } = await import('../src/scenes.js');
  const { canStand } = await import('../src/movement.js');
  const world = createWorld(SCENE_BY_ID.get('office'));
  const hidden = officeHiddenProps({ events: ['meetWarden'] });
  assert.equal(canStand(3, -4, world.config.size, world.colliders), false);
  const visible = world.colliders.filter(collider => !hidden.includes(collider.assetKey));
  assert.equal(canStand(3, -4, world.config.size, visible), true);
  disposeWorld(world);
});
