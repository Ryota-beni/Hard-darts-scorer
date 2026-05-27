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
          <p className="font-display text-7xl tabular-nums text-white leading-none">
            {rtDecimal.toFixed(2)}
          </p>
          <p className="font-display text-3xl mt-2" style={{ color: flightTextColor }}>
            {stats.flight}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">PPR</p>
            <p className="font-display text-5xl tabular-nums text-white leading-none">
              {stats.ppr.toFixed(2)}
            </p>
          </div>

          {/* RT ラベル */}
          <div className="mt-4 flex justify-between text-xs px-1">
            <span className="text-zinc-500">RT {stats.rt}</span>
            <span className="text-zinc-700">{stats.rt < 25 ? `RT ${stats.rt + 1}` : 'MAX'}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="First 9"
          value={stats.first9 != null ? stats.first9.toFixed(1) : '—'}
          sub="Singles · 最初3R平均"
          accent="text-yellow-400"
        />
        <StatCard
          label="Win / Lose"
          value={`${stats.wins} / ${stats.losses}`}
          sub={`${stats.totalGames} games`}
          accent="text-emerald-400"
        />
        <StatCard
          label="チェックアウト率"
          value={stats.checkoutRate != null ? `${stats.checkoutRate.toFixed(1)}%` : '—'}
          sub="成功 / 機会"
          accent="text-cyan-400"
        />
        <StatCard
          label="オープン率"
          value={stats.openRate != null ? `${stats.openRate.toFixed(1)}%` : '—'}
          sub="Doubles · DoubleIn成功率"
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
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>
    </div>
  );
}
