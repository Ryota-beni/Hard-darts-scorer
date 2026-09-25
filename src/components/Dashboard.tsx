import { useEffect, useRef, useState } from 'react';
import { Game } from '../types';
import { calcDashboardStats, getRating, getRatingDecimal, FLIGHT_RGB, getFlightBadgeClass, RATING_TABLE } from '../stats';

interface Props {
  games: Game[];
}

// 画面を開いたときだけ from → target へ 0.9秒かけて動かす
// （League / All の切替では動かさず、すぐ新しい値にする）
function useAnimatedNumber(target: number, from: number): number {
  const [value, setValue] = useState(from);
  const currentRef = useRef(from);
  const animatedRef = useRef(false); // 初回アニメーションが終わったか

  useEffect(() => {
    const start = currentRef.current;
    if (animatedRef.current || Math.abs(start - target) < 0.0001) {
      animatedRef.current = true;
      currentRef.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    const DURATION = 900;
    let id = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - t0) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      currentRef.current = v;
      setValue(v);
      if (p < 1) id = requestAnimationFrame(step);
      else animatedRef.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [target]);

  return value;
}

// 直近50ゲームの平均PPR
function avgPpr(games: Game[]): number {
  const last50 = games.slice(-50);
  if (last50.length === 0) return 0;
  return last50.reduce((s, g) => s + g.ppr, 0) / last50.length;
}

export default function Dashboard({ games }: Props) {
  const [tab, setTab] = useState<'league' | 'all'>('league');
  const stats = calcDashboardStats(games, tab === 'all');

  const rtDecimal = getRatingDecimal(stats.ppr);

  // 今日開始時点（= 今日より前のゲームまで）のレーティング
  const shownGames = tab === 'all' ? games : games.filter((g) => g.type !== 'practice');
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const beforeToday = shownGames.filter((g) => new Date(g.date) < startOfToday);
  const playedToday = shownGames.length > beforeToday.length;
  const baseRt = beforeToday.length > 0 ? getRatingDecimal(avgPpr(beforeToday)) : null;
  const delta = playedToday && baseRt != null ? rtDecimal - baseRt : null;

  // 今日開始時のRTからスタートして、現在のRTまでゲージを動かす
  const animRt = useAnimatedNumber(rtDecimal, baseRt ?? rtDecimal);
  const animInt = Math.min(25, Math.max(1, Math.floor(animRt)));
  const fillPct = Math.max(0, Math.min(100, (animRt - animInt) * 100));

  if (games.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-600 px-8">
        <span className="text-5xl">🎯</span>
        <p className="text-center text-zinc-400 font-medium">まだゲームが記録されていません</p>
        <p className="text-center text-sm">ゲームタブからプレイを記録しよう</p>
      </div>
    );
  }

  // フライト別カラー（現在 / 次RT）
  const currentRgb = FLIGHT_RGB[stats.flight] ?? '59,130,246';
  const nextEntry = RATING_TABLE.find((e) => e.rt === stats.rt + 1);
  const nextRgb = nextEntry ? (FLIGHT_RGB[nextEntry.flight] ?? currentRgb) : currentRgb;

  // フライトテキスト色（インライン）
  const flightTextColor = `rgb(${currentRgb})`;

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* League / All 切替 */}
      <div className="flex gap-1 p-1 bg-zinc-800 rounded-xl">
        {(['league', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              tab === t ? 'bg-zinc-600 text-white' : 'text-zinc-500 active:text-zinc-300'
            }`}
          >
            {t === 'league' ? 'League' : 'All'}
          </button>
        ))}
      </div>
      {/* Rating card — カード全体がシークバー */}
      <div className="relative rounded-2xl border border-zinc-800 text-center overflow-hidden" style={{ background: '#18181b' }}>
        {/* 下から塗り上がる進捗レイヤー（現フライト色→次フライト色グラデ） */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: `${animInt < 25 ? fillPct : 100}%`,
            background: `linear-gradient(to top, rgba(${currentRgb},0.22) 0%, rgba(${nextRgb},0.10) 100%)`,
          }}
        />
        {/* 水面グロウライン（次フライト色） */}
        {fillPct > 1 && animInt < 25 && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              bottom: `${fillPct}%`,
              height: '1px',
              background: `rgba(${nextRgb},0.7)`,
              boxShadow: `0 0 10px 2px rgba(${nextRgb},0.4)`,
            }}
          />
        )}

        {/* コンテンツ */}
        <div className="relative z-10 p-6">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Rating</p>
          <p className="font-display text-7xl tabular-nums text-zinc-200 leading-none">
            {animRt.toFixed(2)}
          </p>
          {delta != null && (
            <p
              className={`text-sm font-bold tabular-nums mt-1 ${
                delta > 0.004 ? 'text-emerald-400' : delta < -0.004 ? 'text-red-400' : 'text-zinc-500'
              }`}
            >
              {delta > 0.004 ? '▲' : delta < -0.004 ? '▼' : ''}
              {delta >= 0 ? '+' : '−'}{Math.abs(delta).toFixed(2)}
              <span className="text-zinc-600 font-normal ml-1">today</span>
            </p>
          )}
          <p className="font-display text-3xl mt-2" style={{ color: flightTextColor }}>
            {stats.flight}
          </p>

          <div className="mt-4 space-y-3">
            <div className="text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">PPR</p>
              <p className="font-display text-5xl tabular-nums text-zinc-200 leading-none">
                {stats.ppr.toFixed(2)}
              </p>
            </div>
            {stats.first9 != null && (
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">First 9</p>
                <p className="font-display text-4xl tabular-nums text-zinc-200 leading-none">
                  {stats.first9.toFixed(2)}
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Win"
          value={`${stats.wins}`}
          accent="text-emerald-400"
        />
        <StatCard
          label="Lose"
          value={`${stats.losses}`}
          accent="text-red-400"
        />
        <StatCard
          label="Check out %"
          value={stats.checkoutRate != null ? `${stats.checkoutRate.toFixed(1)}%` : '—'}
          sub={stats.checkoutOpportunities > 0 ? `${stats.checkoutSuccesses} / ${stats.checkoutOpportunities}` : undefined}
          accent="text-cyan-400"
        />
        <StatCard
          label="Open %"
          value={stats.openRate != null ? `${stats.openRate.toFixed(1)}%` : '—'}
          sub={stats.openTotal > 0 ? `${stats.openSuccesses} / ${stats.openTotal}` : undefined}
          accent="text-purple-400"
        />
        <StatCard
          label="Cork %"
          value={stats.corkRate != null ? `${stats.corkRate.toFixed(1)}%` : '—'}
          sub={stats.corkTotal > 0 ? `${stats.corkWins} / ${stats.corkTotal}` : undefined}
          accent="text-amber-400"
          className="col-span-2"
        />
      </div>

      {/* Recent games */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">直近ゲーム</p>
        <div className="space-y-1.5">
          {(tab === 'all' ? games : games.filter((g) => g.type !== 'practice'))
            .slice(-8)
            .reverse()
            .map((g) => {
              const gr = getRating(g.ppr);
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between bg-zinc-900 rounded-xl px-3 py-2.5 border border-zinc-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        g.result === 'win' ? 'bg-emerald-400' : 'bg-red-500'
                      }`}
                    />
                    <span className="text-xs text-zinc-300 flex-shrink-0">
                      {g.type === 'singles'
                        ? 'Singles'
                        : g.type === 'doubles'
                        ? 'Doubles'
                        : g.type === 'practice'
                        ? 'Practice'
                        : 'Gallon'}
                    </span>
                    <span className="text-xs text-zinc-600 truncate">
                      {new Date(g.date).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-bold ${getFlightBadgeClass(gr.flight)}`}
                    >
                      {gr.flight}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">
                      {g.ppr.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  className = '',
  center = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  className?: string;
  center?: boolean;
}) {
  return (
    <div className={`bg-zinc-900 rounded-2xl p-4 border border-zinc-800 ${center ? 'text-center' : ''} ${className}`}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">{sub}</p>}
    </div>
  );
}
