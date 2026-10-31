import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPractice, changePractice, practiceComplete, restorePractice, GEAR_SOCKET, HAMMER_SLOT, LIBRARY_BOOKS } from '../src/practice-state.js';
import { createGame, advance, getTask, restoreGame } from '../src/story.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { EarlyWorld } from '../src/early-world.js';
import { canStand } from '../src/movement.js';
import { saveGame, loadGame } from '../src/save.js';

test('收音机必须归位传动件并保持清晰信号，错误位置与频率不能完成', () => {
  let practice = createPractice();
  const act = event => { const before = structuredClone(practice); const result = changePractice(practice, 'radio', event); assert.deepEqual(practice, before); practice = result.practice; return result; };
  act({ type: 'tune', value: 73 });
  for (let i = 0; i < 30; i++) act({ type: 'tick', dt: .1 });
  assert.equal(practiceComplete(practice, 'radio'), false);
  act({ type: 'open' }); act({ type: 'release' }); assert.equal(practice.radio.seated, false);
  act({ type: 'move', ...GEAR_SOCKET }); act({ type: 'release' }); assert.equal(practice.radio.seated, true);
  act({ type: 'tune', value: 50 }); act({ type: 'tick', dt: .1 }); assert.equal(practice.radio.stable, 0);
  act({ type: 'tune', value: 73 }); for (let i = 0; i < 10; i++) act({ type: 'tick', dt: .1 });
  assert.equal(practiceComplete(practice, 'radio'), false);
  act({ type: 'tune', value: 80 }); assert.equal(practice.radio.stable, 0);
  act({ type: 'tune', value: 73 }); for (let i = 0; i < 21; i++) act({ type: 'tick', dt: .1 });
  assert.equal(practiceComplete(practice, 'radio'), true);
});

test('藏锤需要正确位置、方向与合书，中途保存仍保留已放入的石锤', () => {
  let practice = createPractice();
  const act = event => { const result = changePractice(practice, 'hide', event); practice = result.practice; return result; };
  act({ type: 'close' }); assert.equal(practiceComplete(practice, 'hide'), false);
  act({ type: 'open' }); act({ type: 'move', ...HAMMER_SLOT, angle: Math.PI / 2 }); act({ type: 'release' });
  assert.equal(practice.hide.placed, false, '横放不能直接通过');
  act({ type: 'rotate', amount: -Math.PI / 2 }); act({ type: 'release' });
  assert.equal(practice.hide.placed, true); assert.equal(practiceComplete(practice, 'hide'), false);
  practice = restorePractice(practice, []);
  assert.equal(practice.hide.placed, true); assert.equal(practice.hide.open, true);
  act({ type: 'close' }); assert.equal(practiceComplete(practice, 'hide'), true);
});

test('书籍归位必须匹配书脊分类，错放不丢书或清空其他进度', () => {
  let practice = createPractice();
  for (const book of LIBRARY_BOOKS) {
    practice = changePractice(practice, 'books', { type: 'pickup' }).practice;
    const placed = [...practice.books.placed];
    practice = changePractice(practice, 'books', { type: 'place', shelf: (book.shelf + 1) % 3 }).practice;
    assert.equal(practice.books.carrying, book.id); assert.deepEqual(practice.books.placed, placed);
    practice = changePractice(practice, 'books', { type: 'place', shelf: book.shelf }).practice;
    practice = restorePractice(practice, []);
  }
  assert.equal(practiceComplete(practice, 'books'), true);
});

test('取得物品需要先查看再接过，不能仅旋转或点击跳过', () => {
  let practice = createPractice();
  practice = changePractice(practice, 'hammer', { type: 'move', x: 0, y: -1.6, angle: 0 }).practice;
  assert.equal(changePractice(practice, 'hammer', { type: 'release' }).complete, false);
  practice = changePractice(practice, 'hammer', { type: 'rotate', amount: .5 }).practice;
  assert.equal(changePractice(practice, 'hammer', { type: 'release' }).complete, true);
});

