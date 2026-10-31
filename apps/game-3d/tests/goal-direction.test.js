import test from 'node:test';
import assert from 'node:assert/strict';
import { goalDirection } from '../src/goal-direction.js';

test('目标方向随镜头旋转，与移动键方向一致', () => {
  const here = { x: 0, z: 0 };
  assert.equal(goalDirection(here, { x: 0, z: -5 }, 0), '目标方向 ↑');
  assert.equal(goalDirection(here, { x: 5, z: 0 }, 0), '目标方向 →');
  assert.equal(goalDirection(here, { x: 0, z: 5 }, 0), '目标方向 ↓');
  assert.equal(goalDirection(here, { x: 0, z: -5 }, Math.PI / 2), '目标方向 →');
  assert.equal(goalDirection(here, { x: 0, z: -.5 }, 0), '目标就在附近');
});

test('管网指引经过隔墙南端，能从入口抵达雨夜出口', async () => {
  const { pipeExitWaypoint } = await import('../src/goal-direction.js');
  const { createWorld, disposeWorld } = await import('../src/world.js');
  const { SCENE_BY_ID } = await import('../src/scenes.js');
  const { moveWithCollision } = await import('../src/movement.js');
  const world = createWorld(SCENE_BY_ID.get('pipeNetwork'));
  const position = { x: 0, z: 10.8 }, exit = { x: 9, z: -13.3 };
  for (let i = 0; i < 800 && Math.hypot(position.x - exit.x, position.z - exit.z) > 1; i++) {
    const target = pipeExitWaypoint(position) || exit;
    const dx = target.x - position.x, dz = target.z - position.z, distance = Math.hypot(dx, dz);
    moveWithCollision(position, dx / distance * .1, dz / distance * .1, world.config.size, world.colliders);
  }
  assert.ok(Math.hypot(position.x - exit.x, position.z - exit.z) <= 1);
  assert.deepEqual(pipeExitWaypoint({ x: 0, z: -4 }), { x: 3.8, z: 5 });
  disposeWorld(world);
});
