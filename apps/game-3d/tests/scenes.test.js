import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand, moveWithCollision } from '../src/movement.js';
import { validateModelEntry } from '../src/assets.js';
import { entryPosition } from '../src/navigation.js';
import * as THREE from 'three';

test('场景入口只使用低调的地面指示，不生成悬空门框', () => {
  const world = createWorld(SCENE_BY_ID.get('cell'));
  for (const portal of world.portals) {
    assert.deepEqual(portal.object.children, [portal.ring]);
    assert.equal(portal.ring.material.transparent, true);
  }
  disposeWorld(world);
});

test('结局外景的石墙、道路建筑与医疗机构保留可到达的通路', () => {
  for (const [id, blocked, open] of [
    ['oak', [0, -10], [0, 0]], ['road', [14, 5], [0, 5]],
    ['medicalExterior', [14, -7], [0, -7]]
  ]) {
    const world = createWorld(SCENE_BY_ID.get(id));
    assert.equal(canStand(...blocked, world.config.size, world.colliders), false, id);
    assert.equal(canStand(...open, world.config.size, world.colliders), true, id);
    disposeWorld(world);
  }
});

test('监区走廊两侧门洞可接近，门洞之间的墙垛阻挡通行', () => {
  const world = createWorld(SCENE_BY_ID.get('cellCorridor'));
  for (const x of [-6, 6]) {
    for (const z of [-11.2, -5.6, 0, 5.6, 11.2]) assert.ok(canStand(x, z, world.config.size, world.colliders));
    assert.ok(!canStand(x, 2.8, world.config.size, world.colliders));
  }
  disposeWorld(world);
});

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
      world.portals.forEach(portal => { if (Math.hypot(portal.object.position.x - x, portal.object.position.z - z) < 1.2) reached.add(portal.id); });
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

test('院子可见两栋独立建筑，门口连接对应室内，返回时位于同一门前', () => {
  const world = createWorld(SCENE_BY_ID.get('yard'));
  for (const id of ['library', 'office']) {
    const portal = world.portals.find(item => item.id === id);
    const building = world.anchors.find(anchor => anchor.userData.assetKey === portal.object.userData.exteriorKey);
    assert.ok(building, id + ' 入口必须附着于一栋可替换的建筑');
    const size = new THREE.Box3().setFromObject(building).getSize(new THREE.Vector3());
    assert.ok(size.x > 6 && size.z > 6 && size.y > 6, id + ' 应有完整建筑体量');
    assert.equal(canStand(building.position.x, building.position.z, world.config.size, world.colliders), false, '不能穿过建筑主体');
    assert.ok(SCENE_BY_ID.get(id).links.includes('yard'), '室内必须保留返回院子的出口');
    const entry = entryPosition(world, id);
    assert.ok(canStand(entry.x, entry.z, world.config.size, world.colliders));
    assert.ok(Math.hypot(entry.x - portal.object.position.x, entry.z - portal.object.position.z) < 2.7, '返回落点应在同一建筑门前');
  }
  disposeWorld(world);
});

test('替换模型限定本应用路径，并拒绝不合法尺寸', () => {
  assert.equal(validateModelEntry({ url: '/assets/models/red.glb', height: 2.5 }).height, 2.5);
  for (const url of ['https://example.com/a.glb', '/assets/models/../../secret.glb', '/assets/models/a.glb?token=x', '/assets/models/a.obj', '/assets/models/%2e%2e/secret.glb']) {
    assert.throws(() => validateModelEntry({ url }), url);
  }
  assert.throws(() => validateModelEntry({ url: '/assets/models/a.glb', height: -1 }));
});

test('各场景中的主线互动目标可以从出生点走近', async () => {
  const { TASKS } = await import('../src/story-data.js');
  for (const config of SCENES) {
    const world = createWorld(config), step = .5, queue = [[...config.spawn]], visited = new Set(['0:0']);
    for (let i = 0; i < queue.length; i++) {
      const [x, z] = queue[i];
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx, nz = z + dz;
        const key = Math.round((nx - config.spawn[0]) / step) + ':' + Math.round((nz - config.spawn[1]) / step);
        if (!visited.has(key) && canStand(nx, nz, config.size, world.colliders)) { visited.add(key); queue.push([nx, nz]); }
      }
    }
    for (const task of TASKS.filter(task => task.scene === config.id && !task.automatic && !task.target.startsWith('exit:'))) {
      // 砂浆裂缝由运行时挂在海报位置生成。
      const target = world.anchors.find(anchor => anchor.userData.assetKey === (task.target === 'wallClue' ? 'poster' : task.target));
      assert.ok(target, `${task.id} 缺少互动目标`);
      assert.ok(queue.some(([x, z]) => Math.hypot(x - target.position.x, z - target.position.z - (task.target === 'wallClue' ? .28 : 0)) < 2.7), `${task.id} 无法走近`);
    }
    disposeWorld(world);
  }
});
