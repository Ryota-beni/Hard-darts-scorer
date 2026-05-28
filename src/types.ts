export type GameType = 'gallon' | 'singles' | 'doubles' | 'practice';

export interface Round {
  score: number;
  darts: number; // 1-3
  doubleIn?: boolean;        // doubles: 自分がオープン成功
  doubleInAttempt?: boolean; // doubles: DoubleIn ボタンを押したが 0 点（失敗）
  nco?: boolean;             // チェックアウトをトライしたが失敗
}

export interface GameAwards {
  hundredPlus: number;      // rounds scoring 100-139
  hundredFortyPlus: number; // rounds scoring 140-179
  oneEighty: number;        // rounds scoring 180
  shortDarts: boolean;      // personal checkout on dart 1 or 2
  highOut: boolean;         // personal checkout with score 100+
  highStart: boolean;       // doubles: personal double-in + 100+ same round
}

export interface Game {
  id: string;
  type: GameType;
  date: string;
  result: 'win' | 'loss';
  rounds: Round[];
  checkoutDart?: 1 | 2 | 3; // personal checkout dart
  noCheckouts: number;
  totalPoints: number;
  totalDarts: number;
  ppr: number;
  first9?: number;          // singles only: avg of first 3 rounds
  personalDoubleIn: boolean; // doubles only (false for other types)
  awards: GameAwards;
}
