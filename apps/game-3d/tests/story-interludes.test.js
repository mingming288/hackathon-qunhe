import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getTask, advance, restoreGame } from '../src/story.js';
import { OPENING, storyInterlude, pendingInterlude } from '../src/story-interludes.js';
import { EVIDENCE } from '../src/story-data.js';
import { GAME_KEY, loadGame, saveGame } from '../src/save.js';

test('新游戏开场介绍人物和可探索目标，瑞德线索说明橡树约定', () => {
  assert.match(OPENING.lines.join(''), /安迪/);
  assert.match(OPENING.lines.join(''), /观察/);
  assert.match(EVIDENCE.red[4].join(''), /石墙.*橡树/);
});

test('两条准备路线的时间跳跃有衔接，记录仍按原剧情恢复', () => {
  for (const alternate of [false, true]) {
    let game = createGame();
    while (game.step !== 'sortBooks') { const t = getTask(game); game = advance(game, t.id, t.scene).game; }
    if (alternate) game = advance(game, 'riskInspection', 'yard').game;
    let result, actionId;
    while (game.step !== 'drawMap') {
      const t = getTask(game); actionId = t.id; result = advance(game, actionId, t.scene); game = result.game;
    }
    const beat = storyInterlude(actionId, game, result.automatic);
    assert.match(beat.title, /二十年后/);
    assert.match(beat.lines.join(''), /碎土/);
    if (alternate) assert.ok(game.events.includes('sideRecover') && game.events.includes('hangPoster'));
    assert.deepEqual(restoreGame({ version: 2, events: game.events, scene: game.scene }), game);
  }
});

test('雨夜后的三种分支分别解释人物与下一地点，不改变分支结果', () => {
  for (const [ending, text] of [['one', /瑞德.*橡树/], ['two', /证言和记录/], ['three', /银行/]]) {
    assert.match(storyInterlude('breathe', { ending }, []).lines.join(''), text);
  }
  assert.equal(storyInterlude('meetRed', { ending: null }, []), null);
});

test('未读开场和时间跳跃可以从存档恢复，过期或伪造的说明会忽略', () => {
  const values = new Map(), storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  let game = createGame();
  saveGame(storage, game, { x: 0, z: 0 }, 'opening');
  assert.equal(loadGame(storage).pendingStory, 'opening');
  assert.equal(pendingInterlude('opening', loadGame(storage).game).title, '高墙之内');
  while (game.step !== 'drawMap') { const task = getTask(game); game = advance(game, task.id, task.scene).game; }
  saveGame(storage, game, { x: 0, z: 0 }, 'dumpSoil1');
  assert.match(pendingInterlude(loadGame(storage).pendingStory, game).title, /二十年后/);
  saveGame(storage, game, { x: 0, z: 0 }, 'opening');
  assert.equal(loadGame(storage).pendingStory, undefined);
  const record = JSON.parse(values.get(GAME_KEY)); record.pendingStory = '<恶意内容>';
  values.set(GAME_KEY, JSON.stringify(record));
  assert.equal(loadGame(storage).pendingStory, undefined);
});
