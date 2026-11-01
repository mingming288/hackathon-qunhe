// 使用当前场景的真实边界和碰撞位置绘制俯视导航图，不代表跨场景的实际地理比例。
export function mapPoint(position, size) {
  return { x: 200 + position.x / size[0] * 360, y: 200 + position.z / size[1] * 360 };
}

export function createMinimap(root) {
  const svg = root.querySelector('svg'), current = root.querySelector('[data-map-current]');
  const namespace = 'http://www.w3.org/2000/svg';
  const element = (tag, attributes) => {
    const node = document.createElementNS(namespace, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  let player, target, world;
  function setWorld(next) {
    world = next; svg.replaceChildren(); current.textContent = world.config.name;
    svg.append(element('rect', { x: 20, y: 20, width: 360, height: 360, rx: 5, class: 'map-floor' }));
    for (const collider of world.colliders) {
      if (collider.w > world.config.size[0] * 1.1 || collider.d > world.config.size[1] * 1.1) continue;
      const point = mapPoint(collider, world.config.size);
      const width = collider.w / world.config.size[0] * 360, height = collider.d / world.config.size[1] * 360;
      svg.append(element('rect', { x: point.x - width / 2, y: point.y - height / 2, width, height, class: 'map-obstacle' }));
    }
    for (const portal of world.portals) {
      const point = mapPoint(portal.object.position, world.config.size);
      svg.append(element('circle', { cx: point.x, cy: point.y, r: 4, class: 'map-door' }));
      const label = element('text', { x: point.x, y: point.y - 8, 'text-anchor': 'middle', class: 'map-label' });
      label.textContent = portal.name; svg.append(label);
    }
    target = element('circle', { r: 7, class: 'map-target', visibility: 'hidden' }); svg.append(target);
    player = element('path', { d: 'M 0 -8 L 6 7 L 0 4 L -6 7 Z', class: 'map-player' }); svg.append(player);
    root.querySelector('[data-map-accessible]').textContent = '蓝色箭头是人物，金色圆圈是当前目标。地图为当前场景俯视图。';
  }
  function update(hero, goal) {
    if (!world || !hero) return;
    player.setAttribute('visibility', hero.visible ? 'visible' : 'hidden');
    const point = mapPoint(hero.position, world.config.size);
    player.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${-hero.rotation.y * 180 / Math.PI + 180})`);
    if (!goal || !goal.visible) { target.setAttribute('visibility', 'hidden'); return; }
    const location = goal.getWorldPosition(hero.position.clone());
    const destination = mapPoint(location, world.config.size);
    target.setAttribute('cx', destination.x); target.setAttribute('cy', destination.y); target.setAttribute('visibility', 'visible');
  }
  return { setWorld, update };
}
