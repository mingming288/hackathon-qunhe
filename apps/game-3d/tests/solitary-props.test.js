import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGlb } from '../scripts/inspect-glb.mjs';
import { SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { canStand } from '../src/movement.js';

test('禁闭室草席与刻痕石板使用独立模型，剧情目标保持可接近', async () => {
  const catalog = JSON.parse(await readFile(new URL('../public/assets/models.json', import.meta.url))).models;
  for (const [kind, expected] of [['mat', [1.6, .1, 2.8]], ['stone', [1.2, .25, 1]]]) {
    const entry = catalog['solitary:' + kind];
    assert.equal(entry.normalize, false);
    const model = inspectGlb(await readFile(new URL('../public' + entry.url, import.meta.url)));
    assert.equal(model.externalResources, 0);
    assert.ok(model.materials.some(material => material.baseColor));
    assert.ok(model.bounds.size.every((size, index) => Math.abs(size - expected[index]) < .01), kind);
    assert.ok(Math.abs(model.bounds.min[1]) < .01, kind + ' 以底面落地');
  }
  const world = createWorld(SCENE_BY_ID.get('solitary'));
  for (const key of ['mat', 'stone']) {
    const anchor = world.anchors.find(item => item.userData.assetKey === key);
    assert.ok(anchor, key);
    assert.ok(canStand(anchor.position.x, anchor.position.z, world.config.size, world.colliders), key);
  }
  disposeWorld(world);
});

test('禁闭室颜色贴图压缩后仍为内嵌资源，材质参数贴图保持无损', async () => {
  for (const file of ['solitary-shell.glb', 'solitary-mat.glb', 'solitary-inscribed-stone.glb']) {
    const model = inspectGlb(await readFile(new URL('../public/assets/models/' + file, import.meta.url)));
    assert.equal(model.externalResources, 0, file);
    assert.ok(model.textures.some(texture => texture.mimeType === 'image/jpeg'), file);
    assert.ok(model.textures.some(texture => texture.mimeType === 'image/png'), file);
    assert.ok(model.materials.some(material => material.baseColor && material.metallicRoughness), file);
  }
});
