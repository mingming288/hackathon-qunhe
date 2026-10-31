import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, SCENE_BY_ID } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';

 test('室内游玩四周有可避让的背景墙，展示模式不包含背景墙', () => {
  for (const scene of SCENES.filter(s => ['room', 'corridor', 'tunnel', 'maze'].includes(s.kind))) {
    const game = createWorld(scene), preview = createWorld(scene, { includeCharacters: false, includeHelpers: false });
    assert.equal(game.cameraColliders.length, scene.id === 'cellCorridor' ? 8 : scene.id === 'cell' ? 6 : scene.id === 'pipeNetwork' ? 10 : ['pipe', 'bank', 'supermarket'].includes(scene.id) ? 5 : 4, scene.id);
    assert.equal(preview.cameraColliders, undefined, scene.id);
    assert.ok(game.cameraColliders.every(w => w.h === 10 && w.camera));
    assert.ok(!game.colliders.some(w => game.cameraColliders.includes(w)), '背景墙不影响角色行走');
    disposeWorld(game); disposeWorld(preview);
  }
});

test('海滩远海覆盖近岸水面以外的可见范围，不增加行走碰撞', () => {
  const scene = SCENE_BY_ID.get('beach');
  const game = createWorld(scene), preview = createWorld(scene, { includeHelpers: false });
  const sea = game.root.getObjectByName('海滩远海');
  assert.ok(sea);
  assert.equal(sea.geometry.parameters.width, 600);
  assert.equal(sea.position.z + sea.geometry.parameters.height / 2, -scene.size[1] / 2 + 11.5);
  assert.equal(preview.root.getObjectByName('海滩远海'), undefined);
  assert.equal(game.colliders.filter(c => c.h === .1).length, 1);
  disposeWorld(game); disposeWorld(preview);
});

test('每个室外场景都有远景地面与对应背景', () => {
  for (const scene of SCENES.filter(s => !['room', 'corridor', 'tunnel', 'maze'].includes(s.kind))) {
    const game = createWorld(scene);
    assert.ok(game.root.getObjectByName('场景远景'), scene.id);
    assert.notEqual(game.background, '#303531', scene.id);
    disposeWorld(game);
  }
});
