// 先淡出旧场景，再替换场景；期间锁定移动，取消或新场景可使旧过渡失效。
export function fadeBeforeTravel({ gate, fade, canTravel, run, schedule = setTimeout }) {
  const revision = gate.begin(true);
  fade.classList.add('show');
  schedule(() => {
    if (gate.revision !== revision) return;
    if (!canTravel()) {
      gate.finish(revision);
      fade.classList.remove('show');
      return;
    }
    run();
  }, 300);
}
