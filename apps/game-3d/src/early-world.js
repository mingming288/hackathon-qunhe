import * as THREE from 'three';
import { makeProp } from './kit.js';
import { replaceAsset } from './assets.js';
import { disposeWorld } from './world.js';
import { canStand } from './movement.js';
import { practiceComplete } from './practice-state.js';
import { block, bookModel, lettering, disposePracticeObject } from './practice-geometry.js';
import { createPipeDamage } from './pipe-damage.js';
import { OfficeStage } from './office-stage.js';
import { OfficeSafeStage } from './office-safe-stage.js';
import { NativeMechanics } from './native-mechanics.js';

// 玩法附件只引用现有物件和入口，不修改建筑、陈设数据或碰撞布局。
export class EarlyWorld {
  constructor(view, { getGame, update = () => {}, finish = () => {}, notify = () => {}, enabled = () => true, createTimingRules }) {
    Object.assign(this, { view, getGame, update, finish, notify, enabled });
    this.root = new THREE.Group(); view.world.root.add(this.root); this.points = new Map();
    const anchors = view.world.anchors;
    const find = key => anchors.find(anchor => anchor.userData.assetKey === key);
    this.desk = find('desk'); this.bed = find('bed');
    const embroidery = find('embroidery');
    if (view.world.config.id === 'office' && embroidery) this.office = new OfficeStage(embroidery, getGame().events.includes('openSafe'));
    const safe = find('safe');
    if (view.world.config.id === 'office' && safe) this.officeSafe = new OfficeSafeStage(safe, getGame().events.includes('swapLedger'));
    const pipe = find('pipeTarget');
    if (pipe && view.world.config.id === 'pipe') this.pipeDamage = createPipeDamage(pipe);
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
      }
      const wall = this.point('wallClue', find('poster'), new THREE.Vector3(0, 0, -.12));
      if (wall) {
        for (let i = 0; i < 4; i++) block(wall, .035, .2, .035, Math.sin(i * 2) * .08, 1.3 + i * .18, 0, '#626d59');
        lettering(wall, '松动的砂浆', 0, 2.2, .05, 1.6, .25);
      }
      this.guard = makeProp('guard'); this.guard.visible = false; view.world.root.add(this.guard);
      if (view.catalog?.guard) {
        const stageWorld = view.world;
        this.guard.userData.placeholder.visible = false;
        replaceAsset(this.guard, view.catalog.guard, () => view.world === stageWorld && this.guard?.parent).then(mixer => {
          if (mixer && view.world === stageWorld && this.guard?.parent) view.mixers.push(mixer);
        }).catch(() => {
          if (view.world === stageWorld && this.guard?.parent) { this.guard.userData.placeholder.visible = true; this.notify('检查狱警模型未载入，暂用基础形象。'); }
        });
      }
      this.door = view.world.portals.find(portal => portal.id === 'cellCorridor')?.object.position.clone() || new THREE.Vector3();
      this.checkPoint = this.nearDesk();
    }
    this.native = new NativeMechanics(view, { root: this.root, getGame, update, finish, notify, enabled, createTimingRules });
    this.sync();
  }
  point(id, source, offset = new THREE.Vector3()) {
    if (!source) return null;
    source.updateWorldMatrix(true, false);
    const point = new THREE.Group(); point.position.copy(source.localToWorld(offset.clone())); point.position.y = 0;
    point.rotation.y = source.rotation.y; this.root.add(point); this.points.set(id, point); return point;
  }
  anchor(id) { return this.points.get(id); }
  get labels() { return []; }
  interactions() { return []; }
  start(action) { return this.native.start(action); }
  handleActionKey(down) { return this.native.handleActionKey(down); }
  release() { this.native.release(); }
  get active() { return this.native.active; }
  get movementLocked() { return this.native.movementLocked; }
  sync() {
    const game = this.getGame();
    this.office?.sync(game.events.includes('openSafe'));
    this.officeSafe?.sync(game.events.includes('swapLedger'));
    this.setPipeDamage(game.events.includes('smashPipe') ? 5 : (this.pipeDamageHits || 0));
    const wall = this.points.get('wallClue'); if (wall) wall.visible = game.step === 'inspectWall';
    const poster = this.view.world.anchors.find(anchor => anchor.userData.assetKey === 'poster');
    if (poster && this.view.world.config.id === 'cell') {
      const hung = game.events.includes('hangPoster');
      for (const visual of poster.children) visual.visible = hung && (visual !== poster.userData.placeholder || !poster.userData.replaced);
    }
    const radio = this.points.get('radioRepaired'); if (radio) radio.visible = game.events.includes('repairRadio');
    if (this.cellBook) {
      // 正式外观仍由原资产入口加载；未接入时用能显示开合状态的玩法模型。
      const available = game.items.includes('bible');
      this.cellBook.visible = available && !this.originalBible.userData.replaced;
      this.originalBible.visible = available && Boolean(this.originalBible.userData.replaced);
      this.cellBook.userData.cover.rotation.y = 0;
    }
    this.native?.sync();
  }

  setPipeDamage(hits) { this.pipeDamageHits = hits; this.pipeDamage?.setHits(hits); }

  guide(guide) {
    const game = this.getGame(), state = game.practice;
    if (['enter', 'search', 'leave'].includes(state.inspection.phase)) {
      return { ...guide, title: '站在床边，观察检查过程', target: 'bed', marker: '检查中 · 请留在床边',
        place: '狱警正在' + ({ enter: '进入牢房。', search: '查看书桌。', leave: '离开牢房。' }[state.inspection.phase]),
        action: '可以环顾观察；离开床边会暂停检查。等检查结束后再继续活动。' };
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
    this.native.updateFrame(dt, elapsed);
    if (this.disposed) return;
    const game = this.getGame(), check = game.practice.inspection;
    if (this.enabled()) this.office?.update(dt);
    if (this.enabled()) this.officeSafe?.update(dt);
    if (game.step === 'finalDig' && this.view.world.config.id === 'dig' && this.enabled()) {
      const exit = this.view.world.portals.find(portal => portal.id === 'pipe')?.object;
      this.entryTime = exit && this.view.hero.position.distanceTo(exit.position) < 2.2 ? (this.entryTime || 0) + dt : 0;
      if (this.entryTime >= .3) { this.entryTime = 0; this.finish('finalDig'); return; }
    }
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
    this.guard.userData.mixer?.setMoving?.(check.phase !== 'search');
    this.update('inspection', { ...check, elapsed: time }, false);
    if (time < duration) return;
    if (check.phase === 'enter') { this.setInspection({ ...check, phase: 'search', elapsed: 0 }); this.notify('狱警正在查看桌上的书和物品。'); }
    else if (check.phase === 'search') { this.setInspection({ ...check, phase: 'leave', elapsed: 0 }); this.notify(check.unsafe ? '石锤没有藏好，狱警已经发现了它。' : '狱警合上书，转身离开。'); }
    else {
      this.setInspection({ phase: 'passed', unsafe: false, elapsed: 0 });
      this.finish(check.unsafe ? 'riskInspection' : 'inspection');
    }
  }
  dispose() {
    this.disposed = true;
    this.native.dispose();
    if (this.guard) { disposeWorld({ root: this.guard }); this.guard = null; }
    if (this.pipeDamage) disposePracticeObject(this.pipeDamage.root);
    disposePracticeObject(this.root);
  }
}
