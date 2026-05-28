import { useState } from 'react';
import { Game } from '../types';
import { calcAwardTotals } from '../stats';

interface Props {
  games: Game[];
}

export default function Awards({ games }: Props) {
  const [tab, setTab] = useState<'league' | 'all'>('league');

  const displayGames = tab === 'league' ? games.filter((g) => g.type !== 'practice') : games;
  const totals = calcAwardTotals(displayGames);

  if (games.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-600 px-8">
        <span className="text-5xl">🏆</span>
        <p className="text-center text-zinc-400 font-medium">まだアワードがありません</p>
        <p className="text-center text-sm">ゲームを記録してアワードを獲得しよう</p>
      </div>
    );
  }

  // 有効ラウンド = 全ラウンド数 − NCO数（ラウンドデータがあるゲームのみ）
  let totalRounds = 0;
  let totalNco = 0;
  let sixtyPlusCount = 0;
  for (const g of displayGames) {
    if (g.rounds.length > 0) {
      totalRounds += g.rounds.length;
      totalNco += g.noCheckouts;
      sixtyPlusCount += g.rounds.filter((r) => r.score >= 60 && r.score < 100).length;
    }
  }
  const effectiveRounds = Math.max(1, totalRounds - totalNco);
  const h60Rate  = (sixtyPlusCount / effectiveRounds) * 100;
  const h100Rate = (totals.hundredPlus / effectiveRounds) * 100;
  const h140Rate = (totals.hundredFortyPlus / effectiveRounds) * 100;
  const h180Rate = (totals.oneEighty / effectiveRounds) * 100;

  return (
    <div className="p-4 pb-6 space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-zinc-800 rounded-xl">
        <button
          onClick={() => setTab('league')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            tab === 'league' ? 'bg-zinc-600 text-white' : 'text-zinc-500 active:text-zinc-300'
          }`}
        >
          League
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            tab === 'all' ? 'bg-zinc-600 text-white' : 'text-zinc-500 active:text-zinc-300'
          }`}
        >
          All
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {tab === 'league' ? 'リーグ戦' : 'League + Practice'} · {displayGames.length}ゲームの累計
      </p>

      {/* 180 — highlight */}
      <div className="bg-gradient-to-r from-yellow-950 to-zinc-900 rounded-2xl p-5 border border-yellow-800">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-yellow-600">180</p>
          <p className="font-display text-6xl text-yellow-300">{totals.oneEighty}</p>
        </div>
      </div>

      <div className="space-y-2">
        <AwardCard label="140+"       count={totals.hundredFortyPlus} color="text-orange-300" bg="bg-orange-950 border-orange-900" />
        <AwardCard label="100+"       count={totals.hundredPlus}      color="text-blue-300"   bg="bg-blue-950 border-blue-900" />
        <AwardCard label="Short Leg"  count={totals.shortDarts}       color="text-cyan-300"   bg="bg-cyan-950 border-cyan-900" />
        <AwardCard label="High Out"   count={totals.highOut}          color="text-emerald-300" bg="bg-emerald-950 border-emerald-900" />
        <AwardCard label="High Start" count={totals.highStart}        color="text-purple-300" bg="bg-purple-950 border-purple-900" />
      </div>

      {/* 100+/140+ 発生率 */}
      <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
        <p className="text-xs text-zinc-500 mb-0.5">ラウンド別発生率</p>
        <p className="text-xs text-zinc-700 mb-3">
          有効{effectiveRounds}R（全{totalRounds}R − NCO {totalNco}回）
        </p>
        <RateRow label="60+"  rate={h60Rate}  color="bg-zinc-400" />
        <RateRow label="100+" rate={h100Rate} color="bg-blue-500" />
        <RateRow label="140+" rate={h140Rate} color="bg-orange-500" />
        <RateRow label="180"  rate={h180Rate} color="bg-yellow-400" />
      </div>
    </div>
  );
}

function AwardCard({
  label, count, color, bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl px-4 py-3.5 border ${bg} flex items-center justify-between`}>
      <p className="text-base font-bold text-zinc-200">{label}</p>
      <p className={`font-display text-4xl tabular-nums ${color}`}>{count}</p>
    </div>
  );
}

function RateRow({ label, rate, color }: { label: string; rate: number; color: string }) {
  const pct = Math.min(100, rate);
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 tabular-nums">{rate.toFixed(1)}%</span>
      </div>
      <div className="bg-zinc-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
