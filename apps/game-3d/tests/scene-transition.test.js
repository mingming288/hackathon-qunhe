import test from 'node:test';
import assert from 'node:assert/strict';
import { SceneLoadGate } from '../src/scene-load-gate.js';
import { prepareTravel } from '../src/scene-transition.js';

test('入口预载目标场景，完成后切换；取消或新场景使旧请求失效', async () => {
  const gate = new SceneLoadGate(); let resolve, runs = 0, allowed = true;
  const load = () => new Promise(done => { resolve = done; });
  const start = () => prepareTravel({ gate, load, canTravel: () => allowed, run: () => runs++ });
  let pending = start(); await Promise.resolve();
  assert.equal(gate.active, true); assert.equal(runs, 0);
  resolve(); await pending; assert.equal(runs, 1);
  pending = start(); await Promise.resolve(); allowed = false; resolve(); await pending;
  assert.equal(runs, 1); assert.equal(gate.active, false);
  allowed = true; pending = start(); await Promise.resolve(); gate.begin(true); resolve(); await pending;
  assert.equal(runs, 1); assert.equal(gate.active, true);
});

test('预载失败仍允许切换，交给正常载入处理替代模型', async () => {
  const gate = new SceneLoadGate(); let runs = 0;
  await prepareTravel({ gate, load: () => Promise.reject(new Error('加载失败')), canTravel: () => true, run: () => runs++ });
  assert.equal(runs, 1);
});
