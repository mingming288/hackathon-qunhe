import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createPractice,
  practiceComplete,
  restorePractice,
  completePractice,
} from "../src/practice-state.js";
import { createGame, advance, getTask, restoreGame } from "../src/story.js";
import { createWorld, disposeWorld } from "../src/world.js";
import { SCENE_BY_ID } from "../src/scenes.js";
import { EarlyWorld } from "../src/early-world.js";
import { saveGame, loadGame } from "../src/save.js";

test("完成结果以剧情事件为准，旧替代玩法的半成品不会跳过原版小游戏", () => {
  const old = {
    radio: { seated: true, stable: 2 },
    books: { placed: ["science", "history", "literature"] },
    hide: { placed: true, closed: true },
  };
  const state = restorePractice(old, []);
  for (const kind of ["radio", "books", "hide"])
    assert.equal(practiceComplete(state, kind), false);
  const restored = restorePractice(old, [
    "repairRadio",
    "sortBooks",
    "hideHammer",
  ]);
  for (const kind of ["radio", "books", "hide"])
    assert.equal(practiceComplete(restored, kind), true);
  const original = createPractice();
  completePractice(original, "hideHammer");
  assert.equal(original.hide.placed, false);
});

test("既有事件可恢复，收取物品仍衔接藏锤任务", () => {
  let game = createGame();
  game = advance(game, "inspectWall", "cell").game;
  game = advance(game, "meetRed", "yard").game;
  const values = new Map(),
    storage = {
      getItem: (k) => values.get(k),
      setItem: (k, v) => values.set(k, v),
    };
  saveGame(storage, game, { x: 2, z: 3 });
  assert.deepEqual(loadGame(storage), { game, location: { x: 2, z: 3 } });
  const old = restoreGame({
    version: 1,
    scene: "yard",
    events: [
      "watchTv",
      "arrival",
      "wakeMedical",
      "wakeCell",
      "meetRed",
      "repairRadio",
    ],
  });
  assert.equal(old.step, "sortBooks");
  assert.ok(old.items.includes("hammer"));
  assert.equal(
    getTask(
      advance(advance(old, "sortBooks", "library").game, "getBible", "library")
        .game,
    ).id,
    "hideHammer",
  );
});

test("原版小游戏接入不改变建筑、陈设与碰撞，图书馆不再放置替代归类玩法", () => {
  for (const id of ["cell", "library"]) {
    const config = SCENE_BY_ID.get(id),
      snapshot = structuredClone(config),
      world = createWorld(config),
      colliders = structuredClone(world.colliders),
      hero = new THREE.Group();
    let game = {
      ...createGame(),
      scene: id,
      step: id === "library" ? "sortBooks" : "inspectWall",
    };
    const stage = new EarlyWorld({ world, hero }, { getGame: () => game });
    if (id === "cell") assert.ok(stage.anchor("wallClue"));
    else {
      assert.deepEqual(stage.interactions(), []);
      assert.equal(stage.held, undefined);
      assert.equal(stage.shelves, undefined);
    }
    assert.deepEqual(config, snapshot);
    assert.deepEqual(world.colliders, colliders);
    stage.dispose();
    disposeWorld(world);
  }
});

test("狱警检查有进出和停留，离开床边或打开菜单暂停，安全与没收结果分开", () => {
  for (const unsafe of [false, true]) {
    const world = createWorld(SCENE_BY_ID.get("cell")),
      hero = new THREE.Group(),
      bed = world.anchors.find((a) => a.userData.assetKey === "bed");
    let game = { ...createGame(), step: unsafe ? "hideHammer" : "inspection" },
      enabled = true,
      finished = null;
    if (!unsafe) game.practice = completePractice(game.practice, "hideHammer");
    const stage = new EarlyWorld(
      { world, hero },
      {
        getGame: () => game,
        enabled: () => enabled,
        notify: () => {},
        update: (kind, state) => {
          game = { ...game, practice: { ...game.practice, [kind]: state } };
        },
        finish: (id) => {
          finished = id;
        },
      },
    );
    stage.startInspection(unsafe);
    hero.position.set(0, 0, 5);
    stage.updateFrame(0.1, 0);
    assert.equal(game.practice.inspection.elapsed, 0);
    hero.position.copy(bed.position);
    hero.position.x += 2;
    enabled = false;
    stage.updateFrame(0.1, 0);
    assert.equal(game.practice.inspection.elapsed, 0);
    enabled = true;
    for (let i = 0; i < 100; i++) stage.updateFrame(0.1, i / 10);
    assert.equal(finished, unsafe ? "riskInspection" : "inspection");
    assert.equal(stage.guard.visible, false);
    stage.dispose();
    disposeWorld(world);
  }
});

test("最后一夜只需走入已贯通的出口，不再增加第二次挖掘小游戏", () => {
  const world = createWorld(SCENE_BY_ID.get("dig")),
    hero = new THREE.Group();
  let finished = 0;
  const game = { ...createGame(), step: "finalDig", scene: "dig" };
  const stage = new EarlyWorld(
    { world, hero },
    {
      getGame: () => game,
      enabled: () => true,
      finish: (id) => {
        assert.equal(id, "finalDig");
        finished++;
      },
    },
  );
  hero.position.copy(
    world.portals.find((p) => p.id === "pipe").object.position,
  );
  stage.updateFrame(0.2, 0);
  assert.equal(finished, 0);
  stage.updateFrame(0.11, 0);
  assert.equal(finished, 1);
  stage.dispose();
  disposeWorld(world);
});
