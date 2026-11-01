import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, advance } from '../src/story.js';
import { guidanceFor } from '../src/guidance.js';

test('开场目标和跨场景目标只提示当前一步', () => {
  const start = createGame();
  assert.equal(guidanceFor(start).shortTitle, '查看后墙的裂缝');
  const next = advance(start, 'inspectWall', 'cell').game;
  assert.equal(guidanceFor(next).shortTitle, '前往监区走廊');
  assert.equal(guidanceFor(next).target, 'exit:cellCorridor');
});
