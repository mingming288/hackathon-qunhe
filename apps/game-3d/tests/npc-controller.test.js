import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NpcController } from '../src/npc-controller.js';
import { canStand } from '../src/movement.js';
import { createWorld, disposeWorld } from '../src/world.js';
import { SCENE_BY_ID } from '../src/scenes.js';

const distantHero = { x: 50, z: 50 };

function setup({ scene = 'yard', character = 'red', obstacles = [] } = {}) {
  const anchor = new THREE.Group(), animation = { moving: false, speed: 0 };
  const collider = { x: 0, z: 0, w: 1, d: 1, assetKey: character };
  anchor.userData = {
    assetKey: character, collider,
    mixer: { setMoving(value) { animation.moving = value; } },
    animate(elapsed, speed) { animation.speed = speed; },
  };
  const world = { config: { id: scene, size: [30, 30] }, animations: [anchor], colliders: [collider, ...obstacles] };
  return { anchor, collider, animation, world, controller: new NpcController(world) };
}

test('NPC walks, turns, carries its collider and switches to idle on arrival', () => {
  const { controller, anchor, collider, world, animation } = setup();
  controller.update(.1, .1, distantHero);
  assert.ok(anchor.position.length() > .08);
  assert.ok(anchor.rotation.y > 0);
  assert.equal(animation.moving, true);
  assert.ok(animation.speed > .99);
  for (let frame = 2; frame <= 20; frame++) controller.update(.1, frame / 10, distantHero);
  assert.ok(anchor.position.length() > 1.5);
  assert.equal(collider.x, anchor.position.x);
  assert.equal(collider.z, anchor.position.z);
  assert.equal(canStand(0, 0, world.config.size, world.colliders), true, 'no collider remains at spawn');
  let arrived = false;
  for (let frame = 21; frame <= 50; frame++) {
    controller.update(.1, frame / 10, distantHero);
    if (!animation.moving) { arrived = true; break; }
  }
  assert.equal(arrived, true);
  assert.equal(animation.speed, 0);
});

test('NPC pauses near the player, while disabled and while hidden, then resumes', () => {
  const { controller, anchor, animation } = setup();
  controller.update(.1, .1, distantHero);
  const position = anchor.position.clone();
  controller.update(.1, .2, { x: position.x, z: position.z + 1 });
  assert.deepEqual(anchor.position, position);
  assert.equal(animation.moving, false);
  controller.update(.1, .3, distantHero, false);
  assert.deepEqual(anchor.position, position);
  assert.equal(animation.speed, 0);
  anchor.visible = false;
  controller.update(.1, .4, distantHero);
  assert.deepEqual(anchor.position, position);
  assert.equal(animation.moving, false);
  anchor.visible = true;
  controller.update(.1, .5, distantHero);
  assert.ok(anchor.position.distanceTo(position) > .08);
  assert.equal(animation.moving, true);
});

test('NPC stops before entering interaction range or crossing a wall', () => {
  const near = setup();
  const hero = { x: 1.95, z: 1.75 };
  near.controller.update(.2, .2, hero);
  assert.equal(near.anchor.position.length(), 0);
  assert.equal(near.animation.moving, false);

  const blocked = setup({ obstacles: [{ x: 1, z: 0, w: .2, d: 20 }] });
  let maxDistance = 0;
  for (let frame = 1; frame <= 400; frame++) {
    blocked.controller.update(.1, frame / 10, distantHero);
    assert.ok(blocked.anchor.position.x <= .54, 'never crosses the thin wall');
    assert.ok(canStand(blocked.anchor.position.x, blocked.anchor.position.z, blocked.world.config.size,
      blocked.world.colliders.filter(item => item !== blocked.collider)));
    maxDistance = Math.max(maxDistance, blocked.anchor.position.length());
  }
  assert.ok(maxDistance > 1, 'chooses another reachable destination');
});

test('stationed characters and blocked NPCs remain idle', () => {
  for (const [scene, character] of [['bank', 'clerk'], ['beach', 'andy'], ['medicalExterior', 'guard'], ['medicalExterior', 'warden']]) {
    const { controller, anchor, animation } = setup({ scene, character });
    for (let frame = 1; frame <= 50; frame++) controller.update(.2, frame / 5, distantHero);
    assert.equal(anchor.position.length(), 0, `${scene}:${character}`);
    assert.equal(animation.moving, false);
  }
  const trapped = setup({ obstacles: [
    { x: -.96, z: 0, w: .2, d: 4 }, { x: .96, z: 0, w: .2, d: 4 },
    { x: 0, z: -.96, w: 4, d: .2 }, { x: 0, z: .96, w: 4, d: .2 },
  ] });
  for (let frame = 1; frame <= 50; frame++) trapped.controller.update(.2, frame / 5, distantHero);
  assert.equal(trapped.anchor.position.length(), 0);
  assert.equal(trapped.animation.moving, false);
});

test('NPC speed is consistent across frame rates and zero dt never moves it', () => {
  for (const fps of [60, 30, 10, 5]) {
    const { controller, anchor, animation } = setup();
    for (let frame = 1; frame <= fps; frame++) controller.update(1 / fps, frame / fps, distantHero);
    assert.ok(Math.abs(anchor.position.length() - 1.275) < 1e-9, `${fps} fps`);
    const position = anchor.position.clone();
    controller.update(0, 1, distantHero);
    assert.deepEqual(anchor.position, position);
    assert.equal(animation.moving, false);
  }
});

test('all roaming NPCs move within bounds without entering real scene obstacles', () => {
  for (const sceneId of ['cellCorridor', 'yard', 'library', 'office', 'supermarket']) {
    const world = createWorld(SCENE_BY_ID.get(sceneId));
    try {
      const controller = new NpcController(world);
      const starts = controller.actors.map(actor => actor.anchor.position.clone());
      const distances = starts.map(() => 0);
      for (let frame = 1; frame <= 1200; frame++) {
        controller.update(.1, frame / 10, distantHero);
        controller.actors.forEach(({ anchor, profile, home }, index) => {
          if (!profile) return;
          const { x, z } = anchor.position;
          assert.ok(canStand(x, z, world.config.size, world.colliders.filter(item => item !== anchor.userData.collider)),
            `${sceneId}:${anchor.userData.assetKey} collided at frame ${frame}`);
          assert.ok(Math.abs(x - home.x) <= profile[0] + 1e-9);
          assert.ok(Math.abs(z - home.z) <= profile[1] + 1e-9);
          distances[index] = Math.max(distances[index], anchor.position.distanceTo(starts[index]));
        });
      }
      controller.actors.forEach(({ anchor, profile }, index) => {
        if (profile) assert.ok(distances[index] > .6, `${sceneId}:${anchor.userData.assetKey} never roamed`);
      });
    } finally { disposeWorld(world); }
  }
});
