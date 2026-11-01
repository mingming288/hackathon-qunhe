// 自动剧情仍记录在原有事件中；这些文字只补足玩家看到的时间与人物衔接。
export const OPENING = {
  title: '高墙之内',
  lines: [
    '安迪被送进监狱。铁门关上后，牢房里只剩一张床、一张书桌和漫长的日子。',
    '他没有放弃寻找出路。先观察身边的东西，再去认识那些也生活在高墙里的人。',
    '你的选择和调查会影响后来发生的事。',
  ],
};

export function storyInterlude(actionId, game, automatic) {
  const events = new Set(automatic.map(item => item.id));
  if (events.has('restYears') || events.has('sideYears')) {
    const first = events.has('sideYears')
      ? '找回石锤后，安迪把转运记录藏好，重新开始准备。'
      : '碎土一点点混进院子的地面，墙后的通道也在每个夜晚悄悄延伸。';
    return { title: '二十年后 · 最后一夜', lines: [
      first,
      '漫长的岁月过去，瑞德送来了维修记录。安迪回到牢房，要把最后的路线记清楚。',
    ] };
  }
  if (actionId === 'breathe') {
    if (game.ending === 'one') return { title: '离开高墙之后', lines: [
      '安迪走出了排水口，奔向雨夜。留在高墙里的瑞德，仍记得他们关于石墙和橡树的约定。',
      '多年后，瑞德也获得自由。他沿着约定的方向，去寻找安迪留下的消息。',
    ] };
    if (game.ending === 'two') return { title: '被留下的名字', lines: [
      '安迪带出了账本和收集到的线索。那些被转送、被抹去名字的人，仍在等待真相。',
      '他决定先把证言和记录拼在一起，再将证据交到高墙之外。',
    ] };
    if (game.ending === 'three') return { title: '高墙之外', lines: [
      '安迪走出了雨夜，带着新的身份和足够重新开始的资金。',
      '他先去银行完成手续，随后驶向海边。另一边，瑞德也将面对高墙之外的生活。',
    ] };
  }
  return null;
}
