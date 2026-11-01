import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getTask, advance, restoreGame } from '../src/story.js';
import { OPENING, storyInterlude } from '../src/story-interludes.js';
import { EVIDENCE } from '../src/story-data.js';

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
    let result;
    while (game.step !== 'drawMap') {
      const t = getTask(game); result = advance(game, t.id, t.scene); game = result.game;
    }
    const beat = storyInterlude(alternate ? 'sideRecover' : 'dumpSoil1', game, result.automatic);
    assert.match(beat.title, /二十年后/);
    assert.match(beat.lines.join(''), alternate ? /找回石锤/ : /碎土/);
    assert.deepEqual(restoreGame({ version: 2, events: game.events, scene: game.scene }), game);
  }
});

test('雨夜后的三种分支分别解释人物与下一地点，不改变分支结果', () => {
  for (const [ending, text] of [['one', /瑞德.*橡树/], ['two', /证言和记录/], ['three', /银行/]]) {
    assert.match(storyInterlude('breathe', { ending }, []).lines.join(''), text);
  }
  assert.equal(storyInterlude('meetRed', { ending: null }, []), null);
});
