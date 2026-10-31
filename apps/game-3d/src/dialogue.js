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
    if (action.challenge === 'radio') {
      hint.textContent = '先点击“复位传动齿轮”，再把频率调到73，最后点击“确认调谐”。';
      let repaired = false;
      const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '100'; input.value = '25';
      input.setAttribute('aria-label', '收音机频率'); area.append(input);
      const readout = document.createElement('output'); area.append(readout);
      const update = () => { readout.textContent = '频率 ' + input.value + ' · ' + (Math.abs(Number(input.value) - 73) <= 2 ? '信号稳定' : '有杂音'); };
      input.addEventListener('input', update); update();
      button('检查并复位传动齿轮', event => { repaired = true; event.target.disabled = true; event.target.textContent = '齿轮已复位'; });
      button('确认调谐', () => {
        if (repaired && Math.abs(Number(input.value) - 73) <= 2) finish();
        else hint.textContent = repaired ? '请把频率调到73附近（71至75），再确认调谐。' : '请先点击“检查并复位传动齿轮”。';
      });
    } else if (['books', 'bag', 'map'].includes(action.challenge)) {
      const expected = action.challenge === 'books' ? ['高书', '中书', '矮书'] : action.challenge === 'bag' ? ['面粉', '罐头', '面包', '鸡蛋'] : ['左转', '右转', '右转'];
      const options = action.challenge === 'map' ? ['左转', '右转', '直行'] : [...expected].reverse();
      let sequence = [];
      const update = () => { hint.textContent = '已选择：' + (sequence.join(' → ') || '等待操作'); };
      for (const option of options) button(option, () => {
        sequence.push(option);
        if (sequence.at(-1) !== expected[sequence.length - 1]) { sequence = []; hint.textContent = '顺序不对，已复位。请按提示再试。'; return; }
        if (sequence.length === expected.length) finish(); else update();
      });
      button('重新排列', () => { sequence = []; update(); }); update();
    } else if (action.challenge === 'hide') {
      for (const option of ['桌面上', '圣经的书页凹槽', '枕头旁']) button(option, () => {
        if (option === '圣经的书页凹槽') finish(); else hint.textContent = '这个位置在检查时很容易被发现。';
      });
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
