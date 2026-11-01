import { EVIDENCE } from './story-data.js';

// 只展示本次存档中已收集的材料，避免给玩家凭空补齐证据。
export function evidenceReview(game) {
  const lines = game.evidence.map(id => EVIDENCE[id]).filter(Boolean)
    .map(([, name, label, details]) => name + '的记录：' + label + '。' + details.join(' '));
  if (game.observed.includes('nightTruck')) lines.push('旁听记录：夜车与点名人数的变化。');
  if (game.observed.includes('dates')) lines.push('旁听记录：门口车辆的出入日期。');
  lines.push('这些材料指向异常转运。将记录寄出后，还需要核实车辆的去向。');
  return lines;
}
