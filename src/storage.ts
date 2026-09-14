import { Game } from './types';

const KEY = 'darts_games';

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // "null" など配列以外が入っていても保存処理が壊れないようにする
    return Array.isArray(parsed) ? (parsed as Game[]) : [];
  } catch {
    return [];
  }
}

export function saveGames(games: Game[]): void {
  localStorage.setItem(KEY, JSON.stringify(games));
}
