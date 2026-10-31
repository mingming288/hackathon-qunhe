import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getTask, getActions, advance, enterScene, restoreGame, travelRule, resolveEnding } from '../src/story.js';
import { TASKS, EVIDENCE } from '../src/story-data.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { nextDoor } from '../src/routes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand } from '../src/movement.js';
import { GAME_KEY, saveGame, loadGame, savePreview } from '../src/save.js';
import { entryPosition } from '../src/navigation.js';

function walk(game, target) {
  for (let count = 0; game.scene !== target; count++) {
    assert.ok(count < 20, '场景路线发生循环');
    const next = nextDoor(game, target); assert.ok(next, game.step + ' 无法从 ' + game.scene + ' 抵达 ' + target);
    game = enterScene(game, next);
  }
  return game;
}
function act(game, id = getTask(game).id) {
  const source = TASKS.find(item => item.id === id)?.scene || (id === 'riskInspection' ? 'yard' : id.startsWith('evidence:') ? EVIDENCE[id.slice(9)][0] : 'yard');
  game = walk(game, source);
  const before = structuredClone(game);
  const result = advance(game, id, game.scene).game;
  assert.deepEqual(game, before, '状态更新不得改写旧快照');
  assert.deepEqual(restoreGame({ version: 1, events: result.events, scene: result.scene }), result, '每个检查点应能恢复一致的任务和道具');
  return result;
}
function play({ evidence = [], observed = false, alternate = false } = {}) {
  let game = createGame(), collected = false, branched = false;
  for (let count = 0; !game.finished; count++) {
    assert.ok(count < 80, '剧情未能结束');
    if (alternate && !branched && game.step === 'meetBrooks') { game = act(game, 'riskInspection'); branched = true; }
    if (!collected && game.step === (alternate ? 'sideRest' : 'hideHammer')) {
      for (const id of evidence) game = act(game, 'evidence:' + id);
      if (observed) { game = act(game, 'observe:nightTruck'); game = act(game, 'observe:dates'); }
      collected = true;
    }
    game = act(game);
  }
  return game;
}

test('标准准备路线能按原结局规则贯通三个结局', () => {
  const one = play({ evidence: ['red'] }); assert.equal(one.finished, '相逢的海滩'); assert.equal(one.scene, 'beach');
  const two = play({ evidence: Object.keys(EVIDENCE) }); assert.equal(two.finished, '高墙下的名单'); assert.equal(two.scene, 'evidence');
  const three = play(); assert.equal(three.finished, '形同陌路'); assert.equal(three.scene, 'supermarket');
});
test('没收石锤后的备用路线仍可找回工具并通关', () => {
  const game = play({ alternate: true, evidence: ['red'] });
  assert.ok(game.events.includes('sideRecover')); assert.ok(game.items.includes('hammer'));
  assert.equal(game.finished, '相逢的海滩');
});
test('四份直接线索与两份旁听记录也进入调查结局', () => {
  assert.equal(play({ evidence: ['red', 'brooks', 'tommy', 'haywood'], observed: true }).finished, '高墙下的名单');
  assert.equal(resolveEnding({ evidence: [], observed: [] }), 'three');
});
test('任务前置条件不可跳过，未知或重复事件不能恢复为有效存档', () => {
  let game = createGame();
  assert.throws(() => advance(game, 'swapLedger', 'office'));
  assert.ok(travelRule(game, 'cell', 'dig'));
  assert.throws(() => enterScene(game, 'cell'));
  assert.throws(() => restoreGame({ version: 1, events: ['watchTv', 'watchTv'], scene: 'yard' }));
  assert.throws(() => restoreGame({ version: 1, events: ['unknown'], scene: 'cell' }));
  assert.throws(() => restoreGame({ version: 1, events: [], scene: 'beach' }));
  game = advance(game, 'watchTv', 'livingRoom').game;
  assert.equal(getActions(game, 'yard')[0].id, 'arrival');
});
test('场景查看记录不会覆盖正式游戏的事件、场景与位置', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  let game = act(createGame()); saveGame(storage, game, { x: 1, z: 4 });
  const original = values.get(GAME_KEY);
  for (const scene of SCENE_BY_ID.keys()) savePreview(storage, scene, { x: 0, z: 0 });
  assert.equal(values.get(GAME_KEY), original);
  assert.deepEqual(loadGame(storage), { game, location: { x: 1, z: 4 } });
});
test('全部剧情目标具有可接近的三维实体，返回入口有安全落脚点', () => {
  const worlds = new Map();
  for (const config of SCENE_BY_ID.values()) {
    const world = createWorld(config); worlds.set(config.id, world);
    for (const portal of world.portals) {
      const entry = entryPosition(world, portal.id);
      assert.ok(canStand(entry.x, entry.z, config.size, world.colliders), config.id + ' 返回入口不安全');
    }
  }
  for (const task of TASKS) {
    const world = worlds.get(task.scene);
    const target = task.target.startsWith('exit:') ? world.portals.find(item => item.id === task.target.slice(5))?.object : world.anchors.find(item => item.userData.assetKey === task.target);
    assert.ok(target, task.id + ' 缺少对应的三维实体');
    let reachable = false;
    for (let angle = 0; angle < Math.PI * 2; angle += .2) {
      const x = target.position.x + Math.sin(angle) * 2.4, z = target.position.z + Math.cos(angle) * 2.4;
      if (canStand(x, z, world.config.size, world.colliders)) { reachable = true; break; }
    }
    assert.ok(reachable, task.id + ' 没有可站立的交互位置');
  }
  worlds.forEach(disposeWorld);
});
