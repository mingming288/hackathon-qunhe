import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoTravel } from '../src/auto-travel.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENES } from '../src/scenes.js';
import { CHARACTER_NAMES } from '../src/kit.js';
import { readFile } from 'node:fs/promises';

const portal = (id, x, z) => ({ id, object: { position: { x, z } } });
test('走近开放入口时自动切换，锁定入口、静止、暂停和返回入口不会误触发', () => {
  const portals = [portal('return', 0, 0), portal('next', 7, 0)];
  const navigation = new AutoTravel({ x: 0, z: 1 }, portals);
  assert.equal(navigation.next({ x: 0, z: 1 }, true, true, portals), null);
  assert.equal(navigation.next({ x: 0, z: 2 }, true, true, portals), null);
  assert.equal(navigation.next({ x: 0, z: 1 }, false, true, portals), null);
  assert.equal(navigation.next({ x: 0, z: 1 }, true, false, portals), null);
  assert.equal(navigation.next({ x: 0, z: 1 }, true, true, portals, { return: '剧情未开放' }), null);
  assert.equal(navigation.next({ x: 0, z: 1 }, true, true, portals), 'return');
  assert.equal(navigation.next({ x: 7, z: .9 }, true, true, portals), 'next');
});

test('正式游戏每种人物都有本地模型，场景中的入口均保留指引', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const id of ['andy', ...Object.keys(CHARACTER_NAMES)]) {
    assert.ok(catalog[id], id);
    await readFile(new URL('../public' + catalog[id].url, import.meta.url));
  }
  for (const config of SCENES) {
    const world = createWorld(config);
    assert.equal(world.portals.length, config.links.length, config.id);
    disposeWorld(world);
  }
});
