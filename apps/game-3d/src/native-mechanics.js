import * as THREE from 'three';
import { createActor } from './actor.js';
import { block } from './practice-geometry.js';
import { moveWithCollision } from './movement.js';

const CHALLENGES = {
  firstDig: { kind: 'dig', target: 'rubble', title: '挖掘墙后的通道', hold: 5 },
  dumpSoil1: { kind: 'soil', target: 'soilSpot', title: '分三次倒掉碎土', hold: 5 },
  smashPipe: { kind: 'thunder', target: 'pipeTarget', title: '借雷声敲开管道', hold: .7 },
};
const OFFICE_TASKS = ['hideOffice', 'sideHide'];
const VISIT = { enter: 3, search: 5, leave: 3 };
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class NativeMechanics {
  constructor(view, { root, getGame, update = () => {}, finish = () => {}, notify = () => {}, enabled = () => true, createTimingRules }) {
    Object.assign(this, { view, root, getGame, update, finish, notify, enabled, createTimingRules });
    this.down = false; this.pressed = false; this.session = null; this.guards = [];
    this.hammer = new THREE.Group();
    block(this.hammer, .1, .7, .1, 0, 0, 0, '#92785a');
    block(this.hammer, .5, .18, .18, 0, .35, 0, '#8e9997');
    root.add(this.hammer); this.hammer.visible = false;
    this.flash = new THREE.PointLight('#d3eaff', 0, 25); this.flash.position.set(0, 5, -4); root.add(this.flash);
    if (view.world.config.id === 'office') {
      this.visitor = createActor({ shirt: '#56636a', hair: '#665349' });
      root.add(this.visitor); this.visitor.visible = false;
    }
    if (view.world.config.id === 'yard') {
      for (const [index, position] of [[-5, 7], [-7, 13], [-14, 12]].entries()) {
        const actor = createActor({ shirt: '#657d81', hair: '#5f5049' });
        actor.position.set(position[0], 0, position[1]); actor.visible = false; root.add(actor);
        this.guards.push({ actor, home: actor.position.clone(), phase: index * 2, alerted: false });
      }
    }
    if (typeof document !== 'undefined') this.createHud();
  }
  anchor(id) { return this.view.world.anchors.find(item => item.userData.assetKey === id); }
  get office() { return this.getGame()?.practice.office || { phase: 'idle', elapsed: 0, task: null }; }
  get officeActive() {
    return this.view.world.config.id === 'office' && OFFICE_TASKS.includes(this.getGame()?.step);
  }
  get active() { return Boolean(this.session) || this.officeActive; }
  get movementLocked() {
    return Boolean(this.session && this.down && !this.session.failed) ||
      (this.officeActive && ['enter', 'search', 'leave', 'failed'].includes(this.office.phase));
  }
  start(action) {
    if (!this.enabled() || this.disposed) return false;
    if (OFFICE_TASKS.includes(action.id) && this.officeActive) {
      const curtain = this.anchor('curtain');
      if (action.id !== this.getGame().step || !curtain || distance(this.view.hero.position, curtain.position) > 2.8) return false;
      if (this.office.phase === 'failed') this.retryOffice();
      else if (['idle', 'countdown'].includes(this.office.phase)) {
        this.release();
        this.update('office', { task: action.id, phase: 'enter', elapsed: 0 }, true);
        this.notify('你躲进窗帘后。等脚步声远去，再走出来。');
        this.sync();
      }
      return true;
    }
    if (this.active) { this.notify('先完成眼前的行动，或停止当前劳作。'); return true; }
    const config = CHALLENGES[action.id];
    if (!config || !this.createTimingRules || this.getGame()?.step !== action.id) return false;
    const target = this.anchor(config.target);
    if (!target || distance(this.view.hero.position, target.position) > 2.8) return false;
    this.session = { ...config, id: action.id, target, failed: false };
    this.resetRules(); this.renderHud(); return true;
  }
  resetRules() {
    this.release(); this.session.failed = false;
    this.rules = this.createTimingRules(this.session.kind, {
      input: { actionDown: () => this.down, actionPressed: () => this.pressed },
      guard: {
        touching: () => this.guards.some(g => distance(g.actor.position, this.view.hero.position) < .75),
        alert: () => {
          const nearest = [...this.guards].sort((a, b) =>
            distance(a.actor.position, this.view.hero.position) - distance(b.actor.position, this.view.hero.position))[0];
          if (nearest) nearest.alerted = true;
        },
        release: () => this.guards.forEach(g => { g.alerted = false; }),
      },
      thunder: () => this.playThunder(),
    });
  }
  handleActionKey(down) {
    if (!this.session) return this.officeActive && !['idle', 'countdown'].includes(this.office.phase);
    if (down && this.enabled() && !this.session.failed) {
      if (distance(this.view.hero.position, this.session.target.position) > 2.8) {
        this.release(); this.notify('靠近目标后再开始劳作。'); return true;
      }
      this.pressed ||= !this.down; this.down = true;
    } else if (!down) this.release();
    return true;
  }
  release() {
    this.down = false; this.pressed = false;
    this.guards.forEach(g => { g.alerted = false; });
    if (this.rules && !this.session?.failed) this.rules.update(0);
    if (this.audio) { this.audio.pause(); this.audio.currentTime = 0; }
  }
  playThunder() {
    if (typeof Audio === 'undefined') return;
    this.audio ||= new Audio(new URL('../../../Beyond the wall/音效/四秒雷声.opus', import.meta.url).href);
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {});
  }
  retryOffice() {
    this.update('office', { task: this.getGame().step, phase: 'countdown', elapsed: 0 }, true);
    this.sync();
  }
  updateOffice(dt, elapsed) {
    if (!this.officeActive) return;
    let state = this.office;
    if (state.task !== this.getGame().step || state.phase === 'idle' || state.phase === 'passed') {
      state = { task: this.getGame().step, phase: 'countdown', elapsed: 0 };
      this.update('office', state, false);
    }
    if (state.phase === 'failed') return;
    const duration = state.phase === 'countdown' ? 10 : VISIT[state.phase];
    const time = Math.min(duration, state.elapsed + dt);
    if (this.visitor && VISIT[state.phase]) {
      const door = new THREE.Vector3(0, 0, 7.3), corner = new THREE.Vector3(4, 0, -2), desk = new THREE.Vector3(2, 0, -3);
      const position = time / duration;
      if (state.phase === 'enter') this.visitor.position.copy(door).lerp(corner, position);
      if (state.phase === 'search') this.visitor.position.copy(corner).lerp(desk, position);
      if (state.phase === 'leave') this.visitor.position.copy(desk).lerp(corner, Math.min(1, position * 3)).lerp(door, Math.max(0, (position - 1 / 3) * 1.5));
      const target = state.phase === 'leave' ? door : desk;
      this.visitor.rotation.y = Math.atan2(target.x - this.visitor.position.x, target.z - this.visitor.position.z);
      this.visitor.userData.animate(elapsed, state.phase === 'search' ? .1 : .6);
    }
    this.update('office', { ...state, elapsed: time }, false);
    if (time < duration) return;
    if (state.phase === 'leave') {
      this.update('office', { ...state, phase: 'passed', elapsed: 0 }, false);
      this.sync(); this.finish(state.task); return;
    }
    const phase = ({ countdown: 'failed', enter: 'search', search: 'leave' })[state.phase];
    this.update('office', { ...state, phase, elapsed: 0 }, true);
    if (phase === 'failed') this.notify('脚步已经到门口，你还没藏好。重新尝试这次躲藏。');
    this.sync();
  }
  updateGuards(dt, elapsed) {
    const visible = this.getGame()?.step === 'dumpSoil1';
    for (const guard of this.guards) {
      guard.actor.visible = visible;
      if (!visible) continue;
      const target = guard.alerted ? this.view.hero.position :
        guard.home.clone().add(new THREE.Vector3(Math.sin(elapsed * .25 + guard.phase) * 2, 0, Math.cos(elapsed * .25 + guard.phase) * 1.5));
      const dx = target.x - guard.actor.position.x, dz = target.z - guard.actor.position.z, length = Math.hypot(dx, dz);
      const step = Math.min(length, dt * (guard.alerted ? .9 : .65));
      if (length > .01) {
        moveWithCollision(guard.actor.position, dx / length * step, dz / length * step, this.view.world.config.size, this.view.world.colliders);
        guard.actor.rotation.y = Math.atan2(dx, dz);
      }
      guard.actor.userData.animate(elapsed, .5);
    }
  }
  updateFrame(dt, elapsed) {
    if (this.disposed) return;
    if (!this.enabled() || (typeof document !== 'undefined' && document.hidden)) { this.release(); this.renderHud(); return; }
    this.updateOffice(dt, elapsed);
    if (this.disposed) return;
    this.updateGuards(dt, elapsed);
    if (this.session && !this.session.failed) {
      if (distance(this.view.hero.position, this.session.target.position) > 2.8) this.release();
      this.rules.update(dt); this.pressed = false;
      const state = this.rules.getState();
      const pipe = this.anchor('pipeTarget');
      if (pipe && this.session.kind === 'thunder') pipe.scale.x = state.smashSuccessCount >= 3 ? .83 : 1;
      this.flash.intensity = state.cueLit ? 25 : 0;
      this.hammer.visible = this.down;
      this.hammer.position.copy(this.view.hero.position).add(new THREE.Vector3(.65, 1.4, .1));
      this.hammer.rotation.z = this.down ? Math.sin(elapsed * 16) * .8 : 0;
      if (state.failed) {
        this.session.failed = true; this.release(); this.flash.intensity = 0; this.hammer.visible = false;
        this.notify(this.session.kind === 'soil' ? '狱警发现你在倒土，本次三轮劳作需要重新开始。' : '敲击声没有被雷声盖住。等待下一次机会。');
      } else if (state.done) {
        const id = this.session.id; this.release(); this.session = null; this.rules = null;
        this.hammer.visible = false; this.flash.intensity = 0; this.finish(id);
        if (this.disposed) return;
      }
    }
    this.renderHud();
  }
  sync() {
    const hidden = this.officeActive && ['enter', 'search', 'leave'].includes(this.office.phase);
    this.view.hero.visible = !hidden && !this.view.environmentOnly;
    if (this.visitor) this.visitor.visible = hidden;
    const pipe = this.anchor('pipeTarget');
    if (pipe) pipe.scale.x = this.getGame()?.events.includes('smashPipe') ? .65 : (this.rules?.getState().smashSuccessCount >= 3 ? .83 : 1);
    this.renderHud();
  }
  createHud() {
    this.hud = document.createElement('section'); this.hud.className = 'native-challenge'; this.hud.hidden = true;
    this.hud.innerHTML = '<strong></strong><p role="status" aria-live="polite"></p><progress max="1" value="0"></progress><div><button type="button" class="native-hold">按住劳作</button><button type="button" class="native-retry">重新尝试</button><button type="button" class="native-stop">停止劳作</button></div>';
    document.body.append(this.hud);
    this.holdButton = this.hud.querySelector('.native-hold');
    this.holdButton.addEventListener('pointerdown', event => {
      event.preventDefault(); this.holdButton.setPointerCapture(event.pointerId); this.handleActionKey(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      this.holdButton.addEventListener(type, () => this.handleActionKey(false));
    this.hud.querySelector('.native-retry').addEventListener('click', () => {
      if (this.officeActive) this.retryOffice(); else if (this.session) this.resetRules();
      this.view.canvas.focus(); this.renderHud();
    });
    this.hud.querySelector('.native-stop').addEventListener('click', () => {
      this.release(); this.session = null; this.rules = null; this.flash.intensity = 0; this.hammer.visible = false;
      this.view.canvas.focus(); this.renderHud();
    });
  }
  renderHud() {
    if (!this.hud) return;
    const office = this.officeActive, session = this.session, state = this.rules?.getState();
    this.hud.hidden = (!office && !session) || !this.enabled() || this.disposed;
    if (this.hud.hidden) return;
    const failed = office ? this.office.phase === 'failed' : session.failed;
    this.hud.dataset.cue = String(Boolean(state?.cueLit));
    this.hud.querySelector('strong').textContent = office ? '窗帘后的躲藏' : session.title;
    let text, progress = 0;
    if (office) {
      text = ({ idle: '十秒内到窗帘后躲藏', countdown: `来人还有 ${Math.ceil(10 - this.office.elapsed)} 秒 · 到窗帘旁按空格躲藏`,
        enter: '已藏好 · 来人正在走进办公室', search: '已藏好 · 来人正在查看书桌', leave: '已藏好 · 等脚步声离开',
        failed: '没能及时躲好，重新尝试', passed: '脚步声已经远去' })[this.office.phase];
      progress = this.office.phase === 'countdown' ? 1 - this.office.elapsed / 10 : this.office.elapsed / (VISIT[this.office.phase] || 1);
    } else {
      if (session.kind === 'dig') { text = '持续按住空格或下方按钮 5 秒；松开重新挖掘'; progress = state.digProgress / 5; }
      if (session.kind === 'soil') {
        text = `已倒土 ${state.completedCount}/3 次 · ${state.guardAlerted ? '狱警正在靠近，松开躲避！' : '按住 5 秒倒土，注意巡逻狱警'}`;
        progress = state.progress / 5;
      }
      if (session.kind === 'thunder') {
        text = `已敲击 ${state.smashSuccessCount}/5 次 · ${state.cueLit ? '雷声！按下并持续 0.7 秒' : '保持安静，等待雷声'}${state.smashSuccessCount >= 3 ? ' · 管道已开裂' : ''}`;
        progress = state.smashHoldTime / .7;
      }
      if (failed) text = session.kind === 'soil' ? '倒土时被发现，重新尝试三轮劳作' : '敲管声惊动了狱警，重新尝试';
    }
    const status = this.hud.querySelector('p'); if (status.textContent !== text) status.textContent = text;
    this.hud.querySelector('progress').value = Math.min(1, Math.max(0, progress));
    this.holdButton.hidden = office || failed;
    this.hud.querySelector('.native-retry').hidden = !failed;
    this.hud.querySelector('.native-stop').hidden = office;
  }
  dispose() {
    this.disposed = true; this.release(); this.hud?.remove(); this.view.hero.visible = !this.view.environmentOnly;
  }
}
