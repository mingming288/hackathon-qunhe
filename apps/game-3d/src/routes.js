import { SCENE_BY_ID } from './scenes.js';
import { travelRule } from './story.js';

export function routeTo(game, destination) {
  const visited = new Set(), queue = [[game.scene, [game.scene]]];
  while (queue.length) {
    const [scene, path] = queue.shift();
    if (visited.has(scene)) continue;
    visited.add(scene);
    if (scene === destination) return path;
    for (const next of SCENE_BY_ID.get(scene)?.links || []) if (!travelRule(game, scene, next)) queue.push([next, [...path, next]]);
  }
  return null;
}

export const nextDoor = (game, destination) => routeTo(game, destination)?.[1] || null;
