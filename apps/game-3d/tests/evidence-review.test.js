import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceReview, investigationJournal } from '../src/evidence-review.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import * as THREE from 'three';
import { assetState } from '../src/asset-catalog.js';
import { createGame, getTask, advance, getActions } from '../src/story.js';
import { TASK_BY_ID } from '../src/story-data.js';

test('核对只展示已取得的证据和旁听记录', () => {
  const lines = evidenceReview({ evidence: ['red', 'tommy'], observed: ['dates'] }).join('\n');
  assert.match(lines, /瑞德.*结算日期/); assert.match(lines, /汤米.*转移证言/);
  assert.match(lines, /门口车辆/); assert.doesNotMatch(lines, /老布|弗洛伊德|夜车与点名/);
  assert.doesNotMatch(lines, /橡树/, '私人约定不应作为资金线索写入证据板');
  assert.match(evidenceReview({ evidence: ['haywood'], observed: [] }).join(''), /417.*六月十二日/);
});

test('瑞德的约定在交谈时可见；调查前先介绍温顿与医疗机构的关系', () => {
  let game = createGame();
  while (game.step !== 'takeHammer') { const task = getTask(game); game = advance(game, task.id, task.scene).game; }
  const red = getActions(game, 'yard').find(action => action.id === 'evidence:red');
  assert.match(red.lines.join(''), /石墙.*橡树/);
  assert.match(TASK_BY_ID.get('twoInvestigate').lines.join(''), /温顿.*机构/);
  assert.match(TASK_BY_ID.get('twoMedical').lines.join(''), /接收记录.*转运名单/);
  assert.match(TASK_BY_ID.get('twoArrest').lines.join(''), /另一组.*温顿/);
});

test('线索记录只展示已收集内容，并保留瑞德的私人约定', () => {
  const empty = investigationJournal({ evidence: [], observed: [] }).join('\n');
  assert.match(empty, /暂时还没有调查记录/);
  assert.doesNotMatch(empty, /瑞德|老布|橡树/);
  const game = { evidence: ['red'], observed: ['nightTruck'] };
  const before = structuredClone(game), lines = investigationJournal(game).join('\n');
  assert.match(lines, /线索 1\/5，旁听 1\/2/);
  assert.match(lines, /瑞德.*结算日期/);
  assert.match(lines, /夜车.*点名人数减少/);
  assert.match(lines, /约定.*橡树/);
  assert.doesNotMatch(lines, /老布|汤米|门口车辆/);
  assert.deepEqual(game, before, '查看记录不能改变剧情进度');
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
