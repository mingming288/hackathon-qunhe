import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeStage } from '../src/office-stage.js';

test('刺绣逐渐移开并在恢复存档时保持完成位置', () => {
  const embroidery = { position: { x: -6.4 } };
  const stage = new OfficeStage(embroidery, false);
  stage.sync(true); stage.update(.4);
  assert.ok(embroidery.position.x < -6.4 && embroidery.position.x > -8.6);
  stage.update(.4);
  assert.ok(Math.abs(embroidery.position.x + 8.6) < 1e-9);
  const restored = { position: { x: -6.4 } };
  new OfficeStage(restored, true);
  assert.ok(Math.abs(restored.position.x + 8.6) < 1e-9);
});
