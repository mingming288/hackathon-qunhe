// 保留当前画面并提前准备目标场景，避免走过入口时出现黑屏。
export async function prepareTravel({ gate, load, canTravel, run, timeout = 8000 }) {
  const revision = gate.begin(true);
  let timer;
  try {
    await Promise.race([
      Promise.resolve().then(load),
      new Promise(resolve => { timer = setTimeout(resolve, timeout); }),
    ]);
  } catch {
    // 正式载入仍会重试，并在失败时显示替代模型。
  } finally { clearTimeout(timer); }
  if (gate.revision !== revision) return;
  if (!canTravel()) { gate.finish(revision); return; }
  run();
}
