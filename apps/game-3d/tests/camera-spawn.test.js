import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ThirdPersonController } from '../src/controller.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';

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

test('靠近牢房出口的镜头不会被最小距离推入前墙', () => {
  const world = createWorld(SCENE_BY_ID.get('cell'));
  const player = new THREE.Group(); player.position.set(-3.8, 0, 5.3);
  const camera = new THREE.PerspectiveCamera(); camera.position.set(-3.8, 4, 12);
  const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
    camera, player, yaw: 0, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
  });
  controller.update(.016, world);
  assert.ok(camera.position.z < 5.95, '镜头应留在实际墙体前');
  assert.ok(canStand(-3.8, 5.4, world.config.size, world.colliders), '牢门仍可通过');
  assert.equal(canStand(0, 6, world.config.size, world.colliders), false, '不能走入前墙');
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

test('从挖掘通道进入砸管处时，镜头不会越过入口门楣', async () => {
  const { entryPosition, transitionOrientation } = await import('../src/navigation.js');
  const world = createWorld(SCENE_BY_ID.get('pipe'));
  const position = entryPosition(world, 'dig');
  const portal = world.portals.find(portal => portal.id === 'dig').object.position;
  const { yaw } = transitionOrientation('dig', 'pipe', 0, 0, { position, portal });
  const player = new THREE.Group(); player.position.set(position.x, 0, position.z);
  const target = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(target).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(.4), Math.sin(.4), Math.cos(yaw) * Math.cos(.4)).multiplyScalar(7));
  const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
    camera, player, yaw, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
  });
  controller.update(.016, world);
  assert.ok(camera.position.z < 9, '镜头应留在入口门楣内侧');
  disposeWorld(world);
});

test('地下管网窄通道中的镜头不穿过迷宫隔墙', () => {
  const world = createWorld(SCENE_BY_ID.get('pipeNetwork'));
  for (const z of [4.3, 6.1]) {
    const player = new THREE.Group(); player.position.set(6, 0, z);
    const target = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const camera = new THREE.PerspectiveCamera();
    camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(.4), Math.cos(.4)).multiplyScalar(7));
    const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
      camera, player, yaw: 0, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
    });
    controller.update(.016, world);
    assert.ok(camera.position.z < 6.5, `镜头穿入隔墙：${z}`);
    assert.ok(camera.position.z > z, '镜头保持在人物背后');
  }
  disposeWorld(world);
});

test('银行剧情落点的镜头留在入口建筑内侧', () => {
  const world = createWorld(SCENE_BY_ID.get('bank'));
  const player = new THREE.Group(); player.position.set(...[world.config.spawn[0], 0, world.config.spawn[1]]);
  const target = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(.4), Math.cos(.4)).multiplyScalar(7));
  const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
    camera, player, yaw: 0, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
  });
  controller.update(.016, world);
  assert.ok(camera.position.z < 7.4, '镜头不能穿过银行入口上沿');
  disposeWorld(world);
});

test('证据室出生与返回落点的镜头保持在前墙内', async () => {
  const { entryPosition } = await import('../src/navigation.js');
  const world = createWorld(SCENE_BY_ID.get('evidence'));
  for (const from of [null, 'medicalExterior']) {
    const position = entryPosition(world, from);
    const player = new THREE.Group(); player.position.set(position.x, 0, position.z);
    const target = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const camera = new THREE.PerspectiveCamera();
    camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(.4), Math.cos(.4)).multiplyScalar(7));
    const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
      camera, player, yaw: 0, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
    });
    controller.update(.016, world);
    assert.ok(camera.position.z < 5.6, '镜头不能穿过前墙');
    assert.ok(camera.position.distanceTo(target) > 2, '返回落点应为人物留出观察空间');
  }
  disposeWorld(world);
});

test('瑞德进入超市时镜头位于门口上沿内侧', () => {
  const world = createWorld(SCENE_BY_ID.get('supermarket'));
  const player = new THREE.Group(); player.position.set(world.config.spawn[0], 0, world.config.spawn[1]);
  const target = player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(.4), Math.cos(.4)).multiplyScalar(7));
  const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
    camera, player, yaw: 0, pitch: .4, distance: 7, keys: new Set(), enabled: () => true,
  });
  controller.update(.016, world);
  assert.ok(camera.position.z < 11, '镜头不能穿过入口上沿');
  disposeWorld(world);
});
