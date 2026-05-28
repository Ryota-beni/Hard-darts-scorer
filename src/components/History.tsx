import { useRef, useState } from 'react';
import { Game } from '../types';
import { getRating, getFlightBadgeClass } from '../stats';
import ManualEntry from './ManualEntry';

interface Props {
  games: Game[];
  onAddGame: (game: Game) => void;
  onDeleteGame: (id: string) => void;
}

export default function History({ games, onAddGame, onDeleteGame }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  return (
    <>
      <div className="p-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-zinc-200">
            履歴 <span className="text-sm font-normal text-zinc-500">{games.length}ゲーム</span>
          </h2>
          <button
            onClick={() => setShowManualEntry(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 active:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700"
          >
            ＋ 手動入力
          </button>
        </div>

        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-zinc-600 px-8 py-16">
            <span className="text-5xl">📋</span>
            <p className="text-center text-zinc-400 font-medium">まだ履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...games].reverse().map((g) => (
              <GameRow
                key={g.id}
                game={g}
                isExpanded={expanded === g.id}
                onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
                onDelete={() => onDeleteGame(g.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showManualEntry && (
        <ManualEntry
          onSave={onAddGame}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </>
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
  const touchStartX = useRef(0);
  const THRESHOLD = 80;

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
            onDelete();
          } else {
            setSwipeX(0);
          }
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

            {game.type === 'doubles' && (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xs text-zinc-500">Double In 成功</p>
                  <p className="font-bold text-purple-400">
                    {game.rounds.filter((r) => r.doubleIn).length}回
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Double In 失敗</p>
                  <p className="font-bold text-zinc-400">
                    {game.rounds.filter((r) => r.doubleInAttempt).length}回
                  </p>
                </div>
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
    </div>
  );
}

function AwardBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>{label}</span>
  );
}
