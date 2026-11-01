import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { guideWaypoint } from '../src/guide-route.js';
import { moveWithCollision } from '../src/movement.js';

test('直路不产生绕行点；障碍物存在时引导从可行走位置绕过', () => {
  const world = { config: { size: [12, 12] }, colliders: [{ x: 0, z: 0, w: 2, d: 5 }] };
  const start = { x: -4, z: 0 }, target = { x: 4, z: 0 };
  assert.equal(guideWaypoint(world, start, { x: -4, z: -4 }, 1), null);
  assert.ok(guideWaypoint(world, start, target, 1));
  const position = { ...start };
  for (let i = 0; i < 300 && Math.hypot(position.x - target.x, position.z - target.z) > 1; i++) {
    const point = guideWaypoint(world, position, target, 1) || target;
    const dx = point.x - position.x, dz = point.z - position.z, length = Math.hypot(dx, dz);
    moveWithCollision(position, dx / length * .1, dz / length * .1, world.config.size, world.colliders);
  }
  assert.ok(Math.hypot(position.x - target.x, position.z - target.z) <= 1);
});

test('图书馆、办公室和院子的典型目标可按指引绕过家具抵达', () => {
  for (const [id, start, target, reach] of [
    ['library', [8, 5], [-7, -6], 2.2],
    ['office', [6, 4], [-6.4, -9.1], 2.2],
    ['yard', [0, 5], [-9.35, -5], 1.15],
  ]) {
    const world = createWorld(SCENE_BY_ID.get(id)), position = { x: start[0], z: start[1] };
    const goal = { x: target[0], z: target[1] }; let turns = 0;
    for (let i = 0; i < 400 && Math.hypot(position.x - goal.x, position.z - goal.z) > reach; i++) {
      const waypoint = guideWaypoint(world, position, goal, reach); if (waypoint) turns++;
      const point = waypoint || goal, dx = point.x - position.x, dz = point.z - position.z, length = Math.hypot(dx, dz);
      moveWithCollision(position, dx / length * .1, dz / length * .1, world.config.size, world.colliders);
    }
    assert.ok(turns > 0, id + ' 应绕过障碍');
    assert.ok(Math.hypot(position.x - goal.x, position.z - goal.z) <= reach, id + ' 应抵达目标');
    disposeWorld(world);
  }
});
