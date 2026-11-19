// Saving: the whole campaign state in one localStorage slot, so Continue on the
// title screen picks up exactly where Dario left off.
import { SAVE_KEY } from './config.js';

export function saveGame(S) {
  try {
    const data = {
      money: S.player.money,
      health: S.player.health,
      ammo: S.player.ammo,
      missionIndex: S.mission.index,
      playerX: S.player.x,
      playerY: S.player.y,
      collected: S.city.pickups.filter((p) => p.taken).map((p) => `${p.x},${p.y}`),
      finished: S.finished,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: then there is nothing to clear.
  }
}
