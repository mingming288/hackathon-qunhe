import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SceneLoadGate } from '../src/scene-load-gate.js';
import { ThirdPersonController } from '../src/controller.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';

test('加载场景期间角色不移动，旧加载完成不能解除新场景限制', () => {
  const gate = new SceneLoadGate(), world = createWorld(SCENE_BY_ID.get('cell'));
  const old = gate.begin(true), current = gate.begin(true);
  assert.equal(gate.finish(old), false);
  assert.equal(gate.active, true);
  const player = new THREE.Group(); player.position.set(0, 0, 3);
  const controller = Object.assign(Object.create(ThirdPersonController.prototype), {
    camera: new THREE.PerspectiveCamera(), player, yaw: 0, pitch: .4, distance: 7,
    followDistance: null, motionYaw: null,
    up: new THREE.Vector3(0, 1, 0), direction: new THREE.Vector3(),
    target: new THREE.Vector3(), offset: new THREE.Vector3(),
    ray: new THREE.Ray(), hit: new THREE.Vector3(), bounds: new THREE.Box3(),
    keys: new Set(['KeyW']), enabled: () => !gate.active,
  });
  controller.update(.1, world);
  assert.equal(player.position.z, 3);
  assert.equal(gate.finish(current), true);
  controller.update(.1, world);
  assert.ok(player.position.z < 3);
  const preview = gate.begin(false);
  assert.equal(gate.active, false);
  assert.equal(gate.finish(preview), true);
  disposeWorld(world);
});
