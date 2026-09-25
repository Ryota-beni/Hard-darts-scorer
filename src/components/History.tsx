import { useMemo, useRef, useState } from 'react';
import { Game } from '../types';
import {
  getRating, getFlightBadgeClass, getRatingDecimal, calcDashboardStats, FLIGHT_RGB, RATING_TABLE,
} from '../stats';
import ManualEntry from './ManualEntry';

interface Props {
  games: Game[];
  onAddGame: (game: Game) => void;
  onDeleteGame: (id: string) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function History({ games, onAddGame, onDeleteGame }: Props) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // 日付ごとのゲーム
  const byDay = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const g of games) {
      const k = dayKey(new Date(g.date));
      const arr = map.get(k);
      if (arr) arr.push(g);
      else map.set(k, [g]);
    }
    return map;
  }, [games]);

  // その日が終わった時点のレーティング（リーグ戦のみ・直近50ゲーム平均）
  const ratingByDay = useMemo(() => {
    const league = games
      .filter((g) => g.type !== 'practice')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const map = new Map<string, number>();
    const acc: Game[] = [];
    for (const g of league) {
      acc.push(g);
      const last50 = acc.slice(-50);
      const ppr = last50.reduce((s, x) => s + x.ppr, 0) / last50.length;
      map.set(dayKey(new Date(g.date)), getRatingDecimal(ppr)); // 同じ日は最後のゲームで上書き
    }
    return map;
  }, [games]);

  // 日別詳細
  if (selectedDay) {
    const dayGames = byDay.get(selectedDay) ?? [];
    return (
      <>
        <DayDetail
          dateKey={selectedDay}
          games={dayGames}
          onBack={() => setSelectedDay(null)}
          onDeleteGame={onDeleteGame}
        />
        {showManualEntry && (
          <ManualEntry onSave={onAddGame} onClose={() => setShowManualEntry(false)} />
        )}
      </>
    );
  }

  const year = month.getFullYear();
  const mon = month.getMonth();
  const startPad = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayKey = dayKey(new Date());
  const monthGames = games.filter((g) => {
    const d = new Date(g.date);
    return d.getFullYear() === year && d.getMonth() === mon;
  });

  return (
    <>
      <div className="p-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(new Date(year, mon - 1, 1))}
              className="w-8 h-8 rounded-lg bg-zinc-800 active:bg-zinc-700 text-zinc-300 text-sm"
            >
              ‹
            </button>
            <h2 className="font-display text-2xl text-zinc-200 tabular-nums">
              {year}.{String(mon + 1).padStart(2, '0')}
            </h2>
            <button
              onClick={() => setMonth(new Date(year, mon + 1, 1))}
              className="w-8 h-8 rounded-lg bg-zinc-800 active:bg-zinc-700 text-zinc-300 text-sm"
            >
              ›
            </button>
          </div>
          <button
            onClick={() => setShowManualEntry(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 active:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700"
          >
            ＋ 手動入力
          </button>
        </div>

        <p className="text-xs text-zinc-600 mb-2">{monthGames.length}ゲーム</p>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w, i) => (
            <p
              key={w}
              className={`text-center text-[10px] ${
                i === 0 ? 'text-red-400/70' : i === 6 ? 'text-blue-400/70' : 'text-zinc-600'
              }`}
            >
              {w}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d == null) return <div key={`p${i}`} />;
            const k = dayKey(new Date(year, mon, d));
            const dayGames = byDay.get(k);
            const rt = ratingByDay.get(k);
            return (
              <button
                key={k}
                disabled={!dayGames}
                onClick={() => setSelectedDay(k)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 border ${
                  dayGames
                    ? 'bg-zinc-900 border-zinc-700 active:bg-zinc-800'
                    : 'bg-transparent border-transparent'
                } ${k === todayKey ? 'ring-1 ring-cyan-600' : ''}`}
              >
                <span className={`text-[11px] tabular-nums ${dayGames ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {d}
                </span>
                {rt != null ? (
                  <span
                    className="font-display text-[11px] leading-none tabular-nums"
                    style={{ color: `rgb(${FLIGHT_RGB[ratingFlight(rt)] ?? '148,163,184'})` }}
                  >
                    {rt.toFixed(2)}
                  </span>
                ) : dayGames ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                ) : null}
              </button>
            );
          })}
        </div>

        {games.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 text-zinc-600 px-8 py-12">
            <span className="text-5xl">📋</span>
            <p className="text-center text-zinc-400 font-medium">まだ履歴がありません</p>
          </div>
        )}
      </div>

      {showManualEntry && (
        <ManualEntry onSave={onAddGame} onClose={() => setShowManualEntry(false)} />
      )}
    </>
  );
}

// RT小数からフライト名を引く
function ratingFlight(rtDecimal: number): string {
  const rt = Math.floor(rtDecimal);
  return RATING_TABLE.find((e) => e.rt === rt)?.flight ?? 'C';
}

