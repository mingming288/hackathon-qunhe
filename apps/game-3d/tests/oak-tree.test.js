import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { canStand } from '../src/movement.js';

test('橡树保留可接近的树干，枝桠和树冠使用合批几何', () => {
  const world = createWorld(SCENE_BY_ID.get('oak'));
  const oak = world.anchors.find(anchor => anchor.userData.assetKey === 'oak' && anchor.position.x === -6 && anchor.position.z === -7);
  const batches = oak.userData.placeholder.children.filter(child => child.isInstancedMesh);
  assert.deepEqual(batches.map(batch => batch.count), [8, 17]);
  const size = new THREE.Box3().setFromObject(oak).getSize(new THREE.Vector3());
  assert.ok(size.y > 6 && size.y < 8 && size.x < 8);
  const other = world.anchors.find(anchor => anchor.userData.assetKey === 'oak' && anchor !== oak);
  assert.ok(size.x > new THREE.Box3().setFromObject(other).getSize(new THREE.Vector3()).x, '剧情橡树应比背景树醒目');
  assert.ok(canStand(-4.6, -5.5, world.config.size, world.colliders), '标记石仍可接近');
  disposeWorld(world);
});
