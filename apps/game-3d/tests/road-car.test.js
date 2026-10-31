import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';
import * as THREE from 'three';

test('公路轿车保留尺寸与位置，车尾可接近并触发剧情', () => {
  const world = createWorld(SCENE_BY_ID.get('road'));
  const car = world.anchors.find(anchor => anchor.userData.assetKey === 'car');
  assert.deepEqual([car.position.x, car.position.z], [-3, 0]);
  const size = new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3());
  assert.ok(size.x <= 2.5 && size.z <= 4.9 && size.y > 1.8);
  assert.ok(car.userData.placeholder.children.length > 15);
  assert.ok(canStand(-3, 2.9, world.config.size, world.colliders));
  assert.ok(2.9 < 3.4, '车尾在互动范围内');
  disposeWorld(world);
});

test('海滩旧船的船头留有可交互位置', () => {
  const world = createWorld(SCENE_BY_ID.get('beach'));
  const boat = world.anchors.find(anchor => anchor.userData.assetKey === 'boat');
  const point = { x: boat.position.x, z: boat.position.z + 3.8 };
  assert.ok(canStand(point.x, point.z, world.config.size, world.colliders));
  assert.ok(Math.hypot(point.x - boat.position.x, point.z - boat.position.z) < 4.2);
  disposeWorld(world);
});
