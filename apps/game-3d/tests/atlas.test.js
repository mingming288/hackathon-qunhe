import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../src/scenes.js';
import { CHARACTER_NAMES } from '../src/kit.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { propCatalog, scenePropKeys, environmentDescription, DEDICATED_CHARACTERS, CHARACTER_TEMPLATES, assetDetails, sceneAssetDetails } from '../src/asset-catalog.js';
import { SCENE_USAGE_GROUPS, sceneUsage } from '../src/scene-usage.js';

test('十九个环境预览不创建人物、人物碰撞或出入口辅助物，正式游玩仍保留人物', () => {
  let previewProps = 0, gameCharacters = 0;
  for (const scene of SCENES) {
    const preview = createWorld(scene, { includeCharacters: false, includeHelpers: false });
    const game = createWorld(scene);
    assert.ok(preview.root.children.length > 0, scene.id + ' 应保留场景');
    assert.equal(preview.portals.length, 0, scene.id + ' 预览不展示入口标记');
    assert.ok(preview.anchors.every(anchor => !Object.hasOwn(CHARACTER_NAMES, anchor.userData.assetKey)), scene.id);
    assert.ok(preview.colliders.length <= game.colliders.length, '去掉人物不能留下额外碰撞');
    assert.ok(environmentDescription(scene)?.length > 0);
    assert.ok(scenePropKeys(scene).every(key => !Object.hasOwn(CHARACTER_NAMES, key)));
    previewProps += preview.anchors.length;
    gameCharacters += game.anchors.filter(anchor => Object.hasOwn(CHARACTER_NAMES, anchor.userData.assetKey)).length;
    disposeWorld(preview); disposeWorld(game);
  }
  assert.ok(previewProps > 19, '环境应保留陈设与道具');
  assert.ok(gameCharacters > 0, '正式游戏仍需要人物');
});

test('十九组场景分类完整，低频的逃离高潮仍属于主线关键场景', () => {
  const counts = Object.fromEntries(SCENE_USAGE_GROUPS.map(group => [group.id, 0]));
  for (const scene of SCENES) {
    const usage = sceneUsage(scene);
    assert.ok(usage.reason && usage.states, scene.id);
    assert.ok(Object.hasOwn(counts, usage.groupId), scene.id);
    counts[usage.groupId]++;
  }
  assert.deepEqual(counts, { frequent: 3, core: 6, conditional: 9, archive: 1 });
  const rain = SCENES.find(scene => scene.id === 'rain');
  assert.equal(sceneUsage(rain).groupId, 'core');
  assert.ok(sceneAssetDetails(rain, {}).some(line => line.startsWith('需准备的状态：')));
  assert.equal(sceneUsage(SCENES.find(scene => scene.id === 'evidence')).groupId, 'conditional');
});

test('共享资产清单覆盖全部环境物件，五位独立人物与三类模板分开管理', () => {
  const assets = propCatalog();
  const keys = new Set(assets.map(asset => asset.id));
  assert.equal(keys.size, assets.length, '共享资产不得按摆放次数重复建档');
  for (const scene of SCENES) for (const key of scenePropKeys(scene)) {
    const asset = assets.find(item => item.id === key);
    assert.ok(asset?.name && asset.scenes.some(item => item.id === scene.id), key);
  }
  assert.equal(DEDICATED_CHARACTERS.length, 5);
  assert.equal(DEDICATED_CHARACTERS.filter(asset => asset.group === '核心人物').length, 3);
  assert.equal(CHARACTER_TEMPLATES.length, 3);
  assert.ok(!keys.has('red') && !keys.has('warden'));
  const radio = assets.find(asset => asset.id === 'radio');
  assert.match(assetDetails(radio, {}).join(''), /齿轮、旋钮/);
  assert.match(assetDetails(radio, { radio: {} }).join(''), /已配置模型/);
  const library = SCENES.find(scene => scene.id === 'library');
  assert.ok(sceneAssetDetails(library, {}).some(line => line.startsWith('整理用图书')));
  assert.ok(!sceneAssetDetails(library, {}).some(line => line.startsWith('老布 ·')));
});
