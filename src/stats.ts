import { Game } from './types';

export interface RatingEntry {
  rt: number;
  flight: string;
  min: number;
  max: number;
}

export const RATING_TABLE: RatingEntry[] = [
  { rt: 1,  flight: 'C',   min: 0,      max: 21.72  },
  { rt: 2,  flight: 'C',   min: 21.73,  max: 23.39  },
  { rt: 3,  flight: 'CC',  min: 23.40,  max: 25.06  },
  { rt: 4,  flight: 'CC',  min: 25.07,  max: 26.72  },
  { rt: 5,  flight: 'CC',  min: 26.73,  max: 28.39  },
  { rt: 6,  flight: 'CCC', min: 28.40,  max: 30.06  },
  { rt: 7,  flight: 'CCC', min: 30.07,  max: 33.38  },
  { rt: 8,  flight: 'CCC', min: 33.39,  max: 34.94  },
  { rt: 9,  flight: 'B',   min: 34.95,  max: 36.65  },
  { rt: 10, flight: 'B',   min: 36.66,  max: 38.51  },
  { rt: 11, flight: 'BB',  min: 38.52,  max: 40.60  },
  { rt: 12, flight: 'BB',  min: 40.61,  max: 42.92  },
  { rt: 13, flight: 'BB',  min: 42.93,  max: 45.53  },
  { rt: 14, flight: 'BBB', min: 45.54,  max: 48.47  },
  { rt: 15, flight: 'BBB', min: 48.48,  max: 51.80  },
  { rt: 16, flight: 'BBB', min: 51.81,  max: 55.64  },
  { rt: 17, flight: 'A',   min: 55.65,  max: 60.11  },
  { rt: 18, flight: 'A',   min: 60.12,  max: 65.33  },
  { rt: 19, flight: 'AA',  min: 65.34,  max: 71.54  },
  { rt: 20, flight: 'AA',  min: 71.55,  max: 79.10  },
  { rt: 21, flight: 'AA',  min: 79.11,  max: 83.48  },
  { rt: 22, flight: 'AAA', min: 83.49,  max: 88.40  },
  { rt: 23, flight: 'AAA', min: 88.41,  max: 93.92  },
  { rt: 24, flight: 'AAA', min: 93.93,  max: 100.19 },
  { rt: 25, flight: 'S',   min: 100.20, max: Infinity },
];

// フライト別 RGB値（inline style用）
// C=青, B=紫, A=オレンジ, S=黄。CC/BB/AAは濃いバージョン
export const FLIGHT_RGB: Record<string, string> = {
  'C':   '96,165,250',    // blue-400
  'CC':  '59,130,246',    // blue-500
  'CCC': '37,99,235',     // blue-600
  'B':   '192,132,252',   // purple-400
  'BB':  '168,85,247',    // purple-500
  'BBB': '147,51,234',    // purple-600
  'A':   '251,146,60',    // orange-400
  'AA':  '249,115,22',    // orange-500
  'AAA': '234,88,12',     // orange-600
  'S':   '234,179,8',     // yellow-500
};

// フライトバッジ用 Tailwind クラス（共通）
export function getFlightBadgeClass(flight: string): string {
  if (flight === 'S')   return 'bg-yellow-500 text-black';
  if (flight === 'AAA') return 'bg-orange-600 text-white';
  if (flight === 'AA')  return 'bg-orange-500 text-white';
  if (flight === 'A')   return 'bg-orange-400 text-white';
  if (flight === 'BBB') return 'bg-purple-600 text-white';
  if (flight === 'BB')  return 'bg-purple-500 text-white';
  if (flight === 'B')   return 'bg-purple-400 text-white';
  if (flight === 'CCC') return 'bg-blue-600 text-white';
  if (flight === 'CC')  return 'bg-blue-500 text-white';
  return 'bg-blue-400 text-white'; // C
}

export function getRating(ppr: number): RatingEntry {
  return RATING_TABLE.find((e) => ppr >= e.min && ppr <= e.max) ?? RATING_TABLE[0];
}