function DayDetail({
  dateKey, games, onBack, onDeleteGame,
}: {
  dateKey: string;
  games: Game[];
  onBack: () => void;
  onDeleteGame: (id: string) => void;
}) {
  const [tab, setTab] = useState<'league' | 'all'>('league');
  const [expanded, setExpanded] = useState<string | null>(null);

  const shown = tab === 'all' ? games : games.filter((g) => g.type !== 'practice');
  const stats = calcDashboardStats(games, tab === 'all');
  const [y, m, d] = dateKey.split('-');
  const weekday = WEEKDAYS[new Date(Number(y), Number(m) - 1, Number(d)).getDay()];

  return (
    <div className="p-4 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onBack} className="text-zinc-500 active:text-white text-lg leading-none pr-1">
          ←
        </button>
        <h2 className="font-display text-2xl text-zinc-200 tabular-nums">
          {Number(m)}/{Number(d)}
        </h2>
        <span className="text-xs text-zinc-500">({weekday})</span>
        <span className="text-xs text-zinc-600 ml-auto">{shown.length}ゲーム</span>
      </div>

      <div className="flex gap-1 p-1 bg-zinc-800 rounded-xl mb-3">
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

      {shown.length === 0 ? (
        <p className="text-center text-sm text-zinc-500 py-10">
          {tab === 'league' ? 'この日はリーグ戦がありません' : 'この日の記録がありません'}
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-center mb-3">
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Rating</p>
            <p className="font-display text-5xl tabular-nums text-zinc-200 leading-none">
              {getRatingDecimal(stats.ppr).toFixed(2)}
            </p>
            <p className="font-display text-2xl mt-1" style={{ color: `rgb(${FLIGHT_RGB[stats.flight] ?? '148,163,184'})` }}>
              {stats.flight}
            </p>
            <div className="mt-3">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">PPR</p>
              <p className="font-display text-3xl tabular-nums text-zinc-200 leading-none">
                {stats.ppr.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <DayStat label="Win" value={`${stats.wins}`} accent="text-emerald-400" />
            <DayStat label="Lose" value={`${stats.losses}`} accent="text-red-400" />
            <DayStat
              label="Check out %"
              value={stats.checkoutRate != null ? `${stats.checkoutRate.toFixed(1)}%` : '—'}
              sub={stats.checkoutOpportunities > 0 ? `${stats.checkoutSuccesses} / ${stats.checkoutOpportunities}` : undefined}
              accent="text-cyan-400"
            />
            <DayStat
              label="Open %"
              value={stats.openRate != null ? `${stats.openRate.toFixed(1)}%` : '—'}
              sub={stats.openTotal > 0 ? `${stats.openSuccesses} / ${stats.openTotal}` : undefined}
              accent="text-purple-400"
            />
            <DayStat
              label="Cork %"
              value={stats.corkRate != null ? `${stats.corkRate.toFixed(1)}%` : '—'}
              sub={stats.corkTotal > 0 ? `${stats.corkWins} / ${stats.corkTotal}` : undefined}
              accent="text-amber-400"
            />
            <DayStat
              label="First 9"
              value={stats.first9 != null ? stats.first9.toFixed(2) : '—'}
              accent="text-zinc-200"
            />
          </div>

          <div className="space-y-2">
            {[...shown].reverse().map((g) => (
              <GameRow
                key={g.id}
                game={g}
                isExpanded={expanded === g.id}
                onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
                onDelete={() => onDeleteGame(g.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DayStat({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-3 border border-zinc-800">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">{sub}</p>}
    </div>
  );
}

function GameRow({
  game, isExpanded, onToggle, onDelete,
}: {
  game: Game;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const touchStartX = useRef(0);
  const THRESHOLD = 100;

  const typeName =
    game.type === 'singles' ? 'Singles'
    : game.type === 'doubles' ? 'Doubles'
    : game.type === 'practice' ? 'Practice'
    : 'Gallon';
  const typeBg =
    game.type === 'singles'
      ? 'bg-cyan-900 text-cyan-300'
      : game.type === 'doubles'
      ? 'bg-purple-900 text-purple-300'
      : game.type === 'practice'
      ? 'bg-green-900 text-green-300'
      : 'bg-amber-900 text-amber-300';

  const dateStr = new Date(game.date).toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rating = getRating(game.ppr);

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* 削除ゾーン（スワイプで背後から現れる） */}
      <div
        className="absolute inset-0 bg-red-600 flex items-center pl-5"
        style={{ opacity: Math.min(swipeX / THRESHOLD, 1) }}
      >
        <span className="text-white text-sm font-bold">削除</span>
      </div>

      {/* 行本体 */}
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
          setIsSwiping(true);
        }}
        onTouchMove={(e) => {
          const delta = e.touches[0].clientX - touchStartX.current;
          if (delta > 0) setSwipeX(Math.min(delta, 120));
        }}
        onTouchEnd={() => {
          setIsSwiping(false);
          if (swipeX >= THRESHOLD) {
            setConfirmDelete(true);
          }
          setSwipeX(0);
        }}
        className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
      >
        {/* Row header */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 active:bg-zinc-800"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                game.result === 'win' ? 'bg-emerald-400' : 'bg-red-500'
              }`}
            />
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ${typeBg}`}>
              {typeName}
            </span>
            {game.decidedByCork && (
              <span className="px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 bg-zinc-700 text-zinc-200">
                Cork
              </span>
            )}
            <span className="text-xs text-zinc-500 truncate">{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-bold ${getFlightBadgeClass(rating.flight)}`}
            >
              {rating.flight}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              <span className="text-zinc-500 text-xs">PPR </span>
              <span className="text-cyan-400">{game.ppr.toFixed(1)}</span>
            </span>
            <span className={`text-xs font-bold ${game.result === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
              {game.result === 'win' ? 'WIN' : 'LOSE'}
            </span>
            <span className="text-zinc-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getFlightBadgeClass(rating.flight)}`}>
                {rating.flight}
              </span>
              <span className="text-xs text-zinc-500">RT{rating.rt}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-zinc-500">得点合計</p>
                <p className="font-bold text-zinc-200">{game.totalPoints}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Darts</p>
                <p className="font-bold text-zinc-200">{game.totalDarts}<span className="text-xs text-zinc-500 ml-0.5">darts</span></p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">NCO</p>
                <p className="font-bold text-zinc-200">{game.noCheckouts}</p>
              </div>
            </div>

            {(game.openingCork || game.decidedByCork) && (
              <div className="flex justify-center gap-4 text-xs">
                {game.openingCork && <CorkResult label="先攻決めCork" result={game.openingCork} />}
                {game.limitCork && <CorkResult label="決着Cork" result={game.limitCork} />}
                {game.decidedByCork && !game.limitCork && (
                  <span className="text-zinc-500">決着Cork No Throw</span>
                )}
              </div>
            )}

            {game.type === 'singles' && game.first9 != null && (
              <div className="text-center">
                <p className="text-xs text-zinc-500">First 9</p>
                <p className="font-bold text-yellow-400">{game.first9.toFixed(1)}</p>
              </div>
            )}


            <div className="flex flex-wrap gap-1.5">
              {game.awards.oneEighty > 0 && (
                <AwardBadge label={`180 ×${game.awards.oneEighty}`} color="text-yellow-300 bg-yellow-900" />
              )}
              {game.awards.hundredFortyPlus > 0 && (
                <AwardBadge label={`140+ ×${game.awards.hundredFortyPlus}`} color="text-orange-300 bg-orange-900" />
              )}
              {game.awards.hundredPlus > 0 && (
                <AwardBadge label={`100+ ×${game.awards.hundredPlus}`} color="text-blue-300 bg-blue-900" />
              )}
              {game.awards.shortDarts && (
                <AwardBadge label="⚡ Short Leg" color="text-cyan-300 bg-cyan-900" />
              )}
              {game.awards.highOut && (
                <AwardBadge label="Hi-Out 🚀" color="text-emerald-300 bg-emerald-900" />
              )}
              {game.awards.highStart && (
                <AwardBadge label="Hi-Start ✨" color="text-purple-300 bg-purple-900" />
              )}
            </div>

            {game.rounds.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 mb-1.5">ラウンド得点</p>
                <div className="flex flex-wrap gap-1">
                  {game.rounds.map((r, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded font-mono ${
                        r.score === 180
                          ? 'bg-yellow-800 text-yellow-100'
                          : r.score >= 140
                          ? 'bg-orange-900 text-orange-200'
                          : r.score >= 100
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {r.score}
                      {r.darts < 3 && <span className="text-zinc-400">/{r.darts}</span>}
                      {r.doubleIn        && <span className="text-purple-400">●</span>}
                      {r.doubleInAttempt && <span className="text-purple-800">●</span>}
                      {r.nco             && <span className="text-amber-500">●</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 削除確認ダイアログ */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-xs bg-zinc-900 rounded-2xl border border-zinc-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-bold text-center mb-2">この履歴を削除しますか？</p>
            <p className="text-sm text-zinc-400 text-center mb-6">
              {typeName} · {dateStr}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 active:bg-zinc-700 font-semibold text-sm text-zinc-300"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
                className="flex-1 py-3 rounded-xl bg-red-700 active:bg-red-600 font-bold text-sm text-white"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CorkResult({ label, result }: { label: string; result: 'win' | 'loss' }) {
  return (
    <span>
      <span className="text-zinc-500">{label} </span>
      <span className={`font-bold ${result === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
        {result === 'win' ? 'WIN' : 'LOSE'}
      </span>
    </span>
  );
}

function AwardBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
  );
}
