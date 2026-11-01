import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { PORTALS, entryPosition, transitionOrientation } from '../src/navigation.js';
import { cellDoorTransform } from '../src/cell-corridor-vista.js';
import { AutoTravel } from '../src/auto-travel.js';
import { canStand } from '../src/movement.js';

test('牢房和走廊的门洞对齐，双向远景与背景墙开口对应', () => {
  const cell = createWorld(SCENE_BY_ID.get('cell'));
  const corridor = createWorld(SCENE_BY_ID.get('cellCorridor'));
  const inside = corridor.root.getObjectByName('走廊门内的牢房');
  const outside = cell.root.getObjectByName('牢房门外的走廊');
  assert.ok(inside && outside);
  const opening = new THREE.Vector3(PORTALS.cell.cellCorridor[0], 0, 6.2);
  inside.updateWorldMatrix(true, false); inside.localToWorld(opening);
  assert.ok(Math.abs(opening.x - 6.1) < 1e-6 && Math.abs(opening.z) < 1e-6);
  const inverse = new THREE.Vector3(6.1, 0, 0);
  outside.updateWorldMatrix(true, false); outside.localToWorld(inverse);
  assert.ok(Math.abs(inverse.x - PORTALS.cell.cellCorridor[0]) < 1e-6 && Math.abs(inverse.z - 6.2) < 1e-6);
  assert.deepEqual(cellDoorTransform(), { x: 12.3, z: 3.8 });
  assert.equal(corridor.vistaAnchors.filter(a => a.userData.assetKey.startsWith('cell')).length, 4);
  assert.equal(cell.vistaAnchors.length, 1);
  assert.ok(cell.vistaAnchors.every(a => !cell.anchors.includes(a)));
  assert.equal(cell.cameraColliders.filter(c => c.z > 7 && c.w > .25).length, 2);
  assert.equal(corridor.cameraColliders.filter(c => c.x > 7 && c.d > .25).length, 2);
  const first = transitionOrientation('cell', 'cellCorridor', .3, .8);
  const back = transitionOrientation('cellCorridor', 'cell', first.yaw, first.facing);
  assert.ok(Math.abs(back.yaw - .3) < 1e-9 && Math.abs(back.facing - .8) < 1e-9);
  disposeWorld(cell); disposeWorld(corridor);
});

test('牢房与走廊过门落点靠近同一门洞，返回入口先锁存', () => {
  const cell = createWorld(SCENE_BY_ID.get('cell'));
  const corridor = createWorld(SCENE_BY_ID.get('cellCorridor'));
  for (const [world, from, previous, portalId] of [
    [corridor, 'cell', { x: -3.8, z: 4.25 }, 'cell'],
    [cell, 'cellCorridor', { x: 3.85, z: 0 }, 'cellCorridor'],
  ]) {
    const point = entryPosition(world, from, null, previous);
    const portal = world.portals.find(item => item.id === portalId);
    assert.ok(canStand(point.x, point.z, world.config.size, world.colliders));
    assert.ok(Math.hypot(point.x - portal.object.position.x, point.z - portal.object.position.z) < 1.6);
    assert.equal(new AutoTravel(point, world.portals).next(point, true, true, world.portals), null);
  }
  assert.deepEqual(entryPosition(corridor, 'cell', null, { x: 100, z: 100 }), entryPosition(corridor, 'cell'));
  disposeWorld(cell); disposeWorld(corridor);
});
