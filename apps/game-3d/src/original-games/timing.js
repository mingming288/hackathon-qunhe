import {
  createTimingRules,
  createSoilPatrol,
  originalTiming,
} from "virtual:original-rules";
import { frameInput, animate } from "./input.js";
import thunderUrl from "../../../../Beyond the wall/音效/四秒雷声.opus";

const COPY = {
  dig: ["挖掘墙面", "按住空格或下方按钮，持续五秒；松开会清空本次进度。"],
  soil: [
    "分三次倒掉碎土",
    "用方向键移动，观察巡逻并找安全处倒土。每次按住五秒，松开会中断本轮；三秒后最近的狱警靠近，被碰到需从第一轮重试。",
  ],
  thunder: [
    "借雷声敲开管道",
    "等雷声亮起，再按住零点七秒，成功五次。每次雷声只能成功一次；静默时敲击会被发现。",
  ],
};
export function mountTiming(root, { kind, onComplete, onProgress = () => {} }) {
  root.innerHTML =
    '<section class="original-timing"><h3></h3><p class="timing-copy"></p><canvas width="580" height="620"></canvas><p class="timing-status" role="status"></p><progress max="1" value="0"></progress><div><button class="timing-hold" type="button">按住空格或这里</button><button class="timing-retry" type="button" hidden>从本关检查点重试</button></div></section>';
  const box = root.firstElementChild,
    canvas = box.querySelector("canvas"),
    ctx = canvas.getContext("2d"),
    status = box.querySelector(".timing-status"),
    progress = box.querySelector("progress"),
    hold = box.querySelector(".timing-hold"),
    retry = box.querySelector(".timing-retry");
  box.querySelector("h3").textContent = COPY[kind][0];
  box.querySelector(".timing-copy").textContent = COPY[kind][1];
  canvas.hidden = kind !== "soil";
  const input = frameInput(root),
    audio = new Audio(thunderUrl);
  audio.volume = 0.5;
  let rules,
    patrol,
    completed = false, lastProgress = "";
  const reset = () => {
    input.clear();
    patrol = createSoilPatrol(input);
    rules = createTimingRules(kind, {
      input,
      guard: patrol,
      thunder() {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      },
    });
    lastProgress = "";
    retry.hidden = true;
    hold.hidden = false;
    hold.disabled = false;
  };
  input.listen(hold, "pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    hold.setPointerCapture(e.pointerId);
    input.hold(true);
  });
  input.listen(hold, "pointerup", () => input.hold(false));
  input.listen(hold, "pointercancel", () => input.clear());
  input.listen(hold, "lostpointercapture", () => input.hold(false));
  input.listen(retry, "click", () => {
    reset();
    hold.focus();
  });
  reset();
  hold.focus();
  const draw = () => {
    ctx.fillStyle = "#19231f";
    ctx.fillRect(0, 0, 580, 620);
    ctx.save();
    ctx.translate(-500, -330);
    ctx.fillStyle = "#6d7051";
    ctx.beginPath();
    ctx.ellipse(790, 640, 190, 280, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a7b18a";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    for (const g of patrol.guards) {
      ctx.fillStyle = g.investigatingSoilDump ? "#e8ac67" : "#778eaa";
      ctx.beginPath();
      ctx.arc(g.x, g.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e6dfc5";
      ctx.fillText("狱警", g.x, g.y - 26);
    }
    ctx.fillStyle = "#e8dd9c";
    ctx.beginPath();
    ctx.arc(patrol.player.x, patrol.player.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText("安迪", patrol.player.x, patrol.player.y - 24);
    ctx.restore();
  };
  const stop = animate((dt) => {
    if (completed) return;
    const previous = rules.getState();
    if (!previous.failed && !previous.done) {
      if (kind === "soil") patrol.update(dt, input.actionDown());
      rules.update(dt);
    }
    input.endFrame();
    const state = rules.getState();
    if (kind === "thunder") {
      const key = `${state.smashSuccessCount}:${state.failed}:${state.done}`;
      if (key !== lastProgress) { lastProgress = key; onProgress(state); }
    }
    if (kind === "soil") draw();
    const value =
      kind === "dig"
        ? state.digProgress / originalTiming.dig
        : kind === "soil"
          ? state.progress / originalTiming.soilHold
          : state.smashHoldTime / originalTiming.smashHold;
    progress.value = value;
    box.classList.toggle("thunder-lit", kind === "thunder" && state.cueLit);
    status.textContent = state.failed
      ? kind === "soil"
        ? "倒土时被狱警抓住。三轮进度清空，碎土仍在。"
        : "敲击声暴露了位置。回到砸管前检查点，五次进度清空。"
      : state.done
        ? "完成。"
        : kind === "dig"
          ? `挖掘 ${(state.digProgress || 0).toFixed(1)} / 5 秒`
          : kind === "soil"
            ? `已完成 ${state.completedCount} / 3 次 · 本次 ${state.progress.toFixed(1)} / 5 秒${state.guardAlerted ? " · 狱警正在靠近！" : ""}`
            : `${state.smashWindowScored ? "本次已完成——等待下一次雷声" : state.cueLit ? "雷声响起——现在按住" : "静默——等待雷声"} · 成功 ${state.smashSuccessCount} / 5 · 管道第 ${state.smashSuccessCount >= originalTiming.stageTwo ? 2 : 1} 阶段`;
    if (state.failed) {
      input.clear();
      hold.hidden = true;
      retry.hidden = false;
    }
    if (state.done) {
      completed = true;
      hold.disabled = true;
      input.clear();
      onComplete();
    }
  });
  return {
    getState: () => rules.getState(),
    destroy() {
      stop();
      input.destroy();
      audio.pause();
      audio.src = "";
    },
  };
}
