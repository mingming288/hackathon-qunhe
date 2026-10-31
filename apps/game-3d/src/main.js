import * as THREE from 'three';
import './style.css';
import { SCENES, SCENE_BY_ID, CHAPTERS } from './scenes.js';
import { createWorld, disposeWorld } from './world.js';
import { createActor } from './actor.js';
import { ThirdPersonController } from './controller.js';
import { readModelCatalog, replaceAsset } from './assets.js';
import { canStand } from './movement.js';

const $ = id => document.getElementById(id);
const saveKey = 'beyond-walls-3d-scenes-v1';
const atlas = $('atlas'), detail = $('detail');
let world, currentInteraction, noticeTimer, worldVersion = 0, mixers = [];
let modelCatalog = {};
let renderer, controls, camera, scene, hero, heroVisual;
const labels = [];

function notify(message) {
  $('notice').textContent = message; $('notice').classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 4000);
}

function saveLocation() {
  if (!world || !hero) return;
  try { localStorage.setItem(saveKey, JSON.stringify({ version: 1, scene: world.config.id, x: hero.position.x, z: hero.position.z })); }
  catch { notify('浏览器未允许保存位置，本次仍可继续探索。'); }
}

function addLabel(text, object) {
  const label = document.createElement('span'); label.className = 'world-label'; label.textContent = text;
  $('floating-labels').append(label); labels.push({ label, object });
}

async function applyModels(version) {
  const anchors = [...world.anchors, hero];
  await Promise.all(anchors.map(async anchor => {
    const entry = modelCatalog[anchor.userData.assetKey];
    if (!entry) return;
    try {
      const mixer = await replaceAsset(anchor, entry);
      if (mixer && version === worldVersion) mixers.push(mixer);
    } catch { if (version === worldVersion) notify('部分模型未能载入，保留基础模型以便继续探索。'); }
  }));
}

function goTo(id, restore = null) {
  const config = SCENE_BY_ID.get(id);
  if (!config) return;
  if (world) { saveLocation(); disposeWorld(world); }
  worldVersion++; mixers = [];
  world = createWorld(config); scene.add(world.root);
  scene.background = new THREE.Color(world.background); scene.fog = new THREE.Fog(world.fog, 35, 95);
  hero.position.set(config.spawn[0], 0, config.spawn[1]); hero.rotation.y = Math.PI;
  if (restore && Number.isFinite(restore.x) && Number.isFinite(restore.z) && canStand(restore.x, restore.z, config.size, world.colliders)) hero.position.set(restore.x, 0, restore.z);
  controls.reset(); camera.position.copy(hero.position).add(new THREE.Vector3(0, 5, 7));
  $('chapter').textContent = config.chapter; $('scene-title').textContent = config.name; $('scene-note').textContent = config.note;
  $('scene-count').textContent = String(SCENES.indexOf(config) + 1).padStart(2, '0') + ' / ' + SCENES.length;
  document.querySelectorAll('[data-scene]').forEach(button => button.classList.toggle('active', button.dataset.scene === id));
  $('floating-labels').replaceChildren(); labels.length = 0;
  world.portals.forEach(portal => addLabel(portal.name + ' ↗', portal.object));
  world.anchors.filter(anchor => anchor.userData.label).forEach(anchor => addLabel(anchor.userData.label, anchor));
  currentInteraction = null; $('interact').hidden = true;
  if (atlas.open) atlas.close(); if (detail.open) detail.close();
  $('world').focus(); saveLocation(); void applyModels(worldVersion);
}

function updateInteraction() {
  const candidates = world.portals.map(portal => ({ name: '前往 ' + portal.name, object: portal.object, action: () => goTo(portal.id) }));
  world.anchors.filter(anchor => anchor.userData.label).forEach(anchor => {
    candidates.push({ name: '观察 ' + anchor.userData.label, object: anchor, action: () => {
      $('detail-title').textContent = anchor.userData.label;
      $('detail-copy').textContent = '这里已预留人物站位与三维资产替换位置。角色对话、任务条件和完整动作，将依据原游戏逐项接入。当前可以继续检查场景与通路。';
      detail.showModal(); controls.keys.clear();
    } });
  });
  const near = candidates.map(item => ({ ...item, distance: item.object.position.distanceTo(hero.position) })).filter(item => item.distance < 2.2).sort((a, b) => a.distance - b.distance)[0];
  currentInteraction = near || null;
  $('interact').hidden = !near || atlas.open || detail.open;
  if (near) $('interact').textContent = near.name + '　·　空格 / 点击';
}

