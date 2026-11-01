import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPoint } from '../src/minimap.js';

test('俯视图按场景边界映射人物和目标的位置', () => {
  assert.deepEqual(mapPoint({ x: 0, z: 0 }, [20, 10]), { x: 200, y: 200 });
  assert.deepEqual(mapPoint({ x: -10, z: -5 }, [20, 10]), { x: 20, y: 20 });
  assert.deepEqual(mapPoint({ x: 10, z: 5 }, [20, 10]), { x: 380, y: 380 });
});
