import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { PORTALS, transitionOrientation } from '../src/navigation.js';
import { corridorYardTransform } from '../src/corridor-yard-vista.js';

test('走廊与院子的入口在远景坐标中对齐，视野不被补景墙遮挡', () => {
  const world = createWorld(SCENE_BY_ID.get('cellCorridor'));
  const root = world.root.getObjectByName('走廊外的院子');
  assert.ok(root);
  const entry = new THREE.Vector3(...[PORTALS.yard.cellCorridor[0], 0, PORTALS.yard.cellCorridor[1]]);
  root.updateWorldMatrix(true, false); root.localToWorld(entry);
  assert.ok(Math.abs(entry.z - PORTALS.cellCorridor.yard[1]) < 1e-6);
  assert.equal(corridorYardTransform(), 29.5);
  assert.equal(world.vistaAnchors.filter(anchor => anchor.userData.assetKey.startsWith('yard-')).length, 3);
  assert.ok(world.vistaAnchors.every(anchor => anchor.userData.clipPlane));
  const front = world.cameraColliders.filter(item => item.z > 0 && item.w > .25);
  assert.equal(front.length, 2);
  assert.ok(front.every(item => Math.abs(item.x) - item.w / 2 > 5));
  const preview = createWorld(SCENE_BY_ID.get('cellCorridor'), { includeCharacters: false, includeHelpers: false });
  assert.equal(preview.vistaAnchors, undefined);
  disposeWorld(world); disposeWorld(preview);
});

test('院子回望走廊使用同一入口坐标，远景不会变成可交互场景', () => {
  const world = createWorld(SCENE_BY_ID.get('yard'));
  const root = world.root.getObjectByName('院子外的监区走廊');
  assert.ok(root);
  const entry = new THREE.Vector3(PORTALS.cellCorridor.yard[0], 0, PORTALS.cellCorridor.yard[1]);
  root.updateWorldMatrix(true, false); root.localToWorld(entry);
  assert.ok(Math.abs(entry.z - PORTALS.yard.cellCorridor[1]) < 1e-6);
  assert.equal(world.vistaAnchors.length, 1);
  assert.equal(world.vistaAnchors[0].userData.assetKey, 'cellCorridor-architecture');
  assert.ok(!world.anchors.includes(world.vistaAnchors[0]));
  const preview = createWorld(SCENE_BY_ID.get('yard'), { includeCharacters: false, includeHelpers: false });
  assert.equal(preview.vistaAnchors, undefined);
  disposeWorld(world); disposeWorld(preview);
});

test('院子与走廊往返时视角和人物方向使用同一坐标变换', () => {
  const first = transitionOrientation('cellCorridor', 'yard', .42, 1.2);
  assert.equal(first.yaw, .42 + Math.PI);
  assert.equal(first.facing, 1.2 + Math.PI);
  const back = transitionOrientation('yard', 'cellCorridor', first.yaw, first.facing);
  assert.ok(Math.abs(Math.sin(back.yaw - .42)) < 1e-9);
  assert.ok(Math.abs(Math.sin(back.facing - 1.2)) < 1e-9);
  assert.deepEqual(transitionOrientation('cell', 'cellCorridor', .42, 1.2), { yaw: .42 - Math.PI / 2, facing: 1.2 - Math.PI / 2 });
});
