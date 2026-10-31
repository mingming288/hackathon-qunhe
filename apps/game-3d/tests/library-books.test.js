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

test('图书馆桌子的碰撞覆盖正式模型，玩家仍可走近书本', async () => {
  const { readFile } = await import('node:fs/promises');
  const { inspectGlb } = await import('../scripts/inspect-glb.mjs');
  const { canStand } = await import('../src/movement.js');
  const model = inspectGlb(await readFile(new URL('../public/assets/models/table.glb', import.meta.url)));
  const [width, height, depth] = model.bounds.size.map(value => value * 1.3 / model.bounds.size[1]);
  const world = createWorld(SCENE_BY_ID.get('library'));
  const collider = world.colliders.find(item => item.assetKey === 'table');
  assert.ok(collider.w >= width && collider.d >= depth && height === 1.3);
  assert.equal(canStand(0, 3, world.config.size, world.colliders), false, '不能走进桌面');
  assert.equal(canStand(0, 3.5, world.config.size, world.colliders), true, '桌边保留互动位置');
  assert.ok(Math.abs(3.5 - 1) < 2.7, '桌边可以触发图书整理');
  disposeWorld(world);
});
