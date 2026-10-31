import * as THREE from 'three';
import { createPracticeModel, disposePracticeObject } from './practice-geometry.js';
import { signalStrength } from './practice-state.js';
import { PracticeAudio } from './practice-audio.js';
import './practice.css';

const node = (tag, text, className) => {
  const item = document.createElement(tag); if (text) item.textContent = text; if (className) item.className = className; return item;
};

export class PracticeWorkbench {
  constructor({ getPractice, change, finish, onClose }) {
    Object.assign(this, { getPractice, change, finish, onClose });
    this.dialog = node('dialog', '', 'practice-dialog'); this.dialog.setAttribute('aria-labelledby', 'practice-title');
    const heading = node('div', '', 'dialog-heading'); this.title = node('h2'); this.title.id = 'practice-title';
    const exit = node('button', '收起，稍后继续'); exit.type = 'button'; exit.onclick = () => this.close();
    heading.append(this.title, exit); this.hint = node('p', '', 'practice-hint'); this.hint.setAttribute('role', 'status');
    this.canvas = node('canvas'); this.canvas.tabIndex = 0; this.canvas.setAttribute('role', 'application');
    this.canvas.setAttribute('aria-label', '近景物件操作，方向键移动，旋转键调整方向，空格拿放或持续观察');
    this.progress = node('progress'); this.progress.max = 1; this.progress.setAttribute('aria-label', '当前操作进度');
    this.tools = node('div', '', 'practice-tools');
    this.help = node('p', '拖动物件操作；键盘：方向键移动，旋转键调整方向，空格拿放。', 'practice-help');
    this.dialog.append(heading, this.hint, this.canvas, this.progress, this.tools, this.help); document.body.append(this.dialog);
    this.dialog.addEventListener('close', () => { if (!this.dialog.open) this.cleanup(); });
    this.audio = new PracticeAudio(); this.bindInput();
    window.addEventListener('resize', () => { if (this.busy) this.resize(); });
    window.addEventListener('blur', () => { this.holding = false; this.drag = null; });
  }

