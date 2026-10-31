import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { entryPosition, transitionOrientation } from '../src/navigation.js';

test('从图书馆和办公室返回院子时，镜头跟随人物面向院内', () => {
  const yard = createWorld(SCENE_BY_ID.get('yard'));
  for (const from of ['library', 'office']) {
    const position = entryPosition(yard, from);
    const portal = yard.portals.find(item => item.id === from).object.position;
    const { yaw, facing } = transitionOrientation(from, 'yard', 0, 0, { position, portal });
    const outX = portal.x - position.x, outZ = portal.z - position.z;
    assert.ok(Math.sin(yaw) * outX + Math.cos(yaw) * outZ > 0, '镜头位于入口一侧');
    assert.ok(Math.sin(facing) * outX + Math.cos(facing) * outZ < 0, '人物面向院内');
  }
  disposeWorld(yard);
});

test('没有对应入口的剧情传送保留默认镜头', () => {
  assert.deepEqual(transitionOrientation('yard', 'solitary', 1, 1, { position: { x: 0, z: 2 } }), { yaw: 0, facing: Math.PI });
});
