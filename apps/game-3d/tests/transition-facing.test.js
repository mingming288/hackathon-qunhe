import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { entryPosition, transitionOrientation } from '../src/navigation.js';
import { YARD_BUILDINGS } from '../src/yard-layout.js';

test('院子与建筑往返时保留方向，返回位置沿门前道路向外', () => {
  const yard = createWorld(SCENE_BY_ID.get('yard'));
  for (const { id: from, rotation } of YARD_BUILDINGS) {
    const position = entryPosition(yard, from);
    const portal = yard.portals.find(item => item.id === from).object.position;
    assert.ok(Math.abs(position.x - portal.x - Math.sin(rotation) * 2.6) < 1e-9);
    assert.ok(Math.abs(position.z - portal.z - Math.cos(rotation) * 2.6) < 1e-9);
    const first = transitionOrientation('yard', from, .4, 1.2);
    assert.equal(first.yaw, .4 - rotation); assert.equal(first.facing, 1.2 - rotation);
    const back = transitionOrientation(from, 'yard', first.yaw, first.facing);
    assert.ok(Math.abs(back.yaw - .4) < 1e-9 && Math.abs(back.facing - 1.2) < 1e-9);
  }
  disposeWorld(yard);
});

test('没有对应入口的剧情传送保留默认镜头', () => {
  assert.deepEqual(transitionOrientation('yard', 'solitary', 1, 1, { position: { x: 0, z: 2 } }), { yaw: 0, facing: Math.PI });
});
