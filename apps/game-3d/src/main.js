import './style.css';
import { SCENES, SCENE_BY_ID } from './scenes.js';
import { createAtlas } from './atlas.js';
import { assetDetails, sceneAssetDetails, environmentDescription } from './asset-catalog.js';
import { readModelCatalog } from './assets.js';
import { WorldView } from './world-view.js';
import { Dialogue } from './dialogue.js';
import { createGame, getTask, getActions, advance, enterScene, travelRule, heroId, visibleInventory, did, officeHiddenProps, oakHiddenProps, beachHiddenProps, medicalHiddenProps } from './story.js';
import { ITEM_NAMES, TASKS } from './story-data.js';
import { loadGame, saveGame, backupGame, loadPreview, savePreview } from './save.js';
import { guidanceFor, sceneNoteFor } from './guidance.js';
import { EarlyPlay } from './early-play.js';
import { SceneLoadGate } from './scene-load-gate.js';
import { prepareTravel } from './scene-transition.js';
import { RainAmbience } from './rain-ambience.js';
import { evidenceReview } from './evidence-review.js';
import { storyInterlude, pendingInterlude } from './story-interludes.js';
import rainUrl from '../../../Beyond the wall/音效/四秒雨声.opus';

const $ = id => document.getElementById(id);
const atlas = $('atlas'), menu = $('menu');
let mode = 'menu', game = null, gameLocation = null, view, catalog = {}, sceneId = 'cell', noticeTimer, atlasView, earlyPlay;
let pendingStory = null, storyOpen = false;
const rainAmbience = new RainAmbience(new Audio(rainUrl));
const sceneLoad = new SceneLoadGate();
const storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };
let storageFailed = false;
function notify(message) {
  $('notice').textContent = message; $('notice').classList.add('visible');
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 4000);
}
function store(callback) {
  try { return callback(); } catch {
    if (!storageFailed) notify('进度暂时无法保存，已有记录不会被删除。'); storageFailed = true; return null;
  }
}
function saveCurrent() {
  if (!view?.world) return;
  if (mode === 'game') {
    gameLocation = view.position(); store(() => saveGame(storage, game, gameLocation, pendingStory));
  } else if (mode === 'explore') store(() => savePreview(storage, sceneId, view.position()));
}
const dialogue = new Dialogue(() => {
  if (storyOpen) { storyOpen = false; pendingStory = null; saveCurrent(); }
  view?.canvas.focus();
});

function showPendingStory() {
  const interlude = pendingInterlude(pendingStory, game);
  if (!interlude) { pendingStory = null; return false; }
  storyOpen = true;
  dialogue.open(interlude.title, interlude.lines, [{ label: pendingStory === 'opening' ? '开始探索' : '继续故事', run: () => {} }]);
  return true;
}

function showEnding() {
  const ending = TASKS.find(task => task.finish === game.finished);
  if (!ending) return;
  dialogue.open('结局 · ' + game.finished, ending.lines, [
    { label: '返回游戏菜单', run: openMenu },
    { label: '查看全部场景', run: openAtlas }
  ]);
}

function renderScene(id, options = {}) {
  const revision = sceneLoad.begin(mode === 'game');
  sceneId = id; const config = SCENE_BY_ID.get(id);
  const ready = view.show(config, { ...options, character: mode === 'game' ? heroId(game) : 'andy', catalog, environmentOnly: mode !== 'game' });
  if (mode === 'game') earlyPlay.attach();
  $('chapter').textContent = config.chapter; $('scene-title').textContent = config.name;
  $('scene-note').textContent = mode === 'game' ? sceneNoteFor(config, game) : environmentDescription(config);
  $('scene-count').textContent = String(SCENES.indexOf(config) + 1).padStart(2, '0') + ' / ' + SCENES.length;
  document.querySelectorAll('[data-scene]').forEach(button => button.classList.toggle('active', button.dataset.scene === id));
  $('fade').classList.toggle('show', !options.seamless);
  if (mode === 'game') {
    let finished = false;
    const finish = (timedOut = false) => { if (!finished) { finished = true; if (sceneLoad.finish(revision)) {
      if (timedOut && view.revealPendingCharacters()) notify('人物模型仍在加载，暂时显示替代人物。');
      if (!options.seamless) view.pause();
      $('fade').classList.remove('show');
    } } };
    const timeout = setTimeout(() => finish(true), 8000);
    // 人物和环境都就绪后再揭开场景，避免建筑模型在玩家眼前突然替换。
    ready.then(() => { clearTimeout(timeout); setTimeout(() => finish(), 180); });
  } else setTimeout(() => { if (sceneLoad.finish(revision)) $('fade').classList.remove('show'); }, 180);
  refresh(); saveCurrent();
}

function perform(action) {
  view.pause();
  if (earlyPlay.perform(action)) return;
  dialogue.task(action.id === 'twoCompare' ? { ...action, lines: evidenceReview(game) } : action, () => completeAction(action));
}

