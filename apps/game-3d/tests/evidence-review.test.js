import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceReview } from '../src/evidence-review.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import * as THREE from 'three';
import { assetState } from '../src/asset-catalog.js';

test('核对只展示已取得的证据和旁听记录', () => {
  const lines = evidenceReview({ evidence: ['red', 'tommy'], observed: ['dates'] }).join('\n');
  assert.match(lines, /瑞德.*结算日期/); assert.match(lines, /汤米.*转移证言/);
  assert.match(lines, /门口车辆/); assert.doesNotMatch(lines, /老布|弗洛伊德|夜车与点名/);
  assert.match(evidenceReview({ evidence: ['haywood'], observed: [] }).join(''), /417.*六月十二日/);
});

test('证据板保留独立纸张、图钉和连线', () => {
  const world = createWorld(SCENE_BY_ID.get('evidence'));
  const board = world.anchors.find(anchor => anchor.userData.assetKey === 'evidenceBoard');
  assert.ok(board.userData.placeholder.children.length >= 40);
  assert.equal(board.userData.placeholder.children.filter(mesh => mesh.geometry?.type === 'SphereGeometry').length, 6);
  for (const kind of ['desk', 'ledger', 'letter', 'postbox']) {
    const anchor = world.anchors.find(item => item.userData.assetKey === kind);
    assert.ok(anchor.userData.placeholder.children.length >= 6, kind + ' 应有独立的可见细节');
    assert.equal(assetState(kind, {}, 'evidence'), '已内置道具');
  }
  const desk = world.anchors.find(item => item.userData.assetKey === 'desk');
  const deskTop = new THREE.Box3().setFromObject(desk).max.y;
  for (const kind of ['ledger', 'letter']) {
    const prop = world.anchors.find(item => item.userData.assetKey === kind);
    const bounds = new THREE.Box3().setFromObject(prop);
    assert.ok(Math.abs(bounds.min.y - deskTop) < .03, kind + ' 应放在桌面上');
  }
  disposeWorld(world);
});
