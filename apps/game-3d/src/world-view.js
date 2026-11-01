import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld, disposeWorld } from './world.js';
import { createActor } from './actor.js';
import { ThirdPersonController } from './controller.js';
import { NpcController } from './npc-controller.js';
import { replaceAsset, preloadModel } from './assets.js';
import { entryPosition, transitionOrientation } from './navigation.js';
import { CHARACTER_NAMES } from './kit.js';
import { AutoTravel } from './auto-travel.js';
import { revealPendingCharacters } from './scene-load-gate.js';
import { goalDirection, pipeExitWaypoint } from './goal-direction.js';
import { guideWaypoint } from './guide-route.js';
import { AutoWalk } from './auto-walk.js';
import { SCENE_BY_ID } from './scenes.js';

export class WorldView {
  constructor({ canvas, labelRoot, interactButton, enabled, onAutosave, onAutoTravel = () => {}, onMapUpdate = () => {}, notify }) {
    this.canvas = canvas; this.labelRoot = labelRoot; this.button = interactButton; this.notify = notify; this.onAutoTravel = onAutoTravel;
    this.onMapUpdate = onMapUpdate;
    this.environmentOnly = false; this.enabled = enabled;
    this.labels = []; this.mixers = []; this.interactions = []; this.preloads = new Map(); this.version = 0; this.onAutosave = onAutosave;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .95;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 130);
    this.scene.add(new THREE.HemisphereLight('#ded9c7', '#4d5852', 1.8));
    const sun = new THREE.DirectionalLight('#e5d5ad', 2.4); sun.position.set(-15, 24, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 }); sun.shadow.normalBias = .035;
    this.scene.add(sun); this.setHero('andy');
    this.controls = new ThirdPersonController(this.camera, this.hero, canvas);
    this.controls.enabled = () => enabled() && !this.environmentOnly && !this.stage?.movementLocked;
    this.orbit = new OrbitControls(this.camera, canvas); this.orbit.enabled = false;
    this.orbit.enableDamping = true; this.orbit.minPolarAngle = .1; this.orbit.maxPolarAngle = Math.PI * .49;
    this.button.addEventListener('click', () => this.current?.run());
    window.addEventListener('keydown', event => {
      if (event.code === 'Space' && !event.repeat && enabled() && !event.target.closest('button, input')) {
        event.preventDefault();
        if (!this.stage?.handleActionKey(true)) this.current?.run();
      }
    });
    window.addEventListener('keyup', event => { if (event.code === 'Space') this.stage?.handleActionKey(false); });
    window.addEventListener('blur', () => this.pause());
    window.addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); notify('图形上下文中断，请重新载入页面。'); });
    this.last = performance.now(); this.elapsed = 0; this.savedAt = this.last;
    document.addEventListener('visibilitychange', () => { this.last = null; this.pause(); });
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

  preloadScene(config, catalog, character) {
    const key = config.id + ':' + character;
    if (this.preloads.has(key)) return this.preloads.get(key);
    const pending = (async () => {
      const world = createWorld(config);
      try {
        const entries = [...world.anchors, ...(world.vistaAnchors || [])].map(anchor =>
          catalog[(anchor.userData.assetScope || config.id) + ':' + anchor.userData.assetKey] || catalog[anchor.userData.assetKey]);
        entries.push(catalog[character]);
        await Promise.allSettled(entries.filter(Boolean).map(preloadModel));
      } finally { disposeWorld(world); }
    })().catch(error => { this.preloads.delete(key); throw error; });
    this.preloads.set(key, pending);
    return pending;
  }

  show(config, { from = null, location = null, character = 'andy', catalog = {}, environmentOnly = false, seamless = false } = {}) {
    this.autoWalk = null;
    const previousYaw = this.controls.yaw, previousFacing = this.hero.rotation.y, previousMotionYaw = this.controls.motionYaw;
    const previousPosition = seamless ? this.position() : null;
    this.setStage(null);
    if (this.world) disposeWorld(this.world);
    this.environmentOnly = environmentOnly;
    this.catalog = catalog;
    this.setHero(character); this.version++; this.mixers = [];
    this.hero.visible = !environmentOnly;
    this.world = createWorld(config, { includeCharacters: !environmentOnly, includeHelpers: !environmentOnly });
    this.npcs = new NpcController(this.world);
    this.baseColliders = [...this.world.colliders]; this.scene.add(this.world.root);
    this.scene.background = new THREE.Color(this.world.background); this.scene.fog = new THREE.Fog(this.world.fog, 35, 95);
    const position = entryPosition(this.world, from, location, previousPosition);
    const portal = this.world.portals.find(item => item.id === from)?.object.position;
    const orientation = environmentOnly ? { yaw: 0, facing: Math.PI }
      : transitionOrientation(from, config.id, previousYaw, previousFacing, { portal, position });
    this.hero.position.set(position.x, 0, position.z); this.hero.rotation.y = orientation.facing;
    this.autoTravel = new AutoTravel(position, this.world.portals);
    this.hero.scale.y = config.id === 'pipeNetwork' ? .72 : 1;
    this.resetCamera(orientation.yaw, seamless);
    if (seamless && previousMotionYaw !== null) {
      this.controls.motionYaw = transitionOrientation(from, config.id, previousMotionYaw, previousFacing, { portal, position }).yaw;
    }
    this.interactions = []; this.current = null; this.button.hidden = true; this.goal = null;
    const version = this.version;
    const loading = [];
    for (const anchor of [...this.world.anchors, ...(this.world.vistaAnchors || []), ...(environmentOnly ? [] : [this.hero])]) {
      const entry = catalog[(anchor.userData.assetScope || config.id) + ':' + anchor.userData.assetKey] || catalog[anchor.userData.assetKey]; if (!entry) continue;
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

  revealPendingCharacters() {
    const characters = this.world.anchors.filter(anchor => Object.hasOwn(CHARACTER_NAMES, anchor.userData.assetKey));
    return revealPendingCharacters([...characters, this.hero]);
  }

  setStage(stage) { this.stage?.dispose(); this.stage = stage; }

  configure({ interactions, goal, goalLabel = '当前目标', portalRules = {}, hidden = [] }) {
    this.nextGuideAt = 0; this.guideWaypoint = null;
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
      if (portal.object !== this.goal) this.addLabel((locked ? '暂未开放 · ' : '进入 ') + portal.name + ' ↗', portal.object, portal.object.userData.labelHeight ?? 3.3, '', !locked);
    }
    this.world.anchors.filter(anchor => anchor.visible && anchor !== this.goal && anchor.userData.label).forEach(anchor => this.addLabel(anchor.userData.label, anchor, 2.9, '', this.interactions.some(item => item.object === anchor)));
    if (this.goal) this.addLabel(goalLabel + ' ↓', this.goal, this.goal.userData.labelHeight ?? 3.6, 'goal-label', true);
    for (const { object, text, height } of this.stage?.labels || []) this.addLabel(text, object, height);
  }

  addLabel(text, object, height, extra = '', clickable = false) {
    const label = document.createElement(clickable ? 'button' : 'span'); label.className = 'world-label ' + extra; label.textContent = text;
    if (clickable) { label.type = 'button'; label.title = '点击自动走近'; label.addEventListener('click', () => this.walkTo(object)); }
    this.labelRoot.append(label); this.labels.push({ label, object, height });
  }

  position() { return { x: this.hero.position.x, z: this.hero.position.z }; }
  pause() { this.autoWalk = null; this.controls.keys.clear(); this.stage?.release(); }
  walkTo(object = this.goal) {
    if (!object || !this.controls.enabled() || this.environmentOnly) return false;
    const portal = this.world.portals.find(item => item.object === object);
    if (portal && this.portalRules?.[portal.id]) { this.notify('这条路暂未开放。'); return false; }
    this.pause(); this.autoWalk = new AutoWalk(object, Boolean(portal));
    this.notify('正在走近目标，按方向键可取消。'); this.canvas.focus(); return true;
  }
  // 未指定方向时从人物背后看向其前方；场景预览仍使用默认视角。
  resetCamera(yaw = this.environmentOnly ? 0 : this.hero.rotation.y + Math.PI, preserveKeys = false) {
    this.controls.reset({ preserveKeys, preserveView: preserveKeys });
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
    const frameTime = this.last === null ? 0 : Math.max(0, (now - this.last) / 1000);
    this.last = now;
    if (document.hidden) { this.last = null; return; }
    // Preserve movement speed during slow frames; discard long stalls and background time.
    const dt = frameTime <= .25 ? frameTime : 0; this.elapsed += dt;
    if (!this.world) return;
    this.orbit.enabled = this.environmentOnly && this.enabled();
    let speed = 0;
    if (this.environmentOnly) this.orbit.update();
    else {
      let automatic = null;
      if (this.autoWalk && this.controls.enabled()) {
        const manual = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].some(key => this.controls.keys.has(key));
        if (manual) { this.autoWalk = null; this.notify('已取消自动行走。'); }
        else {
          const portal = this.world.portals.find(item => item.object === this.autoWalk.object);
          const result = this.autoWalk.update(this.world, this.hero.position, dt, portal && this.autoTravel.blocked.has(portal.id));
          if (result.status === 'walking') automatic = result.direction;
          else { this.autoWalk = null; this.notify(result.status === 'arrived' ? '已到达，按空格互动。' : '暂时无法到达，请手动绕过障碍。'); }
        }
      }
      speed = this.controls.update(dt, this.world, automatic);
      this.hero.userData.mixer?.setMoving?.(speed > .05);
      this.heroVisual.userData.animate(this.elapsed, speed / 3.3);
    }
    this.npcs?.update(dt, this.elapsed, this.hero.position,
      this.enabled() && !this.environmentOnly && !this.stage?.active && !this.stage?.movementLocked);
    const version = this.version;
    this.stage?.updateFrame(dt, this.elapsed);
    if (version !== this.version) return;
    if (!this.environmentOnly) {
      // 靠近开放入口时在后台准备相邻场景，减少实际过门时的等待。
      if (this.controls.enabled()) {
        const portal = this.world.portals.filter(item => !this.portalRules?.[item.id])
          .map(item => ({ item, distance: Math.hypot(item.object.position.x - this.hero.position.x, item.object.position.z - this.hero.position.z) }))
          .filter(item => item.distance < 7).sort((a, b) => a.distance - b.distance)[0]?.item;
        if (portal) this.preloadScene(SCENE_BY_ID.get(portal.id), this.catalog, this.heroId).catch(() => {});
      }
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
    const direction = document.getElementById('goal-direction');
    const portalHint = document.getElementById('portal-hint');
    if (portalHint) {
      const portal = this.world.portals.find(item => item.object === this.goal);
      portalHint.hidden = this.environmentOnly || !portal || Boolean(this.portalRules?.[portal.id]) ||
        Math.hypot(portal.object.position.x - this.hero.position.x, portal.object.position.z - this.hero.position.z) > 2.8;
    }
    if (direction) {
      direction.hidden = this.environmentOnly || !this.goal || !this.goal.visible;
      if (!direction.hidden) {
        const target = this.goal.getWorldPosition(projected);
        const pipeWaypoint = this.world.config.id === 'pipeNetwork' && this.goal === this.world.portals.find(portal => portal.id === 'rain')?.object
          ? pipeExitWaypoint(this.hero.position) : null;
        if (this.elapsed >= (this.nextGuideAt || 0)) {
          const portal = this.world.portals.some(item => item.object === this.goal);
          this.guideWaypoint = pipeWaypoint ? null : guideWaypoint(this.world, this.hero.position, target, portal ? 1.15 : 2.2);
          this.nextGuideAt = this.elapsed + .35;
        }
        const waypoint = pipeWaypoint || this.guideWaypoint;
        const text = goalDirection(this.hero.position, waypoint || target, this.controls.yaw, waypoint ? { nearDistance: 0, label: '绕过障碍' } : undefined);
        if (direction.textContent !== text) direction.textContent = text;
      }
    }
    for (const { label, object, height } of this.labels) {
      object.getWorldPosition(projected); projected.y += height;
      const distance = projected.distanceTo(this.camera.position); projected.project(this.camera);
      label.hidden = !object.visible || projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.05 || Math.abs(projected.y) > 1.05 || distance > 30;
      if (!label.hidden) label.style.transform = 'translate(-50%,-50%) translate(' + (projected.x + 1) * innerWidth / 2 + 'px,' + (1 - projected.y) * innerHeight / 2 + 'px)';
    }
    this.onMapUpdate?.(this.hero, this.goal);
    this.renderer.render(this.scene, this.camera);
    if (now - this.savedAt > 5000) { this.onAutosave(); this.savedAt = now; }
  }
}