function completeAction(action) {
  try {
    const previousScene = game.scene;
    const result = advance(game, action.id, sceneId);
    game = result.game;
    const interlude = storyInterlude(action.id, game, result.automatic);
    pendingStory = interlude ? action.id : null;
    if (game.scene !== previousScene || view.heroId !== heroId(game)) renderScene(game.scene, previousScene === 'pipeNetwork' && game.scene === 'rain' ? { from: previousScene } : {});
    else { refresh(); saveCurrent(); }
    const message = action.result || result.automatic.findLast(item => item.result)?.result;
    if (interlude) showPendingStory();
    else if (message) notify(message);
    if (game.finished) showEnding();
  } catch (error) { notify(error.message); }
}

function travel(target) {
  if (mode === 'explore') { saveCurrent(); renderScene(target, { from: sceneId }); return; }
  if (earlyPlay.inspectionActive) { notify('检查还没结束，请先站回床边等待。'); return; }
  const from = game.scene;
  try {
    const next = enterScene(game, target);
    prepareTravel({ gate: sceneLoad,
      load: () => view.preloadScene(SCENE_BY_ID.get(target), catalog, heroId(next)),
      canTravel: () => mode === 'game' && game.scene === from && !menu.open && !atlas.open && !dialogue.dialog.open,
      run: () => { game = next; renderScene(game.scene, { from, seamless: true }); } });
  } catch (error) { dialogue.open('这条路暂未开放', [error.message, guidanceFor(game).action]); view.pause(); }
}

function syncRain() {
  rainAmbience.setActive(mode === 'game' && sceneId === 'rain' && !atlas.open && !menu.open && !document.hidden);
}

function refresh() {
  syncRain();
  document.body.dataset.mode = mode;
  $('return-game').hidden = mode !== 'explore' || !game;
  $('open-assets').hidden = mode !== 'explore';
  $('mode-label').textContent = mode === 'game' ? (heroId(game) === 'red' ? '剧情游玩 · 瑞德 · 第三人称' : '剧情游玩 · 安迪 · 第三人称') : '纯环境查看 · 人物独立管理';
  $('build-note').textContent = mode === 'game' ? '剧情贯通版 · 原版小游戏与三维场景' : '环境资产检查 · 不影响游戏进度';
  $('world').setAttribute('aria-label', mode === 'game' ? '第三人称三维游戏，方向键移动，拖动环顾，空格互动' : '三维环境资产查看，拖动旋转，右键拖动平移，滚轮缩放');
  $('quest').hidden = mode !== 'game';
  const interactions = [], rules = {};
  let goal = null, goalLabel = '', hidden = [];
  for (const portal of view.world.portals) {
    rules[portal.id] = mode === 'game' ? (earlyPlay.inspectionActive ? '检查还没结束，请先站回床边等待。' : travelRule(game, sceneId, portal.id)) : null;
    if (rules[portal.id]) interactions.push({ target: 'exit:' + portal.id, label: '查看入口 · ' + portal.name, run: () => travel(portal.id), range: 2.2 });
  }
  if (mode === 'game') {
    const task = getTask(game);
    const guide = earlyPlay.guide(guidanceFor(game));
    $('quest-title').textContent = guide.title;
    $('quest-purpose').textContent = '目的：' + guide.purpose;
    $('quest-place').textContent = guide.place;
    $('quest-action').textContent = guide.action;
    $('inventory').textContent = '随身物品：' + (visibleInventory(game).map(id => ITEM_NAMES[id]).join('、') || '暂无');
    $('evidence-count').textContent = '可选调查（影响结局）：线索 ' + game.evidence.length + '/5 · 旁听 ' + game.observed.length + '/2';
    const grouped = new Map();
    for (const action of getActions(game, sceneId)) {
      if (action.onArrival || action.target.startsWith('exit:')) continue;
      if (!grouped.has(action.target)) grouped.set(action.target, []);
      grouped.get(action.target).push(action);
    }
    for (const [target, actions] of grouped) {
      interactions.unshift({ target, range: sceneId === 'beach' && target === 'boat' ? 4.2 : (sceneId === 'bank' && target === 'clerk') || (sceneId === 'road' && target === 'car') ? 3.4 : undefined, priority: actions.some(action => action.id === task?.id) ? 2 : 1, label: actions.length > 1 ? '交谈与调查' : actions[0].label, run: () => {
        if (actions.length === 1) perform(actions[0]);
        else { view.pause(); dialogue.open('选择交谈内容', ['选择“主线”推进故事。“可选线索”会影响结局，可以自行决定是否调查。'], actions.map(action => ({ label: (action.id === task?.id ? '主线：' : action.evidence || action.observed ? '可选线索：' : '') + action.label, primary: action.id === task?.id, run: () => perform(action) }))); }
      } });
    }
    goal = guide.target; goalLabel = guide.marker;
    if (sceneId === 'office') hidden.push(...officeHiddenProps(game));
    if (sceneId === 'oak') hidden.push(...oakHiddenProps(game));
    if (sceneId === 'beach') hidden.push(...beachHiddenProps(game));
    if (sceneId === 'medicalExterior') hidden.push(...medicalHiddenProps(game));
    if (sceneId === 'cell') {
      if (!game.items.includes('hammer') || game.practice.hide.placed || did(game, 'hideHammer')) hidden.push('hammer');
      if (!game.items.includes('bible')) hidden.push('bible');
      if (!game.items.includes('poster')) hidden.push('poster');
    }
  }
  if (mode === 'game') interactions.unshift(...earlyPlay.interactions());
  view.configure({ interactions, goal, goalLabel, portalRules: rules, hidden });
}

