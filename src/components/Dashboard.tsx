import { Game } from '../types';
import { calcDashboardStats, getRating, getRatingDecimal, FLIGHT_RGB, getFlightBadgeClass, RATING_TABLE } from '../stats';

interface Props {
  games: Game[];
}

export default function Dashboard({ games }: Props) {
  const stats = calcDashboardStats(games);

  if (games.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-600 px-8">
        <span className="text-5xl">🎯</span>
        <p className="text-center text-zinc-400 font-medium">まだゲームが記録されていません</p>
        <p className="text-center text-sm">ゲームタブからプレイを記録しよう</p>
      </div>
    );
  }

  const rtDecimal = getRatingDecimal(stats.ppr);
  const fillPct = (rtDecimal - stats.rt) * 100; // 0〜100: 現RTから次RTへの進捗

  // フライト別カラー（現在 / 次RT）
  const currentRgb = FLIGHT_RGB[stats.flight] ?? '59,130,246';
  const nextEntry = RATING_TABLE.find((e) => e.rt === stats.rt + 1);
  const nextRgb = nextEntry ? (FLIGHT_RGB[nextEntry.flight] ?? currentRgb) : currentRgb;

  // フライトテキスト色（インライン）
  const flightTextColor = `rgb(${currentRgb})`;

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Rating card — カード全体がシークバー */}
      <div className="relative rounded-2xl border border-zinc-800 text-center overflow-hidden" style={{ background: '#18181b' }}>
        {/* 下から塗り上がる進捗レイヤー（現フライト色→次フライト色グラデ） */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: `${stats.rt < 25 ? fillPct : 100}%`,
            background: `linear-gradient(to top, rgba(${currentRgb},0.22) 0%, rgba(${nextRgb},0.10) 100%)`,
            transition: 'height 0.9s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
        {/* 水面グロウライン（次フライト色） */}
        {fillPct > 1 && stats.rt < 25 && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              bottom: `${fillPct}%`,
              height: '1px',
              background: `rgba(${nextRgb},0.7)`,
              boxShadow: `0 0 10px 2px rgba(${nextRgb},0.4)`,
              transition: 'bottom 0.9s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        )}

        {/* コンテンツ */}
        <div className="relative z-10 p-6">
          <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Rating</p>
          <p className="font-display text-7xl tabular-nums text-zinc-200 leading-none">
            {rtDecimal.toFixed(2)}
          </p>
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
      </div>

      {/* Recent games */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">直近ゲーム</p>
        <div className="space-y-1.5">
          {games
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
