import * as THREE from 'three';
import { createActor } from './actor.js';
import { canStand } from './movement.js';
import { LIBRARY_BOOKS, SHELF_LABELS, practiceComplete } from './practice-state.js';
import { block, bookModel, hammerModel, lettering, disposePracticeObject } from './practice-geometry.js';

// 玩法附件只引用现有物件和入口，不修改建筑、陈设数据或碰撞布局。
export class EarlyWorld {
  constructor(view, { getGame, update, finish, notify, enabled }) {
    Object.assign(this, { view, getGame, update, finish, notify, enabled });
    this.root = new THREE.Group(); view.world.root.add(this.root); this.points = new Map();
    const anchors = view.world.anchors;
    const find = key => anchors.find(anchor => anchor.userData.assetKey === key);
    this.desk = find('desk'); this.bed = find('bed');
    const radio = find('radio');
    if (radio) {
      const indicator = this.point('radioRepaired', radio);
      block(indicator, .12, .12, .06, .8, .75, .5, '#6b9169');
      lettering(indicator, '传动已修复', 0, 1.35, .5, 1.5, .2);
    }
    if (view.world.config.id === 'cell') {
      this.originalBible = find('bible');
      if (this.originalBible) {
        this.cellBook = bookModel('#6a7763', true); this.cellBook.scale.setScalar(.45);
        this.cellBook.position.copy(this.originalBible.position); this.cellBook.rotation.x = -Math.PI / 2; this.root.add(this.cellBook);
        this.hiddenHammer = hammerModel(); this.hiddenHammer.scale.setScalar(.85); this.hiddenHammer.position.z = .23; this.cellBook.add(this.hiddenHammer);
      }
      const wall = this.point('wallClue', find('poster'), new THREE.Vector3(0, 0, .28));
      if (wall) {
        for (let i = 0; i < 4; i++) block(wall, .035, .2, .035, Math.sin(i * 2) * .08, 1.3 + i * .18, 0, '#626d59');
        lettering(wall, '松动的砂浆', 0, 2.2, .05, 1.6, .25);
      }
      this.guard = createActor({ shirt: '#657d81', hair: '#5f5049' }); this.guard.visible = false; this.root.add(this.guard);
      this.door = view.world.portals.find(portal => portal.id === 'cellCorridor')?.object.position.clone() || new THREE.Vector3();
      this.checkPoint = this.nearDesk();
    }
    if (view.world.config.id === 'library') {
      this.originalBooks = find('books');
      const desk = this.point('books', this.originalBooks);
      if (desk) this.pile = LIBRARY_BOOKS.map((book, index) => {
        const model = bookModel(book.color, false, book.code); model.scale.setScalar(.35); model.rotation.x = -Math.PI / 2;
        model.position.set((index - 1) * .6, 1.4, 0); desk.add(model); return model;
      });
      const shelves = anchors.filter(anchor => anchor.userData.assetKey === 'shelf').slice(0, 3);
      this.shelves = shelves.map((shelf, index) => {
        const point = this.point('bookShelf:' + index, shelf, new THREE.Vector3(0, 0, 1.35));
        lettering(point, SHELF_LABELS[index], 0, 2, .05, 1.8, .3);
        const book = LIBRARY_BOOKS.find(book => book.shelf === index);
        const returned = bookModel(book.color, false, book.code);
        returned.scale.setScalar(.35); returned.position.set(0, 1.2, 0); point.add(returned); point.userData.returned = returned;
        return point;
      });
      this.held = bookModel('#6d796e', false, '馆藏书'); this.held.scale.setScalar(.3); this.held.position.set(.35, 1.2, .5); view.hero.add(this.held);
    }
    this.sync();
  }
  point(id, source, offset = new THREE.Vector3()) {
    if (!source) return null;
    source.updateWorldMatrix(true, false);
    const point = new THREE.Group(); point.position.copy(source.localToWorld(offset.clone())); point.position.y = 0;
    point.rotation.y = source.rotation.y; this.root.add(point); this.points.set(id, point); return point;
  }
  anchor(id) { return this.points.get(id); }
  get labels() {
    return this.getGame().step === 'sortBooks' ? (this.shelves || []).map((object, i) => ({ object, text: SHELF_LABELS[i], height: 2.8 })) : [];
  }
  interactions() {
    const game = this.getGame();
    if (game.step !== 'sortBooks' || !game.practice.books.carrying) return [];
    return (this.shelves || []).map((point, shelf) => ({ target: 'bookShelf:' + shelf, priority: 3, range: 2.5,
      label: '把手中的书放入 ' + SHELF_LABELS[shelf], run: () => this.update('books', { type: 'place', shelf }, true) }));
  }
  sync() {
    const game = this.getGame();
    const wall = this.points.get('wallClue'); if (wall) wall.visible = game.step === 'inspectWall';
    const radio = this.points.get('radioRepaired'); if (radio) radio.visible = game.events.includes('repairRadio');
    if (this.cellBook) {
      // 正式外观仍由原资产入口加载；未接入时用能显示开合状态的玩法模型。
      const available = game.items.includes('bible');
      this.cellBook.visible = available && !this.originalBible.userData.replaced;
      this.originalBible.visible = available && Boolean(this.originalBible.userData.replaced);
      this.cellBook.userData.cover.rotation.y = game.practice.hide.open ? -2.25 : 0;
      this.hiddenHammer.visible = game.practice.hide.placed && game.practice.hide.open;
    }
    if (this.originalBooks) {
      this.originalBooks.visible = false;
      const state = game.practice.books;
      if (state.carrying && state.carrying !== this.heldId) {
        const book = LIBRARY_BOOKS.find(item => item.id === state.carrying);
        disposePracticeObject(this.held); this.held = bookModel(book.color, false, book.code);
        this.held.scale.setScalar(.3); this.held.position.set(.35, 1.2, .5); this.view.hero.add(this.held); this.heldId = book.id;
      }
      this.pile.forEach((model, index) => { const book = LIBRARY_BOOKS[index]; model.visible = !state.placed.includes(book.id) && state.carrying !== book.id; });
      this.shelves.forEach((shelf, index) => {
        shelf.visible = game.step === 'sortBooks' || state.placed.length > 0;
        shelf.userData.returned.visible = state.placed.some(id => LIBRARY_BOOKS.find(book => book.id === id).shelf === index);
      });
      this.held.visible = Boolean(state.carrying) && game.step === 'sortBooks';
    }
  }
  guide(guide) {
    const game = this.getGame(), state = game.practice;
    if (['enter', 'search', 'leave'].includes(state.inspection.phase)) {
      return { ...guide, title: '站在床边，观察检查过程', target: 'bed', marker: '检查中 · 请留在床边',
        place: '狱警正在' + ({ enter: '进入牢房。', search: '查看书桌。', leave: '离开牢房。' }[state.inspection.phase]),
        action: '可以环顾观察；离开床边会暂停检查。等检查结束后再继续活动。' };
    }
    if (game.step === 'sortBooks' && game.scene === 'library') {
      const book = LIBRARY_BOOKS.find(item => item.id === state.books.carrying);
      return { ...guide, target: book ? null : 'books', place: '已归位 ' + state.books.placed.length + '/3 · ' + (book ? '手持《' + book.title + '》，书脊编号 ' + book.code : '去整理桌拿下一本书。'),
        action: book ? '阅读书脊字母，走到相应书架前，按空格放入。放错不会清除进度。' : '靠近整理桌，按空格拿起一本，再走到对应分类书架。' };
    }
    return guide;
  }
  nearDesk() {
    if (!this.desk) return new THREE.Vector3();
    for (let angle = 0; angle < Math.PI * 2; angle += .3) {
      const point = new THREE.Vector3(this.desk.position.x + Math.sin(angle) * 2.5, 0, this.desk.position.z + Math.cos(angle) * 2.5);
      if (canStand(point.x, point.z, this.view.world.config.size, this.view.world.colliders)) return point;
    }
    return this.desk.position.clone();
  }
  startInspection(unsafe = false) {
    if (!this.guard || !this.bed) return false;
    if (!['idle', 'passed'].includes(this.getGame().practice.inspection.phase)) { this.notify('检查正在进行，请留在床边观察。'); return true; }
    unsafe ||= !practiceComplete(this.getGame().practice, 'hide');
    this.setInspection({ phase: 'enter', unsafe, elapsed: 0 });
    this.notify(unsafe ? '你选择了未藏好石锤就接受检查。请站到床边，观察后果。' : '门口响起脚步声。站在床边，等狱警检查书桌。');
    return true;
  }
  setInspection(state) {
    this.update('inspection', state, true); this.guard.visible = state.phase !== 'idle' && state.phase !== 'passed';
  }
  updateFrame(dt, elapsed) {
    const game = this.getGame(), check = game.practice.inspection;
    if (!this.guard || ['idle', 'passed'].includes(check.phase)) return;
    this.guard.visible = true;
    if (!this.enabled() || (typeof document !== 'undefined' && document.hidden)) return;
    const here = this.view.hero.position, bed = this.bed.position;
    if (Math.hypot(here.x - bed.x, here.z - bed.z) > 3.1) {
      if (!this.waiting) this.notify('请站回床边，狱警正在等你。检查进度已保留。'); this.waiting = true; return;
    }
    this.waiting = false;
    const duration = check.phase === 'search' ? 2.5 : 3, time = Math.min(duration, check.elapsed + dt);
    const from = check.phase === 'leave' ? this.checkPoint : this.door;
    const to = check.phase === 'enter' ? this.checkPoint : check.phase === 'leave' ? this.door : this.checkPoint;
    this.guard.position.copy(from).lerp(to, check.phase === 'search' ? 1 : time / duration);
    const look = check.phase === 'search' ? this.desk.position : to;
    this.guard.rotation.y = Math.atan2(look.x - this.guard.position.x, look.z - this.guard.position.z);
    this.guard.userData.animate(elapsed, check.phase === 'search' ? 0 : .55);
    this.update('inspection', { ...check, elapsed: time }, false);
    if (time < duration) return;
    if (check.phase === 'enter') { this.setInspection({ ...check, phase: 'search', elapsed: 0 }); this.notify('狱警正在查看桌上的书和物品。'); }
    else if (check.phase === 'search') { this.setInspection({ ...check, phase: 'leave', elapsed: 0 }); this.notify(check.unsafe ? '石锤没有藏好，狱警已经发现了它。' : '狱警合上书，转身离开。'); }
    else {
      this.setInspection({ phase: 'passed', unsafe: false, elapsed: 0 });
      this.finish(check.unsafe ? 'riskInspection' : 'inspection');
    }
  }
  dispose() { if (this.held) disposePracticeObject(this.held); disposePracticeObject(this.root); }
}
