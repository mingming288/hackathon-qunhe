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
