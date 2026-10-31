import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';
import { assetState } from '../src/asset-catalog.js';

test('医疗记录推车在原位置且有脚轮、抽屉和文件，玩家可接近', () => {
  const world = createWorld(SCENE_BY_ID.get('operatingRoom'));
  const cart = world.anchors.find(anchor => anchor.userData.assetKey === 'medicalCart');
  assert.deepEqual([cart.position.x, cart.position.z], [5, -4]);
  const size = new THREE.Box3().setFromObject(cart).getSize(new THREE.Vector3());
  assert.ok(size.x < 2.6 && size.z < 1.6 && size.y > 1.4);
  assert.ok(cart.userData.placeholder.children.length > 25);
  assert.equal(assetState('medicalCart', {}, 'operatingRoom'), '已内置道具');
  assert.ok(canStand(5, -2, world.config.size, world.colliders));
  disposeWorld(world);
});

test('手术台和手术灯替换为独立陈设，保留原有位置和通路', () => {
  const world = createWorld(SCENE_BY_ID.get('operatingRoom'));
  const table = world.anchors.find(anchor => anchor.userData.assetKey === 'operatingTable');
  const lamp = world.anchors.find(anchor => anchor.userData.assetKey === 'lamp');
  const size = new THREE.Box3().setFromObject(table).getSize(new THREE.Vector3());
  assert.ok(size.x <= 2.2 && size.z <= 3.6);
  assert.ok(table.userData.placeholder.children.length >= 20);
  assert.ok(lamp.userData.placeholder.children.length >= 10);
  assert.equal(assetState('operatingTable', {}, 'operatingRoom'), '已内置道具');
  assert.equal(assetState('lamp', {}, 'operatingRoom'), '已内置道具');
  assert.ok(canStand(0, 1, world.config.size, world.colliders));
  disposeWorld(world);
});
