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
import { guidanceFor } from '../src/guidance.js';
import { EarlyWorld } from '../src/early-world.js';
import * as THREE from 'three';

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
  assert.deepEqual(restoreGame({ version: 2, events: result.events, scene: result.scene }), result, '每个检查点应能恢复一致的任务和道具');
  const guide = guidanceFor(result);
  assert.ok(guide.title && guide.purpose, '任务应说明目标和目的');
  if (!result.finished) {
    assert.equal(getTask(result).automatic, false, '自动过程不能再要求玩家逐次确认');
    assert.ok(guide.target && guide.place && guide.action.includes('空格'), result.step + ' 应有可达目标、位置和明确操作');
  }
  return result;
}
function play({ evidence = [], observed = false, alternate = false } = {}) {
  let game = createGame(), collected = false, branched = false;
  for (let count = 0; !game.finished; count++) {
    assert.ok(count < 80, '剧情未能结束');
    if (alternate && !branched && game.step === 'sortBooks') { game = act(game, 'riskInspection'); branched = true; }
    if (!collected && game.step === (alternate ? 'sideSearch' : 'hideHammer')) {
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
  assert.equal(getActions(game, 'cell')[0].id, 'inspectWall');
  assert.equal(getActions(game, 'yard').length, 0);
});

test('先观察墙面，修理后实际领取工具和圣经，藏锤后仍需要接受检查', () => {
  let game = createGame();
  assert.equal(game.scene, 'cell'); assert.equal(game.step, 'inspectWall');
  game = act(game);
  assert.equal(game.step, 'meetRed');
  assert.equal(guidanceFor(game).target, 'exit:cellCorridor');
  assert.match(guidanceFor(game).place, /安迪的牢房 → 监区走廊 → 院子与监狱大门/);
  game = act(game); game = act(game);
  assert.equal(game.step, 'takeHammer'); assert.ok(!game.items.includes('hammer'));
  game = act(game);
  assert.equal(game.step, 'sortBooks'); assert.equal(travelRule(game, 'yard', 'library'), null);
  assert.equal(guidanceFor(game).target, 'exit:library');
  game = act(game);
  assert.equal(game.step, 'getBible'); assert.ok(!game.items.includes('bible'));
  game = act(game);
  assert.equal(game.step, 'hideHammer'); assert.ok(game.items.includes('bible'));
  game = act(game);
  assert.equal(game.step, 'inspection');
  game = act(game);
  assert.equal(game.step, 'askPoster'); assert.ok(game.events.includes('inspection'));
  for (const id of ['askPoster', 'hangPoster', 'firstDig', 'dumpSoil1']) game = act(game, id);
  assert.equal(game.step, 'drawMap'); assert.equal(game.scene, 'cell');
  assert.ok(!game.items.includes('soil')); assert.ok(game.events.includes('restYears'));
});

test('旧存档停在醒来或找老布时，保留进度并自动衔接新流程', () => {
  const opening = { version: 1, events: ['watchTv', 'arrival'], scene: 'operatingRoom', location: { x: 1, z: 5 } };
  const storage = { getItem: () => JSON.stringify(opening) };
  const restored = loadGame(storage);
  assert.equal(restored.game.step, 'meetRed'); assert.equal(restored.game.scene, 'cell');
  assert.equal(restored.location, null, '跨场景衔接不能沿用旧房间的位置');
  const library = { version: 1, events: ['watchTv', 'arrival', 'wakeMedical', 'wakeCell', 'meetRed', 'repairRadio'], scene: 'yard', location: { x: 3, z: -2 } };
  const saved = loadGame({ getItem: () => JSON.stringify(library) });
  assert.equal(saved.game.step, 'sortBooks'); assert.ok(saved.game.items.includes('hammer'));
  assert.equal(travelRule(saved.game, 'yard', 'library'), null);
  assert.deepEqual(saved.location, library.location, '仍在原场景时保留玩家位置');
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
    const world = createWorld(config);
    const game = { ...createGame(), scene: config.id };
    world.early = new EarlyWorld({ world, hero: new THREE.Group() }, { getGame: () => game });
    worlds.set(config.id, world);
    for (const portal of world.portals) {
      const entry = entryPosition(world, portal.id);
      assert.ok(canStand(entry.x, entry.z, config.size, world.colliders), config.id + ' 返回入口不安全');
    }
  }
  for (const task of TASKS) {
    const world = worlds.get(task.scene);
    const target = task.target.startsWith('exit:') ? world.portals.find(item => item.id === task.target.slice(5))?.object : world.early.anchor(task.target) || world.anchors.find(item => item.userData.assetKey === task.target);
    assert.ok(target, task.id + ' 缺少对应的三维实体');
    let reachable = false;
    for (let angle = 0; angle < Math.PI * 2; angle += .2) {
      const x = target.position.x + Math.sin(angle) * 2.4, z = target.position.z + Math.cos(angle) * 2.4;
      if (canStand(x, z, world.config.size, world.colliders)) { reachable = true; break; }
    }
    assert.ok(reachable, task.id + ' 没有可站立的交互位置');
  }
  worlds.forEach(world => { world.early.dispose(); disposeWorld(world); });
});
