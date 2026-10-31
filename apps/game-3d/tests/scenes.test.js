import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand, moveWithCollision } from '../src/movement.js';
import { validateModelEntry } from '../src/assets.js';

test('全部十九组场景可以构造，出生点安全，出入口可通过行走抵达', () => {
  assert.equal(SCENES.length, 19); assert.equal(SCENE_BY_ID.size, 19);
  for (const config of SCENES) {
    const world = createWorld(config);
    assert.ok(config.links.every(id => SCENE_BY_ID.has(id)), config.id + ' 存在无效场景链接');
    assert.ok(canStand(...config.spawn, config.size, world.colliders), config.id + ' 出生点被阻挡');
    assert.ok(world.anchors.length > 0);
    const step = .5, queue = [[...config.spawn]], visited = new Set(['0:0']);
    const reached = new Set();
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      world.portals.forEach(portal => { if (Math.hypot(portal.object.position.x - x, portal.object.position.z - z) < 1.5) reached.add(portal.id); });
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz;
        const key = Math.round((nx - config.spawn[0]) / step) + ':' + Math.round((nz - config.spawn[1]) / step);
        if (!visited.has(key) && canStand(nx, nz, config.size, world.colliders)) { visited.add(key); queue.push([nx, nz]); }
      }
    }
    assert.equal(reached.size, world.portals.length, config.id + ' 存在不可达的出入口');
    disposeWorld(world);
    assert.equal(world.root.children.length, 0);
  }
  const visited = new Set(), queue = ['livingRoom'];
  while (queue.length) {
    const id = queue.shift(); if (visited.has(id)) continue;
    visited.add(id); queue.push(...SCENE_BY_ID.get(id).links);
  }
  assert.equal(visited.size, 19, '从序章出发应能访问全部场景');
});

test('长距离移动不会穿过薄墙，沿墙移动仍可继续', () => {
  const colliders = [{ x: 0, z: 0, w: .2, d: 6 }];
  const position = { x: -2, z: 0 };
  moveWithCollision(position, 5, 2, [20, 20], colliders);
  assert.ok(position.x < -.4); assert.ok(position.z > 1.8);
  assert.equal(canStand(10, 0, [20, 20], []), false);
});

test('替换模型限定本应用路径，并拒绝不合法尺寸', () => {
  assert.equal(validateModelEntry({ url: '/assets/models/red.glb', height: 2.5 }).height, 2.5);
  for (const url of ['https://example.com/a.glb', '/assets/models/../../secret.glb', '/assets/models/a.glb?token=x', '/assets/models/a.obj', '/assets/models/%2e%2e/secret.glb']) {
    assert.throws(() => validateModelEntry({ url }), url);
  }
  assert.throws(() => validateModelEntry({ url: '/assets/models/a.glb', height: -1 }));
});
