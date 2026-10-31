import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneLoadGate } from '../src/scene-load-gate.js';
import { fadeBeforeTravel } from '../src/scene-transition.js';

test('走入入口先淡出并锁定移动，取消或新场景不会执行旧切换', () => {
  const gate = new SceneLoadGate(), classes = new Set(), scheduled = [];
  const fade = { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } };
  let allowed = true, runs = 0;
  const start = () => fadeBeforeTravel({ gate, fade, canTravel: () => allowed, run: () => runs++, schedule: (fn, ms) => scheduled.push({ fn, ms }) });
  start();
  assert.equal(gate.active, true); assert.ok(classes.has('show')); assert.equal(runs, 0);
  assert.equal(scheduled[0].ms, 300); scheduled.shift().fn(); assert.equal(runs, 1);
  start(); allowed = false; scheduled.shift().fn();
  assert.equal(runs, 1); assert.equal(gate.active, false); assert.equal(classes.has('show'), false);
  allowed = true; start(); gate.begin(true); scheduled.shift().fn();
  assert.equal(runs, 1); assert.equal(gate.active, true);
});
