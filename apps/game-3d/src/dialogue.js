const $ = id => document.getElementById(id);

export class Dialogue {
  constructor(onClose) {
    this.dialog = $('detail'); this.onClose = onClose; this.cleanup = null;
    this.dialog.addEventListener('close', () => {
      // 选择内容后可能立即打开新对话，旧的关闭事件不能清掉新交互的计时器。
      if (!this.dialog.open) { this.cleanup?.(); this.cleanup = null; onClose(); }
    });
    $('close-detail').addEventListener('click', () => this.dialog.close());
  }

  open(title, lines, choices = []) {
    this.cleanup?.(); this.cleanup = null;
    $('detail-title').textContent = title; $('detail-copy').replaceChildren();
    for (const line of lines) { const paragraph = document.createElement('p'); paragraph.textContent = line; $('detail-copy').append(paragraph); }
    $('challenge').replaceChildren(); $('detail-actions').replaceChildren();
    $('close-detail').textContent = '返回探索';
    for (const choice of choices) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = choice.label; button.className = choice.primary === false ? '' : 'primary';
      button.addEventListener('click', () => { this.dialog.close(); choice.run(); }); $('detail-actions').append(button);
    }
    if (!this.dialog.open) this.dialog.showModal();
  }

  task(action, done) {
    this.open(action.label, action.lines, action.challenge ? [] : [{ label: action.confirmLabel || (action.evidence ? '记录这条线索' : action.observed ? '记下这条记录' : '完成交谈'), run: done }]);
    if (!action.challenge) return;
    const area = $('challenge');
    const hint = document.createElement('p'); hint.className = 'challenge-hint'; area.append(hint);
    const finish = () => { this.dialog.close(); done(); };
    const button = (text, callback) => {
      const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
      element.addEventListener('click', callback); area.append(element); return element;
    };
    if (['bag', 'map'].includes(action.challenge)) {
      const expected = action.challenge === 'bag' ? ['面粉', '罐头', '面包', '鸡蛋'] : ['左转', '右转', '右转'];
      const options = action.challenge === 'map' ? ['左转', '右转', '直行'] : [...expected].reverse();
      let sequence = [];
      const update = () => { hint.textContent = '已选择：' + (sequence.join(' → ') || '等待操作'); };
      for (const option of options) button(option, () => {
        sequence.push(option);
        if (sequence.at(-1) !== expected[sequence.length - 1]) { sequence = []; hint.textContent = '顺序不对，已复位。请按提示再试。'; return; }
        if (sequence.length === expected.length) finish(); else update();
      });
      button('重新排列', () => { sequence = []; update(); }); update();
    } else if (action.challenge === 'thunder') {
      const started = performance.now(); let hits = 0, lastCycle = -1;
      const strike = button('挥动石锤', () => {
        const time = performance.now() - started, cycle = Math.floor(time / 2600);
        if (time % 2600 < 1100 && cycle !== lastCycle) {
          hits++; lastCycle = cycle; if (hits === 3) finish();
        }
      });
      const update = () => {
        const thunder = (performance.now() - started) % 2600 < 1100;
        hint.textContent = (thunder ? '雷声响起——现在挥锤' : '雨声中等待下一次雷声') + ' · ' + hits + ' / 3';
        strike.classList.toggle('primary', thunder);
      };
      const timer = setInterval(update, 100); this.cleanup = () => clearInterval(timer); update();
    }
  }
}
