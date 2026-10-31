import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  readOriginal,
  originalBlock,
  originalConstant,
  originalFunction,
  routeOriginalAssets,
  originalRoot,
} from "./canonical-source.js";

const template = (name) =>
  readFileSync(
    fileURLToPath(new URL(`./${name}.txt`, import.meta.url)),
    "utf8",
  );
export function rulesSource() {
  const main = readOriginal("game/js/main.js");
  const functions = (names) =>
    names.map((name) => originalFunction(main, name)).join("\n");
  const hide = template("hide-rules")
    .replace("/* 原版布局 */", originalConstant(main, "HammerHidePuzzleLayout"))
    .replace(
      "/* 原版函数 */",
      functions([
        "getHammerHidePuzzleHammerRect",
        "isHammerOverBible",
        "moveHammerHidePuzzleItem",
        "resetHammerHidePuzzleItem",
        "finishHammerHidePuzzleDrop",
        "handleHammerHidePuzzleInput",
        "renderHammerHidePuzzle",
      ]),
    );
  const constants = [
    "DIG_REQUIRED_SECONDS",
    "SOIL_DUMP_HOLD_SECONDS",
    "SOIL_DUMP_GUARD_ALERT_SECONDS",
    "SOIL_DUMP_REQUIRED_COUNT",
    "YARD_GUARD_SOIL_INVESTIGATE_SPEED",
    "YARD_GUARD_CATCH_DISTANCE",
    "PIPE_CUE_ACTIVE_SECONDS",
    "PIPE_CUE_MIN_INTERVAL_SECONDS",
    "PIPE_CUE_MAX_INTERVAL_SECONDS",
    "PIPE_SMASH_HOLD_SECONDS",
    "PIPE_SMASH_REQUIRED_COUNT",
    "PIPE_SMASH_STAGE_TWO_COUNT",
  ];
  const timing = template("timing-rules")
    .replace(
      "/* 原版常量 */",
      constants.map((name) => originalConstant(main, name)).join("\n"),
    )
    .replace(
      "/* 原版函数 */",
      functions([
        "updateDigHold",
        "resetDigHoldProgress",
        "updateSoilDumping",
        "resetSoilDumpHold",
        "completeSoilDumpHold",
        "getRandomPipeCueDelay",
        "updatePipeCue",
        "updatePipeSmash",
        "completePipeSmashHold",
      ]),
    );
  const patrolConstants = [
    "PLAYER_SPEED",
    "YARD_GUARD_FAST_SPEED",
    "YARD_GUARD_SLOW_SPEED_MIN",
    "YARD_GUARD_SLOW_SPEED_MAX",
    "ROAMING_GUARD_TARGET_SPACING",
    "ROAMING_GUARD_GATE_BUFFER",
  ];
  const patrol = timing
    .replace(
      "/* 原版巡逻常量 */",
      patrolConstants.map((name) => originalConstant(main, name)).join("\n"),
    )
    .replace(
      "/* 原版巡逻函数 */",
      functions(["chooseYardGuardTarget", "chooseYardGuardSpeed"]),
    );
  return routeOriginalAssets(hide + "\n" + patrol);
}
export function storeSource() {
  const source = readOriginal("shared/ending-definitions.js");
  const classes =
    originalBlock(
      source,
      "class CollisionMap {",
      "class AndyEndingSequence {",
    ) +
    "\n" +
    originalBlock(
      source,
      "class SortingBagGame {",
      "class SplitEndingController {",
    );
  const helpers = [
    "updateHud",
    "showMessage",
    "playDialogue",
    "drawStore",
    "drawNpc",
    "drawManager",
    "drawPlayer",
  ]
    .map((name) => originalFunction(source, name))
    .join("\n");
  const ending = source.slice(source.indexOf('"three": Object.freeze'));
  const literal = (key) =>
    JSON.parse(
      ending.match(
        new RegExp("^\\s*" + key + ': (\"(?:\\\\.|[^\"\\\\])*\"),?$', "m"),
      )[1],
    );
  const presentation = `export const storeCss = ${JSON.stringify(literal("css"))};\nexport const storeBody = ${JSON.stringify(literal("body"))};\n`;
  return (
    presentation +
    routeOriginalAssets(
      template("store-rules")
        .replace("/* 原版类 */", classes)
        .replace("/* 原版函数 */", helpers),
    )
  );
}
export function originalGamesPlugin() {
  return {
    name: "original-beyond-walls-games",
    resolveId(id) {
      if (["virtual:original-rules", "virtual:original-store"].includes(id))
        return "\0" + id;
    },
    load(id) {
      if (id === "\0virtual:original-rules") {
        this.addWatchFile(originalRoot + "game/js/main.js");
        for (const name of ["hide-rules", "timing-rules"])
          this.addWatchFile(
            fileURLToPath(new URL(`./${name}.txt`, import.meta.url)),
          );
        return rulesSource();
      }
      if (id === "\0virtual:original-store") {
        this.addWatchFile(originalRoot + "shared/ending-definitions.js");
        this.addWatchFile(
          fileURLToPath(new URL("./store-rules.txt", import.meta.url)),
        );
        return storeSource();
      }
    },
    transform(code, id) {
      if (id === originalRoot + "一结局/ending-one-games.js")
        return { code: routeOriginalAssets(code), map: null };
      // 原组件实际倒计时为十秒，旧版说明残留二十五秒；只修正文案，不改判定。
      if (id === originalRoot + "地下水管迷宫/component.js")
        return {
          code: code.replace(
            "让路线跟随手指，25秒内找到出口",
            "让路线跟随手指，10秒内找到出口",
          ),
          map: null,
        };
    },
  };
}