function openAtlas() {
  view.pause(); atlasView.render();
  $('atlas-note').textContent = '环境、道具与人物分开制作。选择场景进入纯环境查看，不显示人物，也不会推进任务或覆盖游戏存档。';
  if (!atlas.open) atlas.showModal();
  syncRain();
}
function explore(id) {
  saveCurrent(); mode = 'explore';
  if (menu.open) menu.close(); if (atlas.open) atlas.close();
  renderScene(id);
}
function openMenu() {
  saveCurrent(); view.pause();
  $('resume-game').disabled = !game;
  mode = 'menu'; refresh(); if (!menu.open) menu.showModal();
}
function resume() {
  if (!game) return;
  mode = 'game'; if (menu.open) menu.close(); if (atlas.open) atlas.close();
  renderScene(game.scene, { location: gameLocation });
  if (!showPendingStory() && game.finished) showEnding();
}
function startNew() {
  store(() => backupGame(storage)); game = createGame(); gameLocation = null; pendingStory = 'opening'; mode = 'game'; menu.close();
  renderScene(game.scene);
  showPendingStory();
}
function buildAtlas() {
  atlasView = createAtlas({ getCatalog: () => catalog, getScene: () => sceneId, onScene: explore,
    onAsset: asset => {
      dialogue.open(asset.name + ' · 制作要求', assetDetails(asset, catalog));
      $('close-detail').textContent = '返回建模档案';
    }
  });
}
async function start() {
  window.addEventListener('pointerdown', () => rainAmbience.retry());
  window.addEventListener('keydown', () => rainAmbience.retry());
  document.addEventListener('visibilitychange', syncRain);
  buildAtlas();
  view = new WorldView({
    canvas: $('world'), labelRoot: $('floating-labels'), interactButton: $('interact'), notify, onAutosave: saveCurrent, onAutoTravel: travel,
    enabled: () => mode !== 'menu' && !sceneLoad.active && !atlas.open && !dialogue.dialog.open && !menu.open && !earlyPlay?.busy
  });
  earlyPlay = new EarlyPlay({ view, getGame: () => game, notify,
    enabled: () => mode === 'game' && !sceneLoad.active && !atlas.open && !dialogue.dialog.open && !menu.open && !earlyPlay.busy,
    setPractice: (practice, redraw, save) => { game = { ...game, practice }; if (redraw) refresh(); if (save) saveCurrent(); },
    complete: id => {
      const action = getActions(game, sceneId).find(item => item.id === id);
      if (action?.id === 'oneBox') {
        dialogue.open('安迪的信', action.lines, [{ label: '收好信，前往海岸', run: () => completeAction(action) }]);
      } else if (action) completeAction(action);
    }
  });
  try { catalog = await readModelCatalog(); } catch (error) { notify(error.message); }
  try { const saved = loadGame(storage); if (saved) { game = saved.game; gameLocation = saved.location; pendingStory = saved.pendingStory || null; } }
  catch { notify('已有游戏记录无法恢复，已保留原文件。可以查看场景或重新开始。'); }
  renderScene('cell');
  $('open-atlas').addEventListener('click', openAtlas);
  $('close-atlas').addEventListener('click', () => { atlas.close(); view.canvas.focus(); });
  atlas.addEventListener('close', syncRain);
  $('camera-reset').addEventListener('click', () => view.resetCamera());
  $('open-menu').addEventListener('click', openMenu);
  $('new-game').addEventListener('click', startNew); $('resume-game').addEventListener('click', resume);
  $('menu-atlas').addEventListener('click', openAtlas); $('return-game').addEventListener('click', resume);
  $('open-assets').addEventListener('click', () => {
    const config = SCENE_BY_ID.get(sceneId);
    dialogue.open(config.name + ' · 环境资产清单', sceneAssetDetails(config, catalog));
    view.pause();
  });
  menu.addEventListener('cancel', event => { event.preventDefault(); if (game) resume(); });
  window.addEventListener('keydown', event => {
    if (event.code === 'Tab' && !atlas.open && !dialogue.dialog.open && !menu.open) { event.preventDefault(); openAtlas(); }
    if (event.code === 'Escape' && !atlas.open && !dialogue.dialog.open && !menu.open) openMenu();
  });
  window.addEventListener('pagehide', saveCurrent);
  $('menu-last-preview').addEventListener('click', () => {
    let saved; try { saved = loadPreview(storage); } catch { /* 预览记录损坏时使用牢房。 */ }
    explore(SCENE_BY_ID.has(saved?.scene) ? saved.scene : 'cell');
  });
  openMenu();
}

start().catch(error => { console.error(error); $('fatal-message').textContent = '启动失败：' + error.message; $('fatal').hidden = false; });