  get busy() { return this.dialog.open; }
  button(text, run) {
    const button = node('button', text); button.type = 'button'; button.addEventListener('click', () => { run(); this.canvas.focus(); });
    this.tools.append(button); return button;
  }
  send(event) {
    const result = this.change(this.kind, event);
    if (result.message) this.message = result.message;
    else if (event.type !== 'tick') this.message = '';
    if (result.complete && !this.completing) {
      this.completing = true; const kind = this.kind; this.close(); this.finish(kind);
    }
    return result;
  }
  open(kind, title) {
    this.kind = kind; this.title.textContent = title; this.message = ''; this.completing = false; this.holding = false;
    this.tools.replaceChildren(); this.model = createPracticeModel(kind);
    this.renderer ||= new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#e8dfca'); this.scene.add(this.model.root);
    this.scene.add(new THREE.HemisphereLight('#fff4d6', '#687b69', 2.5));
    const light = new THREE.DirectionalLight('#fff5de', 3); light.position.set(-3, 5, 7); this.scene.add(light);
    this.camera = new THREE.OrthographicCamera(-3.2, 3.2, 2.2, -2.2, .1, 30); this.camera.position.set(0, 0, 10);
    this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.35);
    if (kind === 'wall') {
      const hold = this.button('按住试着徒手撬动', () => {});
      hold.addEventListener('pointerdown', event => { event.preventDefault(); hold.setPointerCapture(event.pointerId); this.holding = true; });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) hold.addEventListener(type, () => { this.holding = false; });
      this.help.textContent = '沿裂缝拖动擦去浮灰，再按住试撬。键盘可以按住空格完成相同操作。';
    } else if (kind === 'radio') {
      this.coverButton = this.button('打开后盖', () => this.send({ type: 'open' }));
      const label = node('label', '调谐旋钮 '); this.tuner = node('input'); this.tuner.type = 'range'; this.tuner.min = 0; this.tuner.max = 100; this.tuner.step = .5;
      this.tuner.setAttribute('aria-label', '调谐旋钮'); label.append(this.tuner); this.tools.append(label);
      this.tuner.addEventListener('input', () => this.send({ type: 'tune', value: Number(this.tuner.value) }));
      this.muteButton = this.button('关闭声音', () => { this.muted = !this.muted; this.muteButton.textContent = this.muted ? '开启声音' : '关闭声音'; });
      this.muted = false; this.audio.start();
      this.help.textContent = '打开后盖，把齿轮拖到空轴后松手，再慢慢转动旋钮。键盘方向键移动齿轮、空格放下；接好后左右键调频。';
    } else {
      if (kind === 'hide') {
        this.button('打开圣经', () => this.send({ type: 'open' }));
        this.button('合上圣经并放回桌面', () => this.send({ type: 'close' }));
      }
      this.button('旋转物品', () => this.send({ type: 'rotate', amount: Math.PI / 8 }));
      this.help.textContent = '拖动物品，松手放下；方向键移动，字母键Ｒ或旋转按钮调整方向，空格放下。';
    }
    this.dialog.showModal(); this.resize(); this.canvas.focus(); this.last = performance.now(); this.frame(this.last);
  }
  close() { if (this.dialog.open) this.dialog.close(); this.cleanup(); }
  cleanup() {
    cancelAnimationFrame(this.frameId); this.audio.stop(); this.drag = null; this.holding = false;
    if (!this.model) return;
    disposePracticeObject(this.model.root); this.model = null;
    this.onClose();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(), aspect = rect.width / rect.height;
    const height = Math.max(2.2, 3.15 / aspect);
    Object.assign(this.camera, { left: -height * aspect, right: height * aspect, top: height, bottom: -height });
    this.camera.updateProjectionMatrix(); this.renderer.setSize(rect.width, rect.height, false);
  }
  point(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), this.camera);
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
  }
  bindInput() {
    this.canvas.addEventListener('pointerdown', event => {
      const point = this.point(event); let control;
      this.scene.updateMatrixWorld(true);
      for (const hit of this.ray.intersectObject(this.model.root, true)) {
        let part = hit.object, visible = true, found;
        while (part) { visible &&= part.visible; found ||= part.userData.control; part = part.parent; }
        if (visible && found) { control = found; break; }
      }
      if (!control || !point) return;
      const state = this.getPractice()[this.kind];
      this.drag = { control, start: point, initial: structuredClone(state[control] || state), frequency: state.frequency };
      this.canvas.setPointerCapture(event.pointerId); this.canvas.focus(); event.preventDefault();
    });
    this.canvas.addEventListener('pointermove', event => {
      if (!this.drag) return; const point = this.point(event); if (!point) return;
      const { control, start, initial, frequency } = this.drag, dx = point.x - start.x, dy = point.y - start.y;
      if (control === 'wall') this.send({ type: 'rub', amount: Math.min(.12, Math.hypot(dx, dy) * .08) });
      else if (control === 'dial') this.send({ type: 'tune', value: frequency + dx * 25 });
      else this.send({ type: 'move', x: initial.x + dx, y: initial.y + dy, angle: initial.angle + (control === 'item' ? dx * .8 : 0) });
    });
    const release = () => { if (this.drag && !['wall', 'dial'].includes(this.drag.control)) this.send({ type: 'release' }); this.drag = null; };
    this.canvas.addEventListener('pointerup', release); this.canvas.addEventListener('pointercancel', () => { this.drag = null; });
    this.canvas.addEventListener('keydown', event => {
      if (!this.busy) return;
      event.stopPropagation();
      if (event.code === 'Space') { event.preventDefault(); if (this.kind === 'wall') this.holding = true; else if (!event.repeat) this.send({ type: 'release' }); return; }
      if (event.code === 'KeyR') { event.preventDefault(); this.send({ type: 'rotate', amount: Math.PI / 8 }); return; }
      const directions = { ArrowLeft: [-.1, 0], ArrowRight: [.1, 0], ArrowUp: [0, .1], ArrowDown: [0, -.1] };
      if (!directions[event.code]) return; event.preventDefault();
      const state = this.getPractice()[this.kind], [dx, dy] = directions[event.code];
      if (this.kind === 'radio' && (!state.open || state.seated)) this.send({ type: 'tune', value: state.frequency + dx * 10 });
      else if (this.kind !== 'wall') { const item = state.gear || state.hammer || state; this.send({ type: 'move', x: item.x + dx, y: item.y + dy, angle: item.angle }); }
    });
    this.canvas.addEventListener('keyup', event => { if (event.code === 'Space') this.holding = false; });
  }
  frame(now) {
    if (!this.busy || !this.model) return;
    const dt = Math.min((now - this.last) / 1000, .05); this.last = now;
    if (!document.hidden) {
      if (this.kind === 'radio') this.send({ type: 'tick', dt });
      if (this.kind === 'wall' && this.holding) this.send(this.getPractice().wall.rubbed < 1 ? { type: 'rub', amount: dt / 1.8 } : { type: 'try', dt });
    } else this.holding = false;
    if (!this.model || !this.busy) return;
    const state = this.getPractice()[this.kind]; this.model.update(state);
    let text = '', progress = 0;
    if (this.kind === 'wall') { text = state.rubbed < 1 ? '沿裂缝擦去浮灰，看看砂浆下面的痕迹。' : '砂浆松了，徒手能撬下来吗？按住试一试。'; progress = (state.rubbed + state.tried) / 2; }
    else if (this.kind === 'radio') {
      const signal = signalStrength(state); progress = state.stable / 2;
      text = !state.seated ? '旋钮空转，指针不动。打开后盖，找出脱位的传动件。'
        : '信号强度 ' + Math.round(signal * 100) + '% · ' + (signal >= .9 ? '信号清晰，保持旋钮稳定…' : '仍有杂音，慢慢调整旋钮。');
      this.tuner.value = state.frequency; this.coverButton.textContent = state.open ? '合上后盖' : '打开后盖'; this.audio.update(signal, this.muted);
    } else if (this.kind === 'hide') { text = !state.open && !state.placed ? '先打开圣经，看看书页中的空间。' : state.placed ? '石锤已经在凹槽里。合好书，放回桌上。' : '让锤柄顺着凹槽，调整方向后放进去。'; progress = state.placed ? .75 : state.open ? .2 : 0; }
    else { text = state.viewed ? '看清了。把物品拖到下方收取区域，再松手。' : this.kind === 'hammer' ? '这是一把小地质锤。拖动旋转看看，再接过来。' : '老布：有些东西，藏在字缝里更安全。旋转看看这本厚书。'; progress = state.viewed ? .5 : 0; }
    if (this.hint.textContent !== (this.message || text)) this.hint.textContent = this.message || text;
    this.progress.value = progress; this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(time => this.frame(time));
  }
}
