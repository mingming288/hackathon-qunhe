import test from 'node:test';
import assert from 'node:assert/strict';
import { bindPipeKeys } from '../src/original-games/pipe-keys.js';

test('嵌入管道迷宫支持方向键和字母键，关闭后不再转发', () => {
  const target = new EventTarget(), moves = [];
  const unbind = bindPipeKeys(target, () => ({ move: direction => moves.push(direction) }));
  const press = code => {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperty(event, 'code', { value: code });
    target.dispatchEvent(event); return event.defaultPrevented;
  };
  assert.equal(press('ArrowUp'), true); assert.equal(press('KeyD'), true);
  assert.equal(press('Space'), false); assert.deepEqual(moves, ['up', 'right']);
  unbind(); assert.equal(press('KeyW'), false); assert.deepEqual(moves, ['up', 'right']);
});
