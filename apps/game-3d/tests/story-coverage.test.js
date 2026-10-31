import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getTask, getActions, advance, enterScene, restoreGame, heroId } from '../src/story.js';
import { EVIDENCE } from '../src/story-data.js';
import { routeTo } from '../src/routes.js';

function perform(game, id, scene) {
  const path = routeTo(game, scene);
  assert.ok(path, game.step + ' 无法抵达目标场景');
  for (const next of path.slice(1)) game = enterScene(game, next);
  game = advance(game, id, game.scene).game;
  assert.deepEqual(restoreGame({ version: 1, events: game.events, scene: game.scene }), game);
  return game;
}

test('石锤只能在完成瑞德的修理约定后取得，整理图书后才能开始藏锤', () => {
  let game = createGame();
  assert.equal(game.step, 'meetRed');
  assert.ok(!game.items.includes('hammer'));
  assert.throws(() => advance(game, 'repairRadio', 'yard'));
  assert.ok(!getActions(game, 'yard').some(action => action.evidence));
  game = perform(game, 'meetRed', 'yard');
  assert.ok(!game.items.includes('hammer'), '答应修理不等于已经得到石锤');
  assert.throws(() => advance(game, 'hideHammer', 'cell'));
  game = perform(game, 'repairRadio', 'yard');
  assert.equal(game.items.filter(item => item === 'hammer').length, 1);
  assert.ok(!game.items.includes('bible'));
  assert.throws(() => advance(game, 'repairRadio', 'yard'));
  game = perform(game, 'sortBooks', 'library');
  assert.equal(game.step, 'hideHammer');
  assert.ok(game.items.includes('hammer') && game.items.includes('bible'));
});

test('两条准备路线与全部线索组合共二百五十六种情形都能完成并逐步恢复存档', () => {
  const evidenceIds = Object.keys(EVIDENCE);
  let runs = 0;
  for (const alternate of [false, true]) for (let mask = 0; mask < 32; mask++) for (let observed = 0; observed < 4; observed++) {
    let game = createGame(), collected = false, branched = false;
    const selected = evidenceIds.filter((id, index) => mask & (1 << index));
    const expected = selected.length === 5 || (selected.length === 4 && observed === 3) ? 'two'
      : selected.includes('red') ? 'one' : 'three';
    for (let count = 0; !game.finished; count++) {
      assert.ok(count < 80, '剧情不得循环或卡住');
      if (alternate && !branched && game.step === 'sortBooks') {
        game = perform(game, 'riskInspection', 'yard'); branched = true;
        assert.ok(!game.items.includes('hammer'), '没收后不能继续持有石锤');
      }
      if (!collected && game.step === (alternate ? 'sideSearch' : 'hideHammer')) {
        for (const id of selected) game = perform(game, 'evidence:' + id, EVIDENCE[id][0]);
        if (observed & 1) game = perform(game, 'observe:nightTruck', 'yard');
        if (observed & 2) game = perform(game, 'observe:dates', 'yard');
        collected = true;
      }
      const task = getTask(game);
      if (['firstDig', 'finalDig', 'smashPipe'].includes(task.id)) assert.ok(game.items.includes('hammer'));
      if (task.id === 'swapLedger') assert.ok(game.items.includes('bible'));
      game = perform(game, task.id, task.scene);
    }
    assert.equal(game.ending, expected);
    assert.equal(heroId(game), expected === 'two' ? 'andy' : 'red');
    if (alternate) assert.ok(game.events.includes('sideRecover'));
    assert.ok(game.items.includes('hammer'));
    runs++;
  }
  assert.equal(runs, 256);
});
