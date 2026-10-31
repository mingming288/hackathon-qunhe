import './style.css';
import { SCENES, SCENE_BY_ID, CHAPTERS } from './scenes.js';
import { readModelCatalog } from './assets.js';
import { WorldView } from './world-view.js';
import { Dialogue } from './dialogue.js';
import { createGame, getTask, getActions, advance, enterScene, travelRule, heroId, did } from './story.js';
import { ITEM_NAMES } from './story-data.js';
import { loadGame, saveGame, backupGame, loadPreview, savePreview } from './save.js';
import { guidanceFor } from './guidance.js';

const $ = id => document.getElementById(id);
const atlas = $('atlas'), menu = $('menu');
let mode = 'menu', game = null, gameLocation = null, view, catalog = {}, sceneId = 'cell', noticeTimer;
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
    gameLocation = view.position(); store(() => saveGame(storage, game, gameLocation));
  } else if (mode === 'explore') store(() => savePreview(storage, sceneId, view.position()));
}
const dialogue = new Dialogue(() => view?.canvas.focus());

function renderScene(id, options = {}) {
  sceneId = id; const config = SCENE_BY_ID.get(id);
  view.show(config, { ...options, character: mode === 'game' ? heroId(game) : 'andy', catalog });
  $('chapter').textContent = config.chapter; $('scene-title').textContent = config.name; $('scene-note').textContent = config.note;
  $('scene-count').textContent = String(SCENES.indexOf(config) + 1).padStart(2, '0') + ' / ' + SCENES.length;
  document.querySelectorAll('[data-scene]').forEach(button => button.classList.toggle('active', button.dataset.scene === id));
  $('fade').classList.add('show'); setTimeout(() => $('fade').classList.remove('show'), 180);
  refresh(); saveCurrent();
}

function perform(action) {
  view.pause();
  dialogue.task(action, () => {
    try {
      const previousScene = game.scene;
      const result = advance(game, action.id, sceneId);
      game = result.game;
      if (game.scene !== previousScene || view.heroId !== heroId(game)) renderScene(game.scene);
      else { refresh(); saveCurrent(); }
      const message = result.automatic.findLast(item => item.result)?.result || action.result;
      if (message) notify(message);
      if (game.finished) {
        dialogue.open('结局 · ' + game.finished, action.lines, [
          { label: '返回游戏菜单', run: openMenu },
          { label: '查看全部场景', run: openAtlas }
        ]);
      }
    } catch (error) { notify(error.message); }
  });
}

function travel(target) {
  if (mode === 'explore') { saveCurrent(); renderScene(target, { from: sceneId }); return; }
  const from = game.scene;
  try {
    game = enterScene(game, target);
    renderScene(game.scene, { from });
  } catch (error) { dialogue.open('这条路暂未开放', [error.message, guidanceFor(game).action]); view.pause(); }
}

