import { Game } from './types';

const KEY = 'darts_games';

export function loadGames(): Game[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Game[]) : [];
  } catch {
    return [];
  }
}

export function saveGames(games: Game[]): void {
  localStorage.setItem(KEY, JSON.stringify(games));
}
