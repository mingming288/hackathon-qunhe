import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ThirdPersonController } from '../src/controller.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';

test('牢房出生镜头留在前墙内，且角色仍能靠近门口', () => {
  const world = createWorld(SCENE_BY_ID.get('cell'));
  const player = new THREE.Group(); player.position.set(0, 0, 3);
  const camera = new THREE.PerspectiveCamera();
  const target = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
  camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(.4), Math.cos(.4)).multiplyScalar(7));
  const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
    camera, player, yaw: 0, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
  });
  controller.update(.016, world);
  assert.ok(camera.position.z < 6, '镜头应位于前墙内侧');
  assert.ok(camera.position.z > player.position.z, '镜头应留在角色背后');
  assert.ok(!world.colliders.some(collider => collider.z === 6.2 && collider.w === 12.4), '镜头避让不能阻挡角色');
  disposeWorld(world);
});

test('沿走廊行走时镜头不能越过两侧墙顶或门洞', () => {
  const world = createWorld(SCENE_BY_ID.get('cellCorridor'));
  for (const yaw of [-Math.PI / 2, Math.PI / 2]) for (const z of [0, 5.6, 11.2]) {
    const player = new THREE.Group(); player.position.set(0, 0, z);
    const camera = new THREE.PerspectiveCamera(), target = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    camera.position.copy(target).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(.4), Math.sin(.4), Math.cos(yaw) * Math.cos(.4)).multiplyScalar(7));
    const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
      camera, player, yaw, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
    });
    controller.update(.016, world);
    assert.ok(Math.abs(camera.position.x) < 5.6, `镜头不能越过走廊侧墙：${yaw}, ${z}`);
    assert.ok(Math.abs(camera.position.x) > 1, '镜头保留第三人称距离');
  }
  disposeWorld(world);
});
