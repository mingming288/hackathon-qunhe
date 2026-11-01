import test from 'node:test';
import assert from 'node:assert/strict';
import { pickupItem } from '../src/item-preview.js';
import { TASK_BY_ID } from '../src/story-data.js';

test('领取石锤和两条路线的圣经时展示对应道具，其他剧情不展示', () => {
  for (const [id, item] of [['takeHammer', 'hammer'], ['getBible', 'bible'], ['sideBrooks', 'bible']]) {
    const task = TASK_BY_ID.get(id);
    assert.equal(pickupItem(task), item);
    assert.ok(task.grant.includes(item));
  }
  assert.equal(pickupItem(TASK_BY_ID.get('meetRed')), null);
});
