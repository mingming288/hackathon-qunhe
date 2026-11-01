import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { AutoWalk } from '../src/auto-walk.js';
import { moveWithCollision } from '../src/movement.js';

function destination(x, z) {
  const parent = new THREE.Group(), object = new THREE.Group();
  object.position.set(x, 0, z); parent.add(object); return object;
}

test('自动行走绕过障碍，到达后等待玩家互动', () => {
  const world = { config: { size: [12, 12] }, colliders: [{ x: 0, z: 0, w: 2, d: 5 }] };
  const position = new THREE.Vector3(-4, 0, 0), walk = new AutoWalk(destination(4, 0));
  let result;
  for (let i = 0; i < 600; i++) {
    result = walk.update(world, position, .04);
    if (result.status !== 'walking') break;
    moveWithCollision(position, result.direction.x * .1, result.direction.z * .1, world.config.size, world.colliders);
  }
  assert.equal(result.status, 'arrived');
  assert.ok(Math.hypot(position.x - 4, position.z) <= 2.4);
});

test('无路可走时停止而不是持续卡住，入口不会提前停止', () => {
  const world = { config: { size: [12, 12] }, colliders: [{ x: 0, z: 0, w: 1, d: 12 }] };
  const position = new THREE.Vector3(-2, 0, 0), walk = new AutoWalk(destination(4, 0));
  let result;
  for (let i = 0; i < 60; i++) {
    result = walk.update(world, position, .05);
    if (result.status !== 'walking') break;
    moveWithCollision(position, result.direction.x * .1, result.direction.z * .1, world.config.size, world.colliders);
  }
  assert.equal(result.status, 'blocked');
  const portal = new AutoWalk(destination(-1, 0), true);
  assert.equal(portal.update({ config: { size: [12, 12] }, colliders: [] }, position, .05).status, 'walking');
});

test('刚过门返回时先离开入口锁存范围', () => {
  const world = { config: { size: [12, 12] }, colliders: [] };
  const portal = new AutoWalk(destination(0, 0), true), player = new THREE.Vector3(0, 0, -1);
  assert.ok(portal.update(world, player, .05, true).direction.z < 0);
  assert.ok(portal.update(world, player, .05, false).direction.z > 0);
});
