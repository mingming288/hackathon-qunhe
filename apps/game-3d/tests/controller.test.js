import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ThirdPersonController } from '../src/controller.js';
import { WorldView } from '../src/world-view.js';
import { AutoTravel } from '../src/auto-travel.js';

function setup(context) {
  const browserWindow = new EventTarget();
  const browserDocument = Object.assign(new EventTarget(), {
    hidden: false,
    querySelectorAll: () => [],
    getElementById: () => null,
  });
  for (const [name, value] of Object.entries({
    window: browserWindow, document: browserDocument, innerWidth: 800, innerHeight: 600,
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    context.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    });
  }
  const canvas = Object.assign(new EventTarget(), {
    focus() {}, setPointerCapture() {}, closest: () => null,
  });
  const player = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(48, 4 / 3, .1, 130);
  camera.position.set(0, 1.45 + Math.sin(.55) * 7, Math.cos(.55) * 7);
  const controls = new ThirdPersonController(camera, player, canvas);
  const world = { config: { size: [100, 100] }, colliders: [], animations: [], portals: [] };
  const view = Object.assign(Object.create(WorldView.prototype), {
    last: 0, elapsed: 0, savedAt: 0, world, controls, hero: player, camera, canvas,
    heroVisual: { userData: { animate() {} } }, environmentOnly: false,
    enabled: () => true, orbit: {}, mixers: [], interactions: [], labels: [],
    button: { hidden: true }, renderer: { render() {} }, onAutosave() {},
    autoTravel: new AutoTravel(player.position, world.portals),
  });
  return { controls, player, camera, world, view, canvas, browserWindow, browserDocument };
}

test('重置镜头时位于人物身后并朝向人物前方', context => {
  const { player, camera, controls, view } = setup(context);
  for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    player.rotation.y = facing;
    view.resetCamera();
    const forward = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    const cameraOffset = camera.position.clone().sub(player.position).setY(0).normalize();
    assert.ok(cameraOffset.dot(forward) < -.999999);
    assert.ok(Math.abs(Math.sin(controls.yaw - facing - Math.PI)) < 1e-9);
  }
});

function key(browserWindow, canvas, type, code) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code, key: code });
  Object.defineProperty(event, 'target', { value: canvas });
  browserWindow.dispatchEvent(event);
}

test('镜头平滑跟随人物方向，持续按键时人物沿直线移动', context => {
  const { controls, player, camera, world } = setup(context);
  player.rotation.y = Math.PI;
  controls.keys.add('KeyD');
  for (let frame = 0; frame < 180; frame++) controls.update(1 / 60, world);
  assert.ok(player.position.x > 9 && Math.abs(player.position.z) < 1e-8);
  const forward = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
  const offset = camera.position.clone().sub(player.position).setY(0).normalize();
  assert.ok(offset.dot(forward) < -.99);
});

test('walking starts, reverses and stops on the next frame', context => {
  const { controls, player, world, canvas, browserWindow } = setup(context);
  key(browserWindow, canvas, 'keydown', 'KeyW');
  assert.ok(Math.abs(controls.update(1 / 60, world) - 3.3) < 1e-9);
  assert.ok(player.position.z < 0);
  key(browserWindow, canvas, 'keyup', 'KeyW');
  key(browserWindow, canvas, 'keydown', 'KeyS');
  controls.update(1 / 60, world);
  assert.ok(Math.abs(player.position.z) < 1e-9);
  key(browserWindow, canvas, 'keyup', 'KeyS');
  assert.equal(controls.update(1 / 60, world), 0);
});

test('camera avoids walls immediately and eases back without delaying movement', context => {
  const { controls, player, camera, world } = setup(context);
  const target = () => player.position.clone().add(new THREE.Vector3(0, 1.45, 0));
  world.cameraColliders = [{ x: 0, z: 3, w: 10, d: .2, h: 6, camera: true }];
  controls.update(1 / 60, world);
  const blockedDistance = camera.position.distanceTo(target());
  assert.ok(blockedDistance < 3);
  world.cameraColliders = [];
  controls.keys.add('KeyS');
  controls.update(1 / 60, world);
  const clearingDistance = camera.position.distanceTo(target());
  assert.ok(clearingDistance > blockedDistance && clearingDistance < 7);
  controls.reset();
  controls.update(0, world);
  assert.ok(Math.abs(camera.position.distanceTo(target()) - 7) < 1e-9);
});

test('walking and sprinting cover the same distance at 60 through 5 fps', context => {
  const { controls, player, view } = setup(context);
  controls.keys.add('KeyW');
  for (const sprint of [false, true]) {
    if (sprint) controls.keys.add('ShiftLeft');
    for (const fps of [60, 30, 20, 15, 10, 5]) {
      player.position.set(0, 0, 0); view.last = 0;
      for (let frame = 1; frame <= fps; frame++) view.tick(frame * 1000 / fps);
      assert.ok(Math.abs(-player.position.z - (sprint ? 5.2 : 3.3)) < 1e-9, `${fps} fps, sprint=${sprint}`);
    }
  }
});

test('slow frames still collide with thin walls and allow sliding', context => {
  const { controls, player, world, view } = setup(context);
  world.colliders = [{ x: 0, z: 0, w: .2, d: 20, h: 3, camera: true }];
  player.position.set(-1, 0, 0);
  controls.keys.add('KeyD'); controls.keys.add('KeyS');
  for (let frame = 1; frame <= 10; frame++) view.tick(frame * 100);
  assert.ok(player.position.x <= -.46);
  assert.ok(player.position.z > 2.3);
});

test('long stalls and hidden frames do not move the player or advance animations', context => {
  const { controls, player, view, browserDocument } = setup(context);
  controls.keys.add('KeyW');
  view.tick(100);
  const position = player.position.clone(), elapsed = view.elapsed;
  view.tick(5100);
  assert.deepEqual(player.position, position);
  assert.equal(view.elapsed, elapsed);
  browserDocument.hidden = true;
  view.tick(5200);
  assert.deepEqual(player.position, position);
  assert.equal(view.elapsed, elapsed);
  browserDocument.hidden = false; view.last = null;
  view.tick(5300);
  assert.deepEqual(player.position, position);
  view.tick(5400);
  assert.ok(Math.abs(position.z - player.position.z - .33) < 1e-9);
});

test('losing focus or hiding the page releases movement keys', context => {
  const { controls, canvas, browserWindow, browserDocument } = setup(context);
  key(browserWindow, canvas, 'keydown', 'KeyW');
  browserWindow.dispatchEvent(new Event('blur'));
  assert.equal(controls.keys.size, 0);
  key(browserWindow, canvas, 'keydown', 'KeyS');
  browserDocument.hidden = true;
  browserDocument.dispatchEvent(new Event('visibilitychange'));
  assert.equal(controls.keys.size, 0);
});
