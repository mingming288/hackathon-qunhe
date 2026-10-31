import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';

test('超市商品和纸袋位于柜台上且可以从柜台前互动', () => {
  const world = createWorld(SCENE_BY_ID.get('supermarket'));
  const counter = world.anchors.find(a => a.userData.assetKey === 'counter');
  const surface = new THREE.Box3().setFromObject(counter);
  for (const kind of ['bag', 'groceries']) {
    const item = world.anchors.find(a => a.userData.assetKey === kind);
    const bounds = new THREE.Box3().setFromObject(item);
    assert.ok(bounds.min.x >= surface.min.x && bounds.max.x <= surface.max.x, kind);
    assert.ok(bounds.min.z >= surface.min.z && bounds.max.z <= surface.max.z, kind);
    assert.ok(Math.abs(bounds.min.y - surface.max.y) < .02, kind);
    assert.ok(canStand(item.position.x, 6.3, world.config.size, world.colliders), kind);
    assert.ok(Math.abs(item.position.z - 6.3) < 2.5, kind);
    assert.ok(item.userData.placeholder.children.length >= 5, kind);
  }
  disposeWorld(world);
});

test('超市货架使用成批商品并保持既有碰撞尺寸', () => {
  const world = createWorld(SCENE_BY_ID.get('supermarket'));
  const shelves = world.anchors.filter(a => a.userData.assetKey === 'shelf');
  assert.equal(shelves.length, 3);
  for (const shelf of shelves) {
    const batches = shelf.userData.placeholder.children.filter(child => child.isInstancedMesh);
    assert.deepEqual(batches.map(batch => batch.count), [24, 24]);
    const size = new THREE.Box3().setFromObject(shelf).getSize(new THREE.Vector3());
    assert.ok(size.x <= 3.6 && size.z <= 1.1 && size.y <= 3.5);
  }
  const freezer = world.anchors.find(a => a.userData.assetKey === 'freezer');
  assert.ok(freezer.userData.placeholder.children.length > 5);
  const size = new THREE.Box3().setFromObject(freezer).getSize(new THREE.Vector3());
  assert.ok(size.x <= 2.8 && size.z <= 1.8);
  disposeWorld(world);
});
