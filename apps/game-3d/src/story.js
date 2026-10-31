import { TASK_BY_ID, EVIDENCE } from './story-data.js';
import { SCENE_BY_ID } from './scenes.js';
import { createPractice, completePractice, restorePractice } from './practice-state.js';

export const did = (game, action) => game.events.includes(action);

// 刺绣移开后才展示保险柜；典狱长离开后不再出现在办公室。
export function officeHiddenProps(game) {
  const hidden = [did(game, 'openSafe') ? 'embroidery' : 'safe'];
  if (did(game, 'meetWarden') || did(game, 'sideHide')) hidden.push('warden');
  return hidden;
}
export const oakHiddenProps = game => !did(game, 'oneOak') || did(game, 'oneBox') ? ['box'] : [];
// 重逢路线由瑞德操控，安迪在海边等待；独自修船路线由安迪操控。
export const beachHiddenProps = game => game.ending === 'one' ? [] : ['andy'];
// 抓捕完成后人物及其碰撞都应离开调查现场。
export const medicalHiddenProps = game => did(game, 'twoArrest') ? ['warden'] : [];
export const getTask = game => TASK_BY_ID.get(game.step);
export const isAlternate = game => did(game, 'riskInspection');
export const isLate = game => did(game, 'restYears') || did(game, 'sideYears');
export const heroId = game => game.ending === 'one' || (game.ending === 'three' && did(game, 'threeBoat')) ? 'red' : 'andy';
// 故事记录保留全部道具，随身栏只展示当前人物持有的物品。
export const visibleInventory = game => heroId(game) === 'red'
  ? game.items.filter(item => ['letter', 'groceries'].includes(item))
  : game.items.filter(item => item !== 'groceries');

function initialState() {
  return { step: 'watchTv', events: [], items: [], evidence: [], observed: [], ending: null, finished: null, scene: 'livingRoom', practice: createPractice() };
}

export function createGame() { return settle(initialState()).game; }

export function resolveEnding(game) {
  if (game.evidence.length === 5 || (game.evidence.length >= 4 && game.observed.length >= 2)) return 'two';
  return game.evidence.includes('red') ? 'one' : 'three';
}

export function getActions(game, scene) {
  if (game.finished) return [];
  const result = [];
  const primary = getTask(game);
  if (primary?.scene === scene) result.push(primary);
  if (game.items.includes('hammer') && !did(game, 'hideHammer') && !isAlternate(game) && ['cell', 'yard'].includes(scene)) {
    result.push({ id: 'riskInspection', scene, target: scene === 'cell' ? 'bed' : 'guard', label: '风险选择：不藏石锤，接受检查', confirmLabel: '确认接受检查，石锤将被没收', lines: ['石锤还没藏好。现在接受检查，石锤会被没收，安迪会被送进禁闭室。', '可以返回，先完成藏锤任务；也可以选择这条备用路线。'], next: 'sideReprimand', autoScene: 'yard', consume: ['hammer'] });
  }
  if (did(game, 'repairRadio') || did(game, 'sideBrooks')) {
    for (const [id, [place, name, label, lines]] of Object.entries(EVIDENCE)) {
      if (place === scene && !game.evidence.includes(id)) result.push({ id: 'evidence:' + id, scene, target: id, label: '向' + name + '追问线索', lines, evidence: id, result: '已记录：' + label });
    }
    if (scene === 'yard') {
      for (const [id, target, label] of [['nightTruck', 'guard', '旁听夜车与点名的消息'], ['dates', 'gate', '核对门口的车辆日期']]) {
        if (!game.observed.includes(id)) result.push({ id: 'observe:' + id, scene, target, label, lines: ['夜车的日期、转送的编号与减少的点名人数，留下了可以交叉核对的记录。'], observed: id });
      }
    }
  }
  return result;
}

function applyAction(game, id, scene) {
  const action = getActions(game, scene).find(item => item.id === id);
  if (!action || did(game, id)) throw new Error('当前任务尚不允许这个操作。');
  const next = structuredClone(game); next.events.push(id); next.scene = scene;
  next.practice = completePractice(next.practice, id);
  next.items = next.items.filter(item => !action.consume?.includes(item));
  for (const item of action.grant || []) if (!next.items.includes(item)) next.items.push(item);
  if (action.evidence) next.evidence.push(action.evidence);
  else if (action.observed) next.observed.push(action.observed);
  else if (action.resolveEnding) {
    next.ending = resolveEnding(next);
    next.step = { one: 'oneOak', two: 'twoCompare', three: 'threeBank' }[next.ending];
    next.scene = getTask(next).scene;
  } else {
    next.step = action.next;
    if (id === 'drawMap' && isAlternate(next)) next.step = 'finalDig';
    if (action.finish) next.finished = action.finish;
    if (action.autoScene) next.scene = action.autoScene;
  }
  return { game: next, action };
}

// 自动事件仍逐项记入存档，但只展示合并后的场景和下一项有意义的操作。
function settle(game) {
  const automatic = [];
  while (getTask(game)?.automatic) {
    const action = getTask(game);
    if (automatic.length >= TASK_BY_ID.size) throw new Error('自动剧情发生循环。');
    game = applyAction(game, action.id, action.scene).game;
    automatic.push(action);
  }
  return { game, automatic };
}

export function advance(game, id, scene) {
  const result = applyAction(game, id, scene);
  return { ...result, ...settle(result.game) };
}

