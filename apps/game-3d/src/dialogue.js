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
  }
}
