import { restoreGame } from './story.js';

export const GAME_KEY = 'beyond-walls-3d-story-v1';
export const PREVIEW_KEY = 'beyond-walls-3d-scenes-v1';
function read(storage, key) {
  const text = storage.getItem(key);
  if (!text) return null;
  if (text.length > 50000) throw new Error('存档过大，已保留原记录。');
  return JSON.parse(text);
}

export function loadGame(storage) {
  const record = read(storage, GAME_KEY);
  if (!record) return null;
  const game = restoreGame(record);
  const location = record.location;
  return { game, location: location && Number.isFinite(location.x) && Number.isFinite(location.z) ? location : null };
}

export function saveGame(storage, game, location) {
  storage.setItem(GAME_KEY, JSON.stringify({ version: 1, events: game.events, scene: game.scene, location }));
}

export function backupGame(storage) {
  const previous = storage.getItem(GAME_KEY);
  if (previous) storage.setItem(GAME_KEY + '-previous', previous);
}

export function loadPreview(storage) {
  const record = read(storage, PREVIEW_KEY);
  return record?.version === 1 ? record : null;
}

export function savePreview(storage, scene, location) {
  storage.setItem(PREVIEW_KEY, JSON.stringify({ version: 1, scene, ...location }));
}
