// 小游戏的进行中状态由原组件管理；这里只记录剧情已确认的结果。
export function createPractice() {
  return {
    wall: { rubbed: 0, tried: 0 },
    radio: { complete: false },
    hammer: { received: false },
    bible: { received: false },
    books: { complete: false },
    hide: { open: false, placed: false, closed: false },
    inspection: { phase: "idle", unsafe: false, elapsed: 0 },
  };
}
export function practiceComplete(practice, kind) {
  if (kind === "hide") return practice.hide.placed && practice.hide.closed;
  if (kind === "radio" || kind === "books") return practice[kind].complete;
  if (kind === "hammer" || kind === "bible") return practice[kind].received;
  if (kind === "wall")
    return practice.wall.rubbed >= 1 && practice.wall.tried >= 1;
  return false;
}
export function completePractice(practice, id) {
  const next = structuredClone(practice);
  if (id === "inspectWall") next.wall = { rubbed: 1, tried: 1 };
  if (id === "repairRadio") next.radio.complete = true;
  if (id === "takeHammer") next.hammer.received = true;
  if (id === "sortBooks") next.books.complete = true;
  if (id === "getBible") next.bible.received = true;
  if (id === "hideHammer")
    next.hide = { open: false, placed: true, closed: true };
  if (id === "inspection")
    next.inspection = { phase: "passed", unsafe: false, elapsed: 0 };
  return next;
}
export function restorePractice(record, events) {
  let result = createPractice();
  const check = record?.inspection;
  if (
    check &&
    ["idle", "enter", "search", "leave", "passed"].includes(check.phase)
  ) {
    result.inspection = {
      phase: check.phase,
      unsafe: check.unsafe === true,
      elapsed: Number.isFinite(check.elapsed)
        ? Math.max(0, Math.min(3, check.elapsed))
        : 0,
    };
  }
  // 不把旧替代玩法的半成品视为通关，避免跳过原版判定；既有已完成事件仍然保留。
  for (const id of events) result = completePractice(result, id);
  return result;
}
