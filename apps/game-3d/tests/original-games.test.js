import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { rulesSource, storeSource } from "../build/original-games-plugin.js";
import {
  readOriginal,
  originalFunction,
  originalBlock,
  routeOriginalAssets,
} from "../build/canonical-source.js";
import {
  ORIGINAL_GAMES,
  isOriginalCompletion,
  completionTasks,
} from "../src/original-games/registry.js";
const { createHideRules, createTimingRules, createSoilPatrol, originalTiming } =
  await import(
    "data:text/javascript;base64," +
      Buffer.from(rulesSource()).toString("base64")
  );
function inputs() {
  let down = false,
    press = false;
  return {
    actionDown: () => down,
    actionPressed: () => press,
    isDown: () => false,
    set(d, p = false) {
      down = d;
      press = p;
    },
    end() {
      press = false;
    },
  };
}
function step(r, i, n) {
  for (let k = 0; k < n; k++) {
    r.update(0.05);
    i.end();
  }
}

test("藏锤和计时判定函数直接引用原版，源码边界变化会阻止构建", () => {
  const main = readOriginal("game/js/main.js"),
    generated = rulesSource();
  for (const name of [
    "isHammerOverBible",
    "finishHammerHidePuzzleDrop",
    "handleHammerHidePuzzleInput",
    "updateDigHold",
    "updateSoilDumping",
    "updatePipeCue",
    "updatePipeSmash",
    "completePipeSmashHold",
    "chooseYardGuardTarget",
  ])
    assert.ok(generated.includes(originalFunction(main, name)), name);
  assert.throws(() => originalFunction(main, "missingFunction"), /不存在/);
  assert.deepEqual(
    Object.fromEntries(
      [
        "dig",
        "soilHold",
        "soilAlert",
        "soilCount",
        "smashHold",
        "smashCount",
        "stageTwo",
        "cueActive",
      ].map((k) => [k, originalTiming[k]]),
    ),
    {
      dig: 5,
      soilHold: 5,
      soilAlert: 3,
      soilCount: 3,
      smashHold: 0.7,
      smashCount: 5,
      stageTwo: 3,
      cueActive: 1.5,
    },
  );
});

test("原版藏锤：中心落在圣经即可通过，失败回原位，无旋转和合书附加条件", () => {
  const input = {
    pointerX: 850,
    pointerY: 330,
    pointerJustPressed: true,
    pointerPressed: true,
    pointerInRect: () => true,
    isPressed: () => false,
    isDown: () => false,
  };
  let completed = 0;
  const r = createHideRules({ input, onComplete: () => completed++ });
  r.update();
  input.pointerJustPressed = false;
  input.pointerPressed = false;
  r.update();
  assert.equal(completed, 0);
  assert.equal(r.getState().dragX, 776);
  input.pointerJustPressed = input.pointerPressed = true;
  r.update();
  input.pointerJustPressed = false;
  input.pointerX = 400;
  input.pointerY = 350;
  r.update();
  input.pointerPressed = false;
  r.update();
  assert.equal(completed, 1);
  r.update();
  assert.equal(completed, 1);
});

test("挖掘必须持续五秒，松开清零而非累积点击", () => {
  const i = inputs(),
    r = createTimingRules("dig", { input: i });
  i.set(true, true);
  step(r, i, 60);
  assert.equal(r.getState().done, false);
  i.set(false);
  step(r, i, 1);
  assert.equal(r.getState().digProgress, 0);
  i.set(true, true);
  step(r, i, 99);
  assert.equal(r.getState().done, false);
  step(r, i, 2);
  assert.equal(r.getState().done, true);
});

test("倒土三轮各五秒，三秒警觉，中断本轮清零，触碰失败并允许从第一轮重试", () => {
  const i = inputs();
  let alerts = 0,
    touch = false;
  const make = () =>
    createTimingRules("soil", {
      input: i,
      guard: {
        alert: () => alerts++,
        release: () => {},
        touching: () => touch,
      },
    });
  let r = make();
  i.set(true);
  step(r, i, 61);
  assert.equal(alerts, 1);
  assert.equal(r.getState().completedCount, 0);
  i.set(false);
  step(r, i, 1);
  assert.equal(r.getState().progress, 0);
  i.set(true);
  step(r, i, 102);
  assert.equal(r.getState().completedCount, 1);
  touch = true;
  step(r, i, 1);
  assert.equal(r.getState().failed, true);
  assert.equal(r.getState().done, false);
  touch = false;
  r = make();
  assert.equal(r.getState().completedCount, 0);
  step(r, i, 304);
  assert.equal(r.getState().done, true);
  assert.equal(r.getState().completedCount, 3);
  const patrol = createSoilPatrol(i);
  assert.equal(patrol.guards.length, 3);
  patrol.alert();
  assert.equal(patrol.guards.filter((g) => g.investigatingSoilDump).length, 1);
  patrol.release();
  assert.ok(patrol.guards.every((g) => !g.investigatingSoilDump));
});

