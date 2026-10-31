// 原版嵌入模式由宿主转发键盘，避免游戏与组件重复移动。
export function bindPipeKeys(target, getApi) {
  const directions = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left',
    KeyW: 'up', KeyD: 'right', KeyS: 'down', KeyA: 'left' };
  const move = event => {
    const direction = directions[event.code];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    getApi()?.move(direction);
  };
  target.addEventListener('keydown', move);
  return () => target.removeEventListener('keydown', move);
}
