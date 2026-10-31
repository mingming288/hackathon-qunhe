import test from 'node:test';
import assert from 'node:assert/strict';
import { goalDirection } from '../src/goal-direction.js';

test('目标方向随镜头旋转，与移动键方向一致', () => {
  const here = { x: 0, z: 0 };
  assert.equal(goalDirection(here, { x: 0, z: -5 }, 0), '目标方向 ↑');
  assert.equal(goalDirection(here, { x: 5, z: 0 }, 0), '目标方向 →');
  assert.equal(goalDirection(here, { x: 0, z: 5 }, 0), '目标方向 ↓');
  assert.equal(goalDirection(here, { x: 0, z: -5 }, Math.PI / 2), '目标方向 →');
  assert.equal(goalDirection(here, { x: 0, z: -.5 }, 0), '目标就在附近');
});
