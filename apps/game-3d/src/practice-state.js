// 交互规则与画面分离；位置使用近景的局部坐标，可由正式模型沿用。
export const GEAR_SOCKET = { x: .1, y: .35 };
export const HAMMER_SLOT = { x: -.75, y: 0 };
export const LIBRARY_BOOKS = [
  { id: 'science', title: '石头与矿物', code: 'B·12', shelf: 1, color: '#718f97' },
  { id: 'history', title: '州立年鉴', code: 'A·07', shelf: 0, color: '#b68d63' },
  { id: 'literature', title: '远方的故事', code: 'C·03', shelf: 2, color: '#889974' }
];
export const SHELF_LABELS = ['A · 历史', 'B · 科学', 'C · 文学'];
const clamp = (value, min, max) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
const position = (value, fallback) => ({ x: clamp(value?.x ?? fallback.x, -3, 3), y: clamp(value?.y ?? fallback.y, -2, 2), angle: clamp(value?.angle ?? fallback.angle ?? 0, -20, 20) });

export function createPractice() {
  return {
    wall: { rubbed: 0, tried: 0 },
    radio: { open: false, seated: false, gear: { x: -1.7, y: .35, angle: 0 }, frequency: 25, stable: 0 },
    hammer: { x: 0, y: .25, angle: 0, viewed: false, received: false },
    bible: { x: 0, y: .25, angle: 0, viewed: false, received: false },
    books: { placed: [], carrying: null },
    hide: { open: false, placed: false, closed: false, hammer: { x: 1.8, y: 0, angle: Math.PI / 2 } },
    inspection: { phase: 'idle', unsafe: false, elapsed: 0 }
  };
}

export function signalStrength(radio) {
  return radio.seated ? Math.max(0, 1 - Math.abs(radio.frequency - 73) / 22) : 0;
}

export function practiceComplete(practice, kind) {
  const state = practice[kind];
  if (kind === 'wall') return state.rubbed >= 1 && state.tried >= 1;
  if (kind === 'radio') return state.seated && state.stable >= 2;
  if (kind === 'hammer' || kind === 'bible') return state.received;
  if (kind === 'hide') return state.placed && state.closed && !state.open;
  if (kind === 'books') return state.placed.length === LIBRARY_BOOKS.length;
  return false;
}

export function changePractice(practice, kind, event) {
  const next = structuredClone(practice), state = next[kind];
  let message = '';
  const dt = clamp(event.dt, 0, .1);
  if (kind === 'wall') {
    if (event.type === 'rub') state.rubbed = Math.min(1, state.rubbed + clamp(event.amount, 0, .15));
    if (event.type === 'try' && state.rubbed >= 1) state.tried = Math.min(1, state.tried + dt / 1.2);
  } else if (kind === 'radio') {
    if (event.type === 'open') state.open = !state.open;
    if (event.type === 'move' && state.open && !state.seated) state.gear = position(event, state.gear);
    if (event.type === 'release' && state.open && !state.seated) {
      if (Math.hypot(state.gear.x - GEAR_SOCKET.x, state.gear.y - GEAR_SOCKET.y) < .28) {
        state.gear = { ...GEAR_SOCKET, angle: 0 }; state.seated = true; message = '传动接上了。试着转动旋钮，听听信号。';
      } else message = '齿轮还没对准空轴，松手的位置可以再靠近一点。';
    }
    if (event.type === 'tune') { state.frequency = clamp(event.value, 0, 100); state.stable = 0; }
    if (event.type === 'tick') state.stable = state.seated && Math.abs(state.frequency - 73) <= 2 ? Math.min(2, state.stable + dt) : 0;
  } else if (kind === 'hammer' || kind === 'bible') {
    if (event.type === 'rotate') { state.angle += event.amount; state.viewed = true; }
    if (event.type === 'move') {
      Object.assign(state, position(event, state));
      if (Math.abs(state.angle) >= .3) state.viewed = true;
    }
    if (event.type === 'release') {
      if (state.viewed && state.y < -1.15 && Math.abs(state.x) < 1.25) state.received = true;
      else message = state.viewed ? '把物品移到下方的收取区域，再松手。' : '先旋转看看这件物品，再接过来。';
    }
  } else if (kind === 'hide') {
    if (event.type === 'open') { state.open = true; state.closed = false; }
    if (event.type === 'move' && state.open && !state.placed) state.hammer = position(event, state.hammer);
    if (event.type === 'rotate' && state.open && !state.placed) state.hammer.angle += event.amount;
    if (event.type === 'release' && state.open && !state.placed) {
      const aligned = Math.abs(Math.sin(state.hammer.angle)) < .2;
      if (aligned && Math.hypot(state.hammer.x - HAMMER_SLOT.x, state.hammer.y - HAMMER_SLOT.y) < .28) {
        state.hammer = { ...HAMMER_SLOT, angle: 0 }; state.placed = true; message = '锤子已经放进凹槽。合上圣经，放回桌上。';
      } else message = aligned ? '位置还没对准书页中的凹槽。' : '锤柄横着放不进去，先旋转方向。';
    }
    if (event.type === 'close') {
      if (state.placed) { state.open = false; state.closed = true; }
      else message = '石锤还在外面，现在合书藏不住它。';
    }
  } else if (kind === 'books') {
    if (event.type === 'pickup' && !state.carrying) state.carrying = LIBRARY_BOOKS.find(book => !state.placed.includes(book.id))?.id || null;
    if (event.type === 'place' && state.carrying) {
      const book = LIBRARY_BOOKS.find(item => item.id === state.carrying);
      if (event.shelf === book.shelf) { state.placed.push(book.id); state.carrying = null; message = '这本放对了。'; }
      else message = '书脊是 ' + book.code + '，请找相同字母的分类书架，已经归位的书会保留。';
    }
  }
  return { practice: next, message, complete: practiceComplete(next, kind) };
}

