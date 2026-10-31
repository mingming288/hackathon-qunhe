export const ORIGINAL_GAMES = {
  repairRadio: {
    kind: "gear",
    source: "gear-calibration",
    event: "GEAR_CALIBRATION_COMPLETE",
    seed: "red-radio",
  },
  sortBooks: {
    kind: "bookshelf",
    source: "magic-bookshelf",
    event: "BOOKSHELF_COMPLETE",
    seed: "brooks-library",
  },
  drawMap: {
    kind: "pipeMaze",
    source: "pipe-maze",
    event: "PIPE_MAZE_COMPLETE",
    seed: "andy-map",
  },
  hideHammer: { kind: "hide" },
  firstDig: { kind: "dig" },
  dumpSoil1: { kind: "soil" },
  smashPipe: { kind: "thunder" },
  oneBox: { kind: "oak" },
  oneBus: { kind: "route" },
  threeCollect: { kind: "store", phase: "collect" },
  threeBag: { kind: "store", phase: "sorting" },
  threeAsk: { kind: "store", phase: "orders" },
  threeDecide: { kind: "store", phase: "orders" },
};
export function isOriginalCompletion(spec, message) {
  return Boolean(
    spec.event &&
      message?.source === spec.source &&
      message.type === spec.event,
  );
}
export function completionTasks(id) {
  const retail = ["threeCollect", "threeBag", "threeAsk", "threeDecide"];
  return retail.includes(id) ? retail.slice(retail.indexOf(id)) : [id];
}
