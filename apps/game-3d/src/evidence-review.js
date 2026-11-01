import { EVIDENCE, OBSERVATIONS } from './story-data.js';

// 只展示本次存档中已收集的材料，避免给玩家凭空补齐证据。
function collectedLines(game) {
  const lines = game.evidence.map(id => EVIDENCE[id]).filter(Boolean)
    .map(([, name, label, details]) => name + '的记录：' + label + '。' + details.join(' '));
  for (const id of game.observed) if (OBSERVATIONS[id]) lines.push('旁听记录：' + OBSERVATIONS[id].journal);
  return lines;
}

export function evidenceReview(game) {
  const lines = collectedLines(game);
  lines.push('这些材料指向异常转运。将记录寄出后，还需要核实车辆的去向。');
  return lines;
}

export function investigationJournal(game) {
  const lines = ['已记录：线索 ' + game.evidence.length + '/5，旁听 ' + game.observed.length + '/2。'];
  const collected = collectedLines(game);
  if (collected.length) lines.push(...collected);
  else lines.push('暂时还没有调查记录。留意人物的谈话和院子里的动静。');
  if (game.evidence.includes('red')) lines.push('与瑞德的约定：如果他有一天走出高墙，去石墙尽头的橡树寻找安迪留下的消息。');
  lines.push('可选调查和剧情中的选择会影响后续故事。');
  return lines;
}