export function completePractice(practice, id) {
  const next = structuredClone(practice);
  if (id === 'inspectWall') next.wall = { rubbed: 1, tried: 1 };
  if (id === 'repairRadio') next.radio = { ...next.radio, seated: true, gear: { ...GEAR_SOCKET, angle: 0 }, frequency: 73, stable: 2 };
  if (id === 'takeHammer') next.hammer.received = next.hammer.viewed = true;
  if (id === 'sortBooks') next.books = { placed: LIBRARY_BOOKS.map(book => book.id), carrying: null };
  if (id === 'getBible') next.bible.received = next.bible.viewed = true;
  if (id === 'hideHammer') next.hide = { open: false, placed: true, closed: true, hammer: { ...HAMMER_SLOT, angle: 0 } };
  if (id === 'inspection') next.inspection = { phase: 'passed', unsafe: false, elapsed: 0 };
  return next;
}

export function restorePractice(record, events) {
  let result = createPractice();
  if (record && typeof record === 'object') {
    for (const kind of ['wall', 'radio', 'hammer', 'bible', 'hide']) {
      const source = record[kind]; if (!source || typeof source !== 'object') continue;
      for (const key of Object.keys(result[kind])) {
        const fallback = result[kind][key], value = source[key];
        if (typeof fallback === 'boolean') result[kind][key] = value === true;
        else if (typeof fallback === 'number') result[kind][key] = clamp(value ?? fallback, ['x', 'y', 'angle'].includes(key) ? -20 : 0,
          key === 'frequency' ? 100 : ['x', 'y', 'angle'].includes(key) ? 20 : key === 'stable' ? 2 : 1);
        else result[kind][key] = position(value, fallback);
      }
    }
    const placed = record.books?.placed;
    result.books.placed = LIBRARY_BOOKS.filter(book => Array.isArray(placed) && placed.includes(book.id)).map(book => book.id);
    result.books.carrying = LIBRARY_BOOKS.some(book => book.id === record.books?.carrying && !result.books.placed.includes(book.id)) ? record.books.carrying : null;
    const check = record.inspection;
    if (check && ['idle', 'enter', 'search', 'leave', 'passed'].includes(check.phase)) {
      result.inspection = { phase: check.phase, unsafe: check.unsafe === true, elapsed: clamp(check.elapsed, 0, 3) };
    }
  }
  if (!result.radio.seated) result.radio.stable = 0;
  if (!result.hide.placed) result.hide.closed = false;
  if (result.hide.closed) result.hide.open = false;
  for (const event of events) result = completePractice(result, event);
  return result;
}
