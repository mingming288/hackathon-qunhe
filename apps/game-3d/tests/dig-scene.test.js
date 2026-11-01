import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand } from '../src/movement.js';

 test('挖掘通道模型自包含，出口范围和暖光与游戏布局匹配', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url)));
  const entry = catalog.models['dig-architecture'];
  assert.equal(entry.url, '/assets/models/dig-rebuilt.glb');
  assert.equal(entry.normalize, false);
  const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
  assert.equal(model.externalResources, 0);
  assert.ok(model.materials.some(material => material.normal));
  assert.ok(model.bounds.size[0] >= 14 && model.bounds.size[2] >= 24);
  const world = createWorld(SCENE_BY_ID.get('dig'));
  assert.equal(world.root.children.filter(child => child.isPointLight).length, 3);
  for (const portal of world.portals) {
    const { x, z } = portal.object.position;
    assert.ok(canStand(x, z, world.config.size, world.colliders), portal.id);
  }
  disposeWorld(world);
});