/**
 * RT を小数点2桁まで算出（RT内での位置を線形補間）
 * 例: RT8の範囲33.39〜34.94、PPR=34.0 → 8 + (34.0-33.39)/(34.94-33.39) ≈ 8.39
 */
export function getRatingDecimal(ppr: number): number {
  const entry = getRating(ppr);
  if (entry.max === Infinity) return 25.00; // S flight 上限なし
  const range = entry.max - entry.min;
  if (range <= 0) return entry.rt;
  const fraction = Math.min(0.99, (ppr - entry.min) / range);
  return entry.rt + fraction;
}

export function calcGamePPR(rounds: { score: number; darts: number }[]): number {
  if (rounds.length === 0) return 0;
  const totalPoints = rounds.reduce((s, r) => s + r.score, 0);
  const totalDarts = rounds.reduce((s, r) => s + r.darts, 0);
  if (totalDarts === 0) return 0;
  return (totalPoints * 3) / totalDarts;
}

export interface DashboardStats {
  ppr: number;
  rt: number;
  flight: string;
  first9: number | null;
  checkoutRate: number | null;
  openRate: number | null;
  wins: number;
  losses: number;
  totalGames: number;
  gamesForRating: number; // how many games used for rating
}

export function calcDashboardStats(allGames: Game[]): DashboardStats {
  // Practice ゲームはスタッツ・レーティングに影響しない
  const leagueGames = allGames.filter((g) => g.type !== 'practice');
  const last50 = leagueGames.slice(-50);
  const wins = leagueGames.filter((g) => g.result === 'win').length;
  const losses = leagueGames.filter((g) => g.result === 'loss').length;

  // PPR and rating: average PPR of last 50 league games
  const ppr =
    last50.length > 0
      ? last50.reduce((s, g) => s + g.ppr, 0) / last50.length
      : 0;
  const rating = getRating(ppr);

  // First 9: average of first9 values in last 50 Singles games
  const singlesLast50 = leagueGames
    .filter((g) => g.type === 'singles')
    .slice(-50)
    .filter((g) => g.first9 != null);
  const first9 =
    singlesLast50.length > 0
      ? singlesLast50.reduce((s, g) => s + g.first9!, 0) / singlesLast50.length
      : null;

  // Checkout rate: personal checkouts / (personal checkouts + total no-checkouts)
  const personalCheckouts = leagueGames.filter((g) => g.checkoutDart != null).length;
  const totalNco = leagueGames.reduce((s, g) => s + g.noCheckouts, 0);
  const checkoutTotal = personalCheckouts + totalNco;
  const checkoutRate = checkoutTotal > 0 ? (personalCheckouts / checkoutTotal) * 100 : null;

  // Open rate: doubles games with personal double-in / total doubles games
  const doublesGames = leagueGames.filter((g) => g.type === 'doubles');
  const openRate =
    doublesGames.length > 0
      ? (doublesGames.filter((g) => g.personalDoubleIn).length / doublesGames.length) * 100
      : null;

  return {
    ppr,
    rt: rating.rt,
    flight: rating.flight,
    first9,
    checkoutRate,
    openRate,
    wins,
    losses,
    totalGames: leagueGames.length,
    gamesForRating: last50.length,
  };
}

export interface AwardTotals {
  hundredPlus: number;
  hundredFortyPlus: number;
  oneEighty: number;
  shortDarts: number;
  highOut: number;
  highStart: number;
}

export function calcAwardTotals(games: Game[]): AwardTotals {
  return games.reduce(
    (acc, g) => ({
      hundredPlus: acc.hundredPlus + g.awards.hundredPlus,
      hundredFortyPlus: acc.hundredFortyPlus + g.awards.hundredFortyPlus,
      oneEighty: acc.oneEighty + g.awards.oneEighty,
      shortDarts: acc.shortDarts + (g.awards.shortDarts ? 1 : 0),
      highOut: acc.highOut + (g.awards.highOut ? 1 : 0),
      highStart: acc.highStart + (g.awards.highStart ? 1 : 0),
    }),
    { hundredPlus: 0, hundredFortyPlus: 0, oneEighty: 0, shortDarts: 0, highOut: 0, highStart: 0 }
  );
}
