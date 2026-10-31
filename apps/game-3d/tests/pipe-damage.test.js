import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPipeDamage } from '../src/pipe-damage.js';
import { disposePracticeObject } from '../src/practice-geometry.js';

test('管道按成功次数显示裂纹或破口，失败重试可恢复完整外观', () => {
  const anchor = new THREE.Group();
  const damage = createPipeDamage(anchor);
  const [crack, opening] = damage.root.children;
  for (const [hits, expected] of [[0, [false, false]], [2, [false, false]], [3, [true, false]], [4, [true, false]], [5, [false, true]], [0, [false, false]]]) {
    damage.setHits(hits);
    assert.deepEqual([crack.visible, opening.visible], expected);
  }
  assert.ok(crack.children.length >= 6 && opening.children.length === 2);
  disposePracticeObject(damage.root);
  assert.equal(anchor.children.length, 0);
});