function buildAtlas() {
  for (const chapter of CHAPTERS) {
    const section = document.createElement('section'); section.className = 'chapter-section';
    const heading = document.createElement('h3'); heading.textContent = chapter; section.append(heading);
    const grid = document.createElement('div'); grid.className = 'scene-grid'; section.append(grid);
    for (const config of SCENES.filter(item => item.chapter === chapter)) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.scene = config.id;
      const number = document.createElement('span'); number.className = 'scene-number'; number.textContent = String(SCENES.indexOf(config) + 1).padStart(2, '0');
      const name = document.createElement('strong'); name.textContent = config.name;
      const note = document.createElement('small'); note.textContent = config.note;
      button.append(number, name, note); button.addEventListener('click', () => goTo(config.id)); grid.append(button);
    }
    $('scene-list').append(section);
  }
}

function updateLabels() {
  const position = new THREE.Vector3();
  for (const { label, object } of labels) {
    object.getWorldPosition(position); position.y += object.userData.label ? 2.9 : .65;
    const distance = position.distanceTo(camera.position); position.project(camera);
    const visible = position.z > -1 && position.z < 1 && Math.abs(position.x) < 1.05 && Math.abs(position.y) < 1.05 && distance < 24;
    label.hidden = !visible;
    if (visible) label.style.transform = 'translate(-50%, -50%) translate(' + (position.x + 1) * innerWidth / 2 + 'px,' + (1 - position.y) * innerHeight / 2 + 'px)';
  }
}

async function start() {
  buildAtlas();
  renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 130);
  scene.add(new THREE.HemisphereLight('#f9efda', '#7c8982', 2.3));
  const sun = new THREE.DirectionalLight('#fff2d2', 3.2); sun.position.set(-15, 24, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -30; sun.shadow.camera.right = 30; sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30; sun.shadow.normalBias = .035; scene.add(sun);
  hero = new THREE.Group(); heroVisual = createActor(); hero.add(heroVisual); scene.add(hero);
  hero.userData = { assetKey: 'andy', targetHeight: 2.5, placeholder: heroVisual };
  controls = new ThirdPersonController(camera, hero, $('world')); controls.enabled = () => !atlas.open && !detail.open;
  $('open-atlas').addEventListener('click', () => { controls.keys.clear(); atlas.showModal(); });
  $('close-atlas').addEventListener('click', () => { atlas.close(); $('world').focus(); });
  $('close-detail').addEventListener('click', () => { detail.close(); $('world').focus(); });
  $('camera-reset').addEventListener('click', () => { controls.reset(); $('camera-reset').blur(); $('world').focus(); });
  $('interact').addEventListener('click', () => currentInteraction?.action());
  window.addEventListener('keydown', event => {
    if (event.code === 'Space' && !event.repeat && controls.enabled() && !event.target.closest('button')) { event.preventDefault(); currentInteraction?.action(); }
    if (event.code === 'Tab' && !atlas.open && !detail.open) { event.preventDefault(); controls.keys.clear(); atlas.showModal(); }
  });
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  window.addEventListener('pagehide', saveLocation);
  $('world').addEventListener('webglcontextlost', event => { event.preventDefault(); showError('图形上下文暂时中断，请重新载入页面。'); });
  let restored = null;
  try { const data = JSON.parse(localStorage.getItem(saveKey)); if (data?.version === 1 && SCENE_BY_ID.has(data.scene)) restored = data; }
  catch { /* 损坏的场景预览记录不影响进入游戏，也不触碰原游戏存档。 */ }
  try { modelCatalog = await readModelCatalog(); } catch (error) { notify(error.message); }
  goTo(restored?.scene || 'cell', restored);
  let last = performance.now(), lastSave = last, elapsed = 0;
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - last) / 1000, .05); last = now; elapsed += dt;
    const speed = controls.update(dt, world); heroVisual.userData.animate(elapsed, speed / 3.3);
    world.animations.forEach(anchor => anchor.userData.animate(elapsed, 0));
    mixers.forEach(mixer => mixer.update(dt));
    world.portals.forEach(portal => { portal.ring.material.opacity = .7 + Math.sin(elapsed * 2) * .2; });
    if (world.rain) {
      const positions = world.rain.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) { const y = positions.getY(i) - dt * 8; positions.setY(i, y < 0 ? 12 : y); }
      positions.needsUpdate = true;
    }
    updateInteraction(); updateLabels(); renderer.render(scene, camera);
    if (now - lastSave > 5000) { saveLocation(); lastSave = now; }
  });
}

function showError(message) { $('fatal-message').textContent = message; $('fatal').hidden = false; }
start().catch(error => { console.error(error); showError('启动失败：' + error.message); });
