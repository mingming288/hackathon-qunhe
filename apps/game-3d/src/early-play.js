import { PracticeWorkbench } from './practice-workbench.js';
import { EarlyWorld } from './early-world.js';
import { changePractice, LIBRARY_BOOKS } from './practice-state.js';

const TASK_KIND = { inspectWall: 'wall', repairRadio: 'radio', takeHammer: 'hammer', getBible: 'bible', hideHammer: 'hide' };
const KIND_TASK = Object.fromEntries(Object.entries(TASK_KIND).map(([id, kind]) => [kind, id]));

export class EarlyPlay {
  constructor({ view, getGame, setPractice, complete, notify, enabled }) {
    Object.assign(this, { view, getGame, setPractice, complete, notify, enabled }); this.savedAt = 0;
    this.workbench = new PracticeWorkbench({ getPractice: () => getGame().practice,
      change: (kind, event) => this.change(kind, event), finish: kind => complete(KIND_TASK[kind]),
      onClose: () => { if (getGame()) this.setPractice(getGame().practice, false, true); view.canvas.focus(); } });
  }
  get busy() { return this.workbench.busy; }
  get inspectionActive() { return ['enter', 'search', 'leave'].includes(this.getGame()?.practice.inspection.phase); }
  attach() {
    this.view.setStage(new EarlyWorld(this.view, { getGame: this.getGame, update: (kind, event, refresh) => this.change(kind, event, refresh),
      finish: this.complete, notify: this.notify, enabled: this.enabled }));
  }
  change(kind, event, refresh = false) {
    const current = this.getGame().practice;
    const result = kind === 'inspection' ? { practice: { ...current, inspection: event }, complete: false, message: '' }
      : changePractice(current, kind, event);
    const now = performance.now(), save = refresh || result.complete || now - this.savedAt > 400;
    this.setPractice(result.practice, refresh, save); if (save) this.savedAt = now;
    if (['books', 'inspection'].includes(kind) && refresh) this.view.canvas.focus();
    if (refresh && result.message) this.notify(result.message);
    if (kind === 'books' && result.complete) this.complete('sortBooks');
    return result;
  }
  perform(action) {
    if (this.inspectionActive) { this.notify('检查正在进行，请先站回床边，等狱警离开。'); return true; }
    if (TASK_KIND[action.id]) { this.view.pause(); this.workbench.open(TASK_KIND[action.id], action.label); return true; }
    if (action.id === 'sortBooks') {
      if (this.getGame().practice.books.carrying) this.notify('手里已经有一本书，先按书脊编号把它归位。');
      else {
        const result = this.change('books', { type: 'pickup' }, true);
        const book = LIBRARY_BOOKS.find(item => item.id === result.practice.books.carrying);
        if (book) this.notify('拿起《' + book.title + '》 · 书脊 ' + book.code + '。走到对应字母的书架前放入。');
      }
      return true;
    }
    if (action.id === 'inspection' || (action.id === 'riskInspection' && this.getGame().scene === 'cell')) return this.view.stage?.startInspection(action.id === 'riskInspection');
    return false;
  }
  guide(guide) { return this.view.stage?.guide(guide) || guide; }
  interactions() { return this.view.stage?.interactions() || []; }
}
