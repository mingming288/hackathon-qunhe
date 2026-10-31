import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceReview } from '../src/evidence-review.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';

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
  disposeWorld(world);
});
