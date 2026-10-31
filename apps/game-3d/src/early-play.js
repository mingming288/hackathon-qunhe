import { OriginalGameHost } from "./original-games/host.js";
import { ORIGINAL_GAMES, completionTasks } from "./original-games/registry.js";
import { EarlyWorld } from "./early-world.js";

export class EarlyPlay {
  constructor({ view, getGame, setPractice, complete, notify, enabled }) {
    Object.assign(this, {
      view,
      getGame,
      setPractice,
      complete,
      notify,
      enabled,
    });
    this.savedAt = 0;
    this.games = new OriginalGameHost({
      notify,
      onClose: () => view.canvas.focus(),
      finish: (id) => {
        // 超市原版包含收集、排序、三位顾客与请示，全部完成后再写入对应剧情事件。
        for (const task of completionTasks(id))
          if (getGame()?.step === task) complete(task);
      },
    });
  }
  get busy() {
    return this.games.busy;
  }
  get inspectionActive() {
    return ["enter", "search", "leave"].includes(
      this.getGame()?.practice.inspection.phase,
    );
  }
  attach() {
    this.view.setStage(
      new EarlyWorld(this.view, {
        getGame: this.getGame,
        update: (kind, event, refresh) => this.change(kind, event, refresh),
        finish: this.complete,
        notify: this.notify,
        enabled: this.enabled,
      }),
    );
  }
  change(kind, event, refresh = false) {
    const practice = { ...this.getGame().practice, [kind]: event },
      now = performance.now(),
      save = refresh || now - this.savedAt > 400;
    this.setPractice(practice, refresh, save);
    if (save) this.savedAt = now;
    if (refresh) this.view.canvas.focus();
  }
  perform(action) {
    if (this.inspectionActive) {
      this.notify("检查正在进行，请先站回床边，等狱警离开。");
      return true;
    }
    if (ORIGINAL_GAMES[action.id]) {
      this.view.pause();
      this.games.open(action);
      return true;
    }
    if (
      action.id === "inspection" ||
      (action.id === "riskInspection" && this.getGame().scene === "cell")
    )
      return this.view.stage?.startInspection(action.id === "riskInspection");
    return false;
  }
  guide(guide) {
    return this.view.stage?.guide(guide) || guide;
  }
  interactions() {
    return [];
  }
}
