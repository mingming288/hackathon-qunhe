import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';

test('图书整理目标保留原位置，书本各自拥有封面和书页', () => {
  const world = createWorld(SCENE_BY_ID.get('library'));
  const books = world.anchors.find(anchor => anchor.userData.assetKey === 'books');
  assert.deepEqual([books.position.x, books.position.y, books.position.z], [0, 1.32, 1]);
  const stack = books.userData.placeholder.children;
  assert.equal(stack.length, 4);
  assert.ok(stack.every(book => book.children.length >= 5));
  assert.ok(stack.every((book, index) => book.position.y === index * .16));
  disposeWorld(world);
});