test('新存档保存操作进度与持书状态，旧存档迁移不强制重领已取得的物品', () => {
  let game = createGame(); game = advance(game, 'inspectWall', 'cell').game; game = advance(game, 'meetRed', 'yard').game;
  game.practice = changePractice(game.practice, 'radio', { type: 'open' }).practice;
  game.practice = changePractice(game.practice, 'radio', { type: 'move', x: -.4, y: -.2, angle: 0 }).practice;
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  saveGame(storage, game, { x: 2, z: 3 }); assert.deepEqual(loadGame(storage), { game, location: { x: 2, z: 3 } });
  const old = restoreGame({ version: 1, scene: 'yard', events: ['watchTv', 'arrival', 'wakeMedical', 'wakeCell', 'meetRed', 'repairRadio'] });
  assert.equal(old.step, 'sortBooks'); assert.ok(old.items.includes('hammer')); assert.ok(old.events.includes('takeHammer'));
  assert.equal(getTask(advance(advance(old, 'sortBooks', 'library').game, 'getBible', 'library').game).id, 'hideHammer');
});

test('玩法附件跟随场景物件，书架交互位置可站立，建筑与碰撞不被改写', () => {
  for (const id of ['cell', 'library']) {
    const config = SCENE_BY_ID.get(id), original = structuredClone(config), world = createWorld(config);
    const collisions = structuredClone(world.colliders), hero = new THREE.Group();
    let game = { ...createGame(), scene: id, step: id === 'library' ? 'sortBooks' : 'inspectWall' };
    const stage = new EarlyWorld({ world, hero }, { getGame: () => game });
    if (id === 'cell') {
      assert.ok(stage.anchor('wallClue'));
      game.items = ['bible', 'hammer']; game.practice.hide = { open: true, placed: true, closed: false, hammer: { ...HAMMER_SLOT, angle: 0 } }; stage.sync();
      assert.equal(stage.hiddenHammer.visible, true); assert.equal(stage.originalBible.visible, false);
      game.practice.hide.open = false; game.practice.hide.closed = true; stage.sync(); assert.equal(stage.hiddenHammer.visible, false);
    }
    else {
      game.practice = changePractice(game.practice, 'books', { type: 'pickup' }).practice; stage.sync();
      assert.equal(stage.interactions().length, 3);
      for (const point of stage.shelves) assert.ok(canStand(point.position.x, point.position.z, config.size, world.colliders));
      assert.equal(stage.held.visible, true);
    }
    assert.deepEqual(world.colliders, collisions); assert.deepEqual(config, original);
    stage.dispose(); assert.equal(hero.children.length, 0); disposeWorld(world);
  }
});

test('狱警检查有进出和停留，离开床边或打开菜单会暂停，安全与没收结果分开', () => {
  for (const unsafe of [false, true]) {
    const world = createWorld(SCENE_BY_ID.get('cell')), hero = new THREE.Group();
    const bed = world.anchors.find(anchor => anchor.userData.assetKey === 'bed');
    let game = { ...createGame(), step: unsafe ? 'hideHammer' : 'inspection' }, enabled = true, finished = null;
    if (!unsafe) game.practice.hide = { open: false, placed: true, closed: true, hammer: { ...HAMMER_SLOT, angle: 0 } };
    const stage = new EarlyWorld({ world, hero }, { getGame: () => game, enabled: () => enabled, notify: () => {},
      update: (kind, state) => { game = { ...game, practice: { ...game.practice, [kind]: state } }; }, finish: id => { finished = id; } });
    stage.startInspection(unsafe);
    hero.position.set(0, 0, 5); stage.updateFrame(.1, 0);
    assert.equal(game.practice.inspection.elapsed, 0, '不在床边不能继续');
    hero.position.copy(bed.position); hero.position.x += 2;
    enabled = false; stage.updateFrame(.1, 0); assert.equal(game.practice.inspection.elapsed, 0);
    enabled = true;
    for (let i = 0; i < 100; i++) stage.updateFrame(.1, i / 10);
    assert.equal(finished, unsafe ? 'riskInspection' : 'inspection');
    assert.equal(stage.guard.visible, false);
    stage.dispose(); disposeWorld(world);
  }
});
