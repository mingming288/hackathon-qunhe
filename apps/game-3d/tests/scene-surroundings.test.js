import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../src/scenes.js';
import { createWorld, disposeWorld } from '../src/world.js';

 test('室内游玩四周有可避让的背景墙，展示模式不包含背景墙', () => {
  for (const scene of SCENES.filter(s => ['room', 'corridor', 'tunnel', 'maze'].includes(s.kind))) {
    const game = createWorld(scene), preview = createWorld(scene, { includeCharacters: false, includeHelpers: false });
    assert.equal(game.cameraColliders.length, scene.id === 'cellCorridor' ? 8 : scene.id === 'cell' ? 6 : ['pipeNetwork', 'pipe'].includes(scene.id) ? 5 : 4, scene.id);
    assert.equal(preview.cameraColliders, undefined, scene.id);
    assert.ok(game.cameraColliders.every(w => w.h === 10 && w.camera));
    assert.ok(!game.colliders.some(w => game.cameraColliders.includes(w)), '背景墙不影响角色行走');
    disposeWorld(game); disposeWorld(preview);
  }
});

test('每个室外场景都有远景地面与对应背景', () => {
  for (const scene of SCENES.filter(s => !['room', 'corridor', 'tunnel', 'maze'].includes(s.kind))) {
    const game = createWorld(scene);
    assert.ok(game.root.getObjectByName('场景远景'), scene.id);
    assert.notEqual(game.background, '#303531', scene.id);
    disposeWorld(game);
  }
});
