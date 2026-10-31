import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';
import { EarlyWorld } from '../src/early-world.js';
import { createGame } from '../src/story.js';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import * as THREE from 'three';

test('海报贴在墙面内侧，挂好后才显示并兼容延迟加载', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  const model = inspectGlb(await readFile(new URL('../public' + catalog['cell:poster'].url, import.meta.url)));
  assert.equal(model.externalResources, 0);
  assert.ok(model.materials.some(material => material.baseColor));
  const world = createWorld(SCENE_BY_ID.get('cell'));
  const poster = world.anchors.find(anchor => anchor.userData.assetKey === 'poster');
  assert.ok(poster.position.z - model.bounds.size[2] / 2 > -5.95, '海报在墙面内侧');
  let game = createGame();
  const stage = new EarlyWorld({ world, hero: new THREE.Group() }, { getGame: () => game });
  assert.equal(poster.userData.placeholder.visible, false);
  const loaded = new THREE.Group(); poster.add(loaded); poster.userData.replaced = true;
  stage.sync(); assert.equal(loaded.visible, false, '模型晚到也不能提前挂出');
  game = { ...game, events: [...game.events, 'hangPoster'] }; stage.sync();
  assert.equal(loaded.visible, true); assert.equal(poster.userData.placeholder.visible, false);
  stage.dispose(); disposeWorld(world);
});