function refresh() {
  document.body.dataset.mode = mode;
  $('return-game').hidden = mode !== 'explore' || !game;
  $('open-assets').hidden = mode !== 'explore';
  $('mode-label').textContent = mode === 'game' ? (heroId(game) === 'red' ? '剧情游玩 · 瑞德 · 第三人称' : '剧情游玩 · 安迪 · 第三人称') : '场景查看 · 不影响游戏进度';
  $('build-note').textContent = mode === 'game' ? '剧情贯通版 · 简化交互与基础模型' : '自由查看十九处空间与待替换资产';
  $('quest').hidden = mode !== 'game';
  const interactions = [], rules = {};
  let goal = null, goalLabel = '', hidden = [];
  for (const portal of view.world.portals) {
    rules[portal.id] = mode === 'game' ? travelRule(game, sceneId, portal.id) : null;
    interactions.push({ target: 'exit:' + portal.id, label: (rules[portal.id] ? '查看入口 · ' : '前往 ') + portal.name, run: () => travel(portal.id), range: 2.2 });
  }
  if (mode === 'game') {
    const task = getTask(game);
    const guide = guidanceFor(game);
    $('quest-title').textContent = guide.title;
    $('quest-purpose').textContent = '目的：' + guide.purpose;
    $('quest-place').textContent = guide.place;
    $('quest-action').textContent = guide.action;
    $('inventory').textContent = '随身物品：' + (game.items.map(id => ITEM_NAMES[id]).join('、') || '暂无');
    $('evidence-count').textContent = '可选调查（影响结局）：线索 ' + game.evidence.length + '/5 · 旁听 ' + game.observed.length + '/2';
    const grouped = new Map();
    for (const action of getActions(game, sceneId)) {
      if (!grouped.has(action.target)) grouped.set(action.target, []);
      grouped.get(action.target).push(action);
    }
    for (const [target, actions] of grouped) {
      interactions.unshift({ target, priority: actions.some(action => action.id === task?.id) ? 2 : 1, label: actions.length > 1 ? '交谈与调查' : actions[0].label, run: () => {
        if (actions.length === 1) perform(actions[0]);
        else { view.pause(); dialogue.open('选择交谈内容', ['选择“主线”推进故事。“可选线索”会影响结局，可以自行决定是否调查。'], actions.map(action => ({ label: (action.id === task?.id ? '主线：' : action.evidence || action.observed ? '可选线索：' : '') + action.label, primary: action.id === task?.id, run: () => perform(action) }))); }
      } });
    }
    goal = guide.target; goalLabel = guide.marker;
    if (sceneId === 'cell') {
      if (!game.items.includes('hammer') || did(game, 'hideHammer')) hidden.push('hammer');
      if (!game.items.includes('bible')) hidden.push('bible');
      if (!game.items.includes('poster')) hidden.push('poster');
    }
  } else {
    for (const anchor of view.world.anchors.filter(item => item.userData.label)) interactions.unshift({
      target: anchor.userData.assetKey, label: '查看 ' + anchor.userData.label,
      run: () => dialogue.open(anchor.userData.label, ['此处为独立的场景查看。人物和道具可逐件替换为正式模型，正式游戏进度保持不变。'])
    });
  }
  view.configure({ interactions, goal, goalLabel, portalRules: rules, hidden });
}

function openAtlas() {
  view.pause(); $('atlas-note').textContent = '十九组场景全部开放。选择地点后进入独立查看模式；不会推进任务或覆盖游戏存档。';
  if (!atlas.open) atlas.showModal();
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
}
function startNew() {
  store(() => backupGame(storage)); game = createGame(); gameLocation = null; mode = 'game'; menu.close();
  renderScene(game.scene); notify('入狱的第一天：先出牢房，穿过监区走廊，到院子找瑞德。');
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
      button.append(number, name, note); button.addEventListener('click', () => explore(config.id)); grid.append(button);
    }
    $('scene-list').append(section);
  }
}
async function start() {
  buildAtlas();
  view = new WorldView({
    canvas: $('world'), labelRoot: $('floating-labels'), interactButton: $('interact'), notify, onAutosave: saveCurrent,
    enabled: () => mode !== 'menu' && !atlas.open && !dialogue.dialog.open && !menu.open
  });
  try { catalog = await readModelCatalog(); } catch (error) { notify(error.message); }
  try { const saved = loadGame(storage); if (saved) { game = saved.game; gameLocation = saved.location; } }
  catch { notify('已有游戏记录无法恢复，已保留原文件。可以查看场景或重新开始。'); }
  renderScene('cell');
  $('open-atlas').addEventListener('click', openAtlas);
  $('close-atlas').addEventListener('click', () => { atlas.close(); view.canvas.focus(); });
  $('camera-reset').addEventListener('click', () => view.resetCamera());
  $('open-menu').addEventListener('click', openMenu);
  $('new-game').addEventListener('click', startNew); $('resume-game').addEventListener('click', resume);
  $('menu-atlas').addEventListener('click', openAtlas); $('return-game').addEventListener('click', resume);
  $('open-assets').addEventListener('click', () => {
    const keys = [...new Set(view.world.anchors.map(anchor => anchor.userData.assetKey))];
    dialogue.open(SCENE_BY_ID.get(sceneId).name + ' · 资产清单', keys.map(key => key + '：' + (catalog[key] ? '已配置正式模型' : '基础模型，待替换')));
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
