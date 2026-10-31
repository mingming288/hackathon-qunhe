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

test('赴约巴士位于原碰撞范围内，侧面可以进入驾驶关卡', () => {
  const world = createWorld(SCENE_BY_ID.get('road'));
  const bus = world.anchors.find(anchor => anchor.userData.assetKey === 'bus');
  const size = new THREE.Box3().setFromObject(bus).getSize(new THREE.Vector3());
  assert.ok(size.x <= 3 && size.z <= 7.2 && size.y > 2.8);
  assert.ok(bus.userData.placeholder.children.length > 30);
  const point = { x: bus.position.x + 2, z: bus.position.z };
  assert.ok(canStand(point.x, point.z, world.config.size, world.colliders));
  assert.ok(Math.hypot(point.x - bus.position.x, point.z - bus.position.z) < 2.7);
  disposeWorld(world);
});

test('海滩旧船的船头留有可交互位置', () => {
  const world = createWorld(SCENE_BY_ID.get('beach'));
  const boat = world.anchors.find(anchor => anchor.userData.assetKey === 'boat');
  const size = new THREE.Box3().setFromObject(boat).getSize(new THREE.Vector3());
  assert.ok(size.x <= 2.7 && size.z <= 6.7 && size.y > .9);
  assert.ok(boat.userData.placeholder.children.length > 20, '船壳、肋骨和座板应独立可见');
  const point = { x: boat.position.x, z: boat.position.z + 3.8 };
  assert.ok(canStand(point.x, point.z, world.config.size, world.colliders));
  assert.ok(Math.hypot(point.x - boat.position.x, point.z - boat.position.z) < 4.2);
  const toolbox = world.anchors.find(anchor => anchor.userData.assetKey === 'toolbox');
  const toolboxBounds = new THREE.Box3().setFromObject(toolbox);
  assert.ok(toolbox.userData.placeholder.children.length > 15, '工具箱应包含提手、金属件和木槌');
  assert.ok(toolboxBounds.min.x > new THREE.Box3().setFromObject(boat).max.x, '工具箱不能穿入船体');
  assert.ok(canStand(toolbox.position.x, toolbox.position.z, world.config.size, world.colliders));
  disposeWorld(world);
});