test("雷声砸管：静默敲击失败，提前松手不计分，一窗一次，五次才完成", () => {
  const i = inputs();
  let thunder = 0,
    r = createTimingRules("thunder", { input: i, thunder: () => thunder++ });
  i.set(true, true);
  step(r, i, 1);
  assert.equal(r.getState().failed, true);
  i.set(false);
  r = createTimingRules("thunder", { input: i, thunder: () => thunder++ });
  const waitCue = () => {
    i.set(false);
    let frames = 0;
    while (!r.getState().cueLit) {
      step(r, i, 1);
      assert.ok(frames++ < 100);
    }
  };
  waitCue();
  i.set(true, true);
  step(r, i, 5);
  i.set(false);
  step(r, i, 1);
  assert.equal(r.getState().smashSuccessCount, 0);
  i.set(true, true);
  step(r, i, 14);
  assert.equal(r.getState().smashSuccessCount, 1);
  i.set(false);
  step(r, i, 1);
  i.set(true, true);
  step(r, i, 3);
  assert.equal(r.getState().smashSuccessCount, 1);
  for (let hits = 2; hits <= 5; hits++) {
    i.set(false);
    while (r.getState().cueLit) step(r, i, 1);
    waitCue();
    i.set(true, true);
    step(r, i, 14);
    assert.equal(r.getState().smashSuccessCount, hits);
    assert.equal(r.getState().done, hits === 5);
  }
  assert.ok(thunder >= 5);
});

test("超市保留原版三单、错误清洁袋判定及顾客推进，资源只改路径", () => {
  const source = readOriginal("shared/ending-definitions.js");
  const context = {};
  vm.runInNewContext(
    originalBlock(source, "class BaggingSystem {", "const productSpots =") +
      "\nthis.BaggingSystem=BaggingSystem;",
    context,
  );
  const b = new context.BaggingSystem();
  assert.equal(b.orders.length, 3);
  assert.equal(b.pick(), true);
  assert.equal(b.place(1).ok, false);
  assert.equal(b.held, null);
  assert.equal(b.index, 0);
  for (let order = 0; order < 3; order++) {
    for (let index = 0; index < 4; index++) {
      const bag = b.current().bag;
      assert.equal(b.pick(), true);
      const result = b.place(bag);
      assert.equal(result.ok, true);
      assert.equal(result.complete, index === 3);
    }
    if (order < 2) b.nextOrder();
  }
  const generated = storeSource();
  assert.ok(generated.includes(originalFunction(source, "drawStore")));
  assert.ok(generated.includes("class SortingBagGame"));
  const routed = routeOriginalAssets(
    readOriginal("一结局/ending-one-games.js"),
  );
  assert.ok(!routed.includes("`../assets/"));
  assert.ok(routed.includes("player_bus_n.webp"));
  assert.ok(routed.includes("player_bus_w.webp"));
});

test("组件完成事件和任务对应，准备、失败或其他关卡事件不能推进剧情", () => {
  for (const spec of Object.values(ORIGINAL_GAMES).filter((s) => s.event)) {
    assert.equal(
      isOriginalCompletion(spec, { source: spec.source, type: spec.event }),
      true,
    );
    assert.equal(
      isOriginalCompletion(spec, { source: spec.source, type: "READY" }),
      false,
    );
    assert.equal(
      isOriginalCompletion(spec, { source: "wrong-game", type: spec.event }),
      false,
    );
    assert.equal(isOriginalCompletion(spec, null), false);
  }
  assert.deepEqual(completionTasks("threeBag"), [
    "threeBag",
    "threeAsk",
    "threeDecide",
  ]);
  assert.deepEqual(completionTasks("hideHammer"), ["hideHammer"]);
});
