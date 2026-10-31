import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld, disposeWorld } from './world.js';
import { createActor } from './actor.js';
import { ThirdPersonController } from './controller.js';
import { replaceAsset } from './assets.js';
import { entryPosition, transitionOrientation } from './navigation.js';
import { CHARACTER_NAMES } from './kit.js';
import { AutoTravel } from './auto-travel.js';

export class WorldView {
  constructor({ canvas, labelRoot, interactButton, enabled, onAutosave, onAutoTravel = () => {}, notify }) {
    this.canvas = canvas; this.labelRoot = labelRoot; this.button = interactButton; this.notify = notify; this.onAutoTravel = onAutoTravel;
    this.environmentOnly = false; this.enabled = enabled;
    this.labels = []; this.mixers = []; this.interactions = []; this.version = 0; this.onAutosave = onAutosave;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .95;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 130);
    this.scene.add(new THREE.HemisphereLight('#ded9c7', '#4d5852', 1.8));
    const sun = new THREE.DirectionalLight('#e5d5ad', 2.4); sun.position.set(-15, 24, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 }); sun.shadow.normalBias = .035;
    this.scene.add(sun); this.setHero('andy');
    this.controls = new ThirdPersonController(this.camera, this.hero, canvas);
    this.controls.enabled = () => enabled() && !this.environmentOnly;
    this.orbit = new OrbitControls(this.camera, canvas); this.orbit.enabled = false;
    this.orbit.enableDamping = true; this.orbit.minPolarAngle = .1; this.orbit.maxPolarAngle = Math.PI * .49;
    this.button.addEventListener('click', () => this.current?.run());
    window.addEventListener('keydown', event => {
      if (event.code === 'Space' && !event.repeat && enabled() && !event.target.closest('button, input')) {
        event.preventDefault(); this.current?.run();
      }
    });
    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); notify('图形上下文中断，请重新载入页面。'); });
    this.last = performance.now(); this.elapsed = 0; this.savedAt = this.last;
    this.renderer.setAnimationLoop(now => this.tick(now));
  }

  setHero(id) {
    if (this.heroId === id) return;
    if (this.hero) {
      // 复用现有释放逻辑，缓存中的正式模型不会被重复释放。
      disposeWorld({ root: this.hero });
    }
    this.heroId = id; this.hero = new THREE.Group();
    this.heroVisual = createActor(id === 'red' ? { skin: '#a67e60', shirt: '#8a9d80', hair: '#b8b7ad' } : {});
    this.hero.add(this.heroVisual); this.hero.userData = { assetKey: id, targetHeight: 2.5, placeholder: this.heroVisual };
    this.scene.add(this.hero); if (this.controls) this.controls.player = this.hero;
  }

  show(config, { from = null, location = null, character = 'andy', catalog = {}, environmentOnly = false } = {}) {
    const previousYaw = this.controls.yaw, previousFacing = this.hero.rotation.y;
    this.setStage(null);
    if (this.world) disposeWorld(this.world);
    this.environmentOnly = environmentOnly;
    this.catalog = catalog;
    this.setHero(character); this.version++; this.mixers = [];
    this.hero.visible = !environmentOnly;
    this.world = createWorld(config, { includeCharacters: !environmentOnly, includeHelpers: !environmentOnly });
    this.baseColliders = [...this.world.colliders]; this.scene.add(this.world.root);
    this.scene.background = new THREE.Color(this.world.background); this.scene.fog = new THREE.Fog(this.world.fog, 35, 95);
    const position = entryPosition(this.world, from, location);
    const portal = this.world.portals.find(item => item.id === from)?.object.position;
    const orientation = environmentOnly ? { yaw: 0, facing: Math.PI }
      : transitionOrientation(from, config.id, previousYaw, previousFacing, { portal, position });
    this.hero.position.set(position.x, 0, position.z); this.hero.rotation.y = orientation.facing;
    this.autoTravel = new AutoTravel(position, this.world.portals);
    this.hero.scale.y = config.id === 'pipeNetwork' ? .72 : 1;
    this.resetCamera(orientation.yaw);
    this.interactions = []; this.current = null; this.button.hidden = true; this.goal = null;
    const version = this.version;
    const loading = [];
    for (const anchor of [...this.world.anchors, ...(this.world.vistaAnchors || []), ...(environmentOnly ? [] : [this.hero])]) {
      const entry = catalog[config.id + ':' + anchor.userData.assetKey] || catalog[anchor.userData.assetKey]; if (!entry) continue;
      const character = anchor === this.hero || Object.hasOwn(CHARACTER_NAMES, anchor.userData.assetKey);
      if (character && !anchor.userData.replaced) anchor.userData.placeholder.visible = false;
      const pending = replaceAsset(anchor, entry, () => version === this.version).then(mixer => {
        if (version === this.version) { if (mixer) this.mixers.push(mixer); this.stage?.sync(); }
      }).catch(() => { if (version === this.version) {
        if (anchor.userData.mixer) this.mixers.push(anchor.userData.mixer);
        if (!anchor.userData.replaced) anchor.userData.placeholder.visible = true;
        this.notify(anchor.userData.replaced ? '人物动作未载入，可继续游戏，重新进入场景后会重试。' : '部分正式模型未载入，保留基础模型继续游戏。');
      } });
      loading.push(pending);
    }
    this.canvas.focus();
    return Promise.all(loading);
  }

  anchor(target) {
    return this.stage?.anchor(target) || (target.startsWith('exit:') ? this.world.portals.find(item => item.id === target.slice(5))?.object
      : this.world.anchors.find(item => item.userData.assetKey === target));
  }

  setStage(stage) { this.stage?.dispose(); this.stage = stage; }

  configure({ interactions, goal, goalLabel = '当前目标', portalRules = {}, hidden = [] }) {
    this.portalRules = portalRules;
    this.interactions = interactions.map(item => ({ ...item, object: this.anchor(item.target) })).filter(item => item.object);
    this.world.anchors.forEach(anchor => { anchor.visible = !hidden.includes(anchor.userData.assetKey); });
    this.stage?.sync();
    this.world.colliders = this.baseColliders.filter(collider => !hidden.includes(collider.assetKey));
    this.labelRoot.replaceChildren(); this.labels = [];
    if (this.environmentOnly) { this.goal = null; return; }
    this.goal = goal ? this.anchor(goal) : null;
    for (const portal of this.world.portals) {
      const locked = Boolean(portalRules[portal.id]);
      portal.ring.material.color.set(locked ? '#686b60' : '#b99755');
      if (portal.object !== this.goal) this.addLabel((locked ? '暂未开放 · ' : '进入 ') + portal.name + ' ↗', portal.object, portal.object.userData.labelHeight ?? 3.3);
    }
    this.world.anchors.filter(anchor => anchor.visible && anchor !== this.goal && anchor.userData.label).forEach(anchor => this.addLabel(anchor.userData.label, anchor, 2.9));
    if (this.goal) this.addLabel(goalLabel + ' ↓', this.goal, this.goal.userData.labelHeight ?? 3.6, 'goal-label');
    for (const { object, text, height } of this.stage?.labels || []) this.addLabel(text, object, height);
  }

  addLabel(text, object, height, extra = '') {
    const label = document.createElement('span'); label.className = 'world-label ' + extra; label.textContent = text;
    this.labelRoot.append(label); this.labels.push({ label, object, height });
  }

  position() { return { x: this.hero.position.x, z: this.hero.position.z }; }
  pause() { this.controls.keys.clear(); }
  resetCamera(yaw = 0) {
    this.controls.reset();
    this.controls.yaw = yaw;
    if (this.environmentOnly && this.world) {
      const sphere = new THREE.Box3().setFromObject(this.world.root).getBoundingSphere(new THREE.Sphere());
      const verticalAngle = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const visibleAngle = Math.min(verticalAngle, Math.atan(Math.tan(verticalAngle) * this.camera.aspect));
      const distance = sphere.radius / Math.sin(visibleAngle) * 1.08;
      this.orbit.target.copy(sphere.center);
      this.camera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(.8, .9, 1.2).normalize(), distance);
      this.orbit.minDistance = Math.max(1, sphere.radius * .08); this.orbit.maxDistance = distance * 2;
      this.camera.far = Math.max(130, distance * 4); this.scene.fog = null;
      this.orbit.update();
    } else {
      const target = this.hero.position.clone().add(new THREE.Vector3(0, 1.45, 0));
      const pitch = this.controls.pitch, distance = this.controls.distance;
      this.camera.position.copy(target).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance));
      this.camera.far = 130;
    }
    this.camera.updateProjectionMatrix(); this.canvas.focus();
  }

  tick(now) {
    const dt = Math.min((now - this.last) / 1000, .05); this.last = now; this.elapsed += dt;
    if (!this.world) return;
    this.orbit.enabled = this.environmentOnly && this.enabled();
    let speed = 0;
    if (this.environmentOnly) this.orbit.update();
    else {
      speed = this.controls.update(dt, this.world);
      this.hero.userData.mixer?.setMoving?.(speed > .05);
      this.heroVisual.userData.animate(this.elapsed, speed / 3.3);
    }
    this.world.animations.forEach(anchor => anchor.userData.animate(this.elapsed, 0));
    const version = this.version;
    this.stage?.updateFrame(dt, this.elapsed);
    if (version !== this.version) return;
    if (!this.environmentOnly) {
      const next = this.autoTravel.next(this.hero.position, speed > .05, this.controls.enabled(), this.world.portals, this.portalRules);
      if (next) { this.onAutoTravel(next); return; }
    }
    this.mixers.forEach(mixer => mixer.update(dt));
    if (this.world.rain) {
      const positions = this.world.rain.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) positions.setY(i, (positions.getY(i) - dt * 8 + 12) % 12);
      positions.needsUpdate = true;
    }
    this.current = this.interactions.map(item => ({ ...item, distance: Math.hypot(item.object.position.x - this.hero.position.x, item.object.position.z - this.hero.position.z) }))
      // 目标与门口相邻时，优先呈现当前剧情，避免锁定入口盖住推进按钮。
      .filter(item => item.distance < (item.range || 2.7) && item.object.visible)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.distance - b.distance)[0];
    this.button.hidden = !this.current || !this.controls.enabled();
    if (this.current) this.button.textContent = this.current.label + ' · 空格 / 点击';
    const projected = new THREE.Vector3();
    for (const { label, object, height } of this.labels) {
      object.getWorldPosition(projected); projected.y += height;
      const distance = projected.distanceTo(this.camera.position); projected.project(this.camera);
      label.hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05 || distance > 30;
      if (!label.hidden) label.style.transform = 'translate(-50%,-50%) translate(' + (projected.x + 1) * innerWidth / 2 + 'px,' + (1 - projected.y) * innerHeight / 2 + 'px)';
    }
    this.renderer.render(this.scene, this.camera);
    if (now - this.savedAt > 5000) { this.onAutosave(); this.savedAt = now; }
  }
}