export function travelRule(game, from, to) {
  if (game.finished) return '这段旅程已经结束，可在菜单重新开始或查看场景。';
  if (!SCENE_BY_ID.get(from)?.links.includes(to)) return '这两个地点没有直接通路。';
  const step = game.step, alternate = isAlternate(game);
  if (from === 'livingRoom') return '先到电视前，开始这段故事。';
  if (['watchTv', 'arrival', 'wakeMedical'].includes(step)) return '先完成眼前的剧情。';
  if (to === 'dig') {
    if (!did(game, 'hangPoster') && !alternate) return '还没有准备好海报后的入口。';
    if (!['firstDig', 'finalDig', 'smashPipe'].includes(step)) return '先完成当前的准备，再进入通道。';
  }
  if (from === 'dig' && to === 'pipe' && !did(game, 'finalDig')) return '通道还没有贯通。';
  if (from === 'pipe' && to === 'pipeNetwork' && !did(game, 'smashPipe')) return '先借雷声敲开管道。';
  if (from === 'pipeNetwork' && to === 'rain' && step !== 'pipeExit') return '还没到离开管网的时候。';
  if (to === 'library' && !did(game, 'meetBrooks') && !alternate) return '先帮院子里的瑞德修好收音机，图书馆入口就会开放。';
  if (to === 'office' && !did(game, 'drawMap') && !['sideSearch', 'sideHide', 'sideRecover'].includes(step)) return '现在还没有进入办公室的机会。';
  if (to === 'solitary' && !['sideStone', 'sideWait'].includes(step)) return '禁闭室的铁门从外面锁着。';
  if (from === 'solitary' && !did(game, 'sideWait')) return '铁门还没有打开。';
  if (to === 'operatingRoom' && step !== 'twoMedical') return '这里不是一条能随意进出的道路。';
  if (from === 'rain') return '先在雨中停下，再决定接下来的路。';
  if (game.ending) {
    const allowed = { one: ['oak', 'road', 'beach'], two: ['evidence', 'medicalExterior', 'operatingRoom'], three: ['bank', 'road', 'beach', 'supermarket'] }[game.ending];
    if (!allowed.includes(to)) return '这条路不属于当前的故事。';
    if (from === 'oak' && to === 'road' && !did(game, 'oneBox')) return '先找到铁盒里的信。';
    if (from === 'road' && to === 'beach' && !did(game, game.ending === 'one' ? 'oneBus' : 'threeDrive')) return '先走到车旁，开始这段旅程。';
    if (from === 'beach' && to === 'supermarket' && !did(game, 'threeBoat')) return '先完成海边的这一幕。';
    if (from === 'bank' && !did(game, 'threeBank')) return '先完成银行的手续。';
    if (from === 'evidence' && to === 'medicalExterior' && !did(game, 'twoMail')) return '先核对并寄出证据。';
    if (from === 'medicalExterior' && to === 'evidence' && !did(game, 'twoArrest')) return '调查还没有结束。';
    if (from === 'operatingRoom' && !did(game, 'twoMedical')) return '先核对房间里的记录。';
    return null;
  }
  const core = ['cell', 'cellCorridor', 'yard', 'library', 'office', 'solitary', 'dig', 'pipe', 'pipeNetwork', 'rain'];
  if (!core.includes(to)) return '先完成高墙内的故事。';
  return null;
}

export function enterScene(game, to) {
  const reason = travelRule(game, game.scene, to);
  if (reason) throw new Error(reason);
  if (game.scene === 'pipeNetwork' && to === 'rain') return advance(game, 'pipeExit', game.scene).game;
  return { ...game, scene: to };
}

// 只持久化合法事件序列，恢复时重新推导道具、分支与任务，避免半更新存档造成软锁。
export function restoreGame(record) {
  if (!record || ![1, 2].includes(record.version) || !Array.isArray(record.events) || record.events.length > 100) throw new Error('游戏记录格式不正确。');
  // 先按旧顺序逐项重放，再合并当前的自动剧情，兼容优化前停在中间步骤的记录。
  let game = initialState();
  for (const id of record.events) {
    if (typeof id !== 'string') throw new Error('任务事件格式不正确。');
    // 旧版已借到锤子或离开牢房时，不强制重做新增的观察与交付。
    if (record.version === 1 && ['inspectWall', 'takeHammer'].includes(game.step) && id !== game.step) {
      const bridge = getTask(game); game = applyAction(game, bridge.id, bridge.scene).game;
    }
    const source = TASK_BY_ID.get(id)?.scene || (id === 'riskInspection' ? 'cell' : id.startsWith('evidence:') ? EVIDENCE[id.slice(9)]?.[0] : id.startsWith('observe:') ? 'yard' : null);
    if (!source) throw new Error('记录含未知任务。');
    game = applyAction(game, id, source).game;
  }
  if (!SCENE_BY_ID.has(record.scene)) throw new Error('记录含未知场景。');
  // 允许保存于已到达的正常区域；任务中的自动转场仍由已重放的事件决定。
  if (!sceneAccessible(game, record.scene)) throw new Error('记录中的场景尚未解锁。');
  game.scene = record.scene;
  game = settle(game).game;
  if (record.version === 1) {
    while (['inspectWall', 'takeHammer', 'getBible', 'inspection'].includes(game.step)) {
      const bridge = getTask(game); game = settle(applyAction(game, bridge.id, bridge.scene).game).game;
    }
  }
  game.practice = restorePractice(record.practice, game.events);
  return game;
}

export function sceneAccessible(game, target) {
  const visited = new Set(), queue = [game.scene];
  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    for (const id of SCENE_BY_ID.get(current)?.links || []) if (!travelRule(game, current, id)) queue.push(id);
  }
  return visited.has(target);
}
