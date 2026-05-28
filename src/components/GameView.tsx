import { useState } from 'react';
import { Game, GameType, Round } from '../types';
import { calcGamePPR } from '../stats';

interface Props {
  onLegSave: (game: Game) => void;
  onMatchComplete: () => void;
}

export default function GameView({ onLegSave, onMatchComplete }: Props) {
  const [phase, setPhase] = useState<'select' | 'playing' | 'between'>('select');
  const [gameType, setGameType] = useState<GameType>('singles');

  // Leg内状態
  const [rounds, setRounds] = useState<Round[]>([]);
  const [input, setInput] = useState('');
  const [remaining, setRemaining] = useState(501);
  const [ncoCount, setNcoCount] = useState(0);
  const [ncoActive, setNcoActive] = useState(false);
  const [doubleInPending, setDoubleInPending] = useState(false);
  const [personalDoubleIn, setPersonalDoubleIn] = useState(false);
  const [doubleInRoundScore, setDoubleInRoundScore] = useState<number | null>(null);
  const [bust, setBust] = useState(false);
  const [inputError, setInputError] = useState('');

  // チェックアウトポップアップ
  const [checkoutPopup, setCheckoutPopup] = useState(false);
  const [checkoutScore, setCheckoutScore] = useState(0);

  // Match状態
  const [legNumber, setLegNumber] = useState(1);
  const [playerLegs, setPlayerLegs] = useState(0);
  const [oppLegs, setOppLegs] = useState(0);
  const [lastLegResult, setLastLegResult] = useState<'win' | 'loss'>('win');

  const resetLegState = () => {
    setRounds([]);
    setInput('');
    setRemaining(501);
    setNcoCount(0);
    setNcoActive(false);
    setDoubleInPending(false);
    setPersonalDoubleIn(false);
    setDoubleInRoundScore(null);
    setBust(false);
    setInputError('');
    setCheckoutPopup(false);
    setCheckoutScore(0);
  };

  const startGame = (type: GameType) => {
    resetLegState();
    setGameType(type);
    setLegNumber(1);
    setPlayerLegs(0);
    setOppLegs(0);
    setPhase('playing');
  };

  const startNextLeg = () => {
    resetLegState();
    setPhase('playing');
  };

  const handleDigit = (d: string) => {
    if (input.length >= 3) return;
    setInputError('');
    setInput((p) => p + d);
  };

  const handleDelete = () => {
    setInput((p) => p.slice(0, -1));
    setInputError('');
  };

  const handleSubmit = () => {
    if (!input) return;
    const score = parseInt(input, 10);
    if (isNaN(score) || score < 0 || score > 180) {
      setInputError('0〜180の範囲で入力');
      setInput('');
      return;
    }

    if (gameType === 'singles' || gameType === 'practice') {
      const newRemaining = remaining - score;
      if (newRemaining < 0 || newRemaining === 1) {
        setBust(true);
        setTimeout(() => setBust(false), 1500);
        setInput('');
        return;
      }
      if (newRemaining === 0) {
        // ちょうど0 → チェックアウトポップアップ
        setCheckoutScore(score);
        setCheckoutPopup(true);
        return;
      }
      setRounds((p) => [...p, { score, darts: 3, ...(ncoActive ? { nco: true } : {}) }]);
      if (ncoActive) setNcoCount((p) => p + 1);
      setRemaining(newRemaining);
      setInput('');
    } else {
      // score > 0 かつ Double In 選択中 → 自分がオープン成功
      const isDoubleIn = gameType === 'doubles' && doubleInPending && !personalDoubleIn && score > 0;
      // ゲーム未オープン（まだ誰も score > 0 を出していない）かつ 0 点 → ダブルイン失敗
      const gameAlreadyOpen = rounds.some((r) => r.score > 0);
      const isFailedDoubleIn = gameType === 'doubles' && !personalDoubleIn && !gameAlreadyOpen && score === 0;
      const round: Round = {
        score,
        darts: 3,
        ...(isDoubleIn       ? { doubleIn: true }        : {}),
        ...(isFailedDoubleIn ? { doubleInAttempt: true }  : {}),
        ...(ncoActive        ? { nco: true }              : {}),
      };
      setRounds((p) => [...p, round]);
      if (isDoubleIn) {
        setPersonalDoubleIn(true);
        setDoubleInRoundScore(score);
      }
      if (ncoActive) setNcoCount((p) => p + 1);
      setInput('');
      setDoubleInPending(false);
    }
  };

  const handleCheckOutPress = () => {
    if (!input) {
      setInputError('チェックアウトの点数を入力');
      return;
    }
    const score = parseInt(input, 10);
    if (isNaN(score) || score <= 0 || score > 180) {
      setInputError('1〜180の範囲で入力');
      setInput('');
      return;
    }
    setInputError('');
    setCheckoutScore(score);
    setCheckoutPopup(true);
  };

  const checkoutWithDart = (dart: 1 | 2 | 3) => {
    const score = checkoutScore;
    const isDoubleIn = gameType === 'doubles' && doubleInPending && !personalDoubleIn;
    const coRound: Round = { score, darts: dart, ...(isDoubleIn ? { doubleIn: true } : {}) };
    const finalRounds = [...rounds, coRound];
    let finalPdi = personalDoubleIn;
    let finalDiScore = doubleInRoundScore;
    if (isDoubleIn) { finalPdi = true; finalDiScore = score; }
    setInput('');
    setCheckoutPopup(false);
    doFinalize(finalRounds, 'win', dart, score, finalPdi, finalDiScore);
  };

  const handleUndo = () => {
    if (rounds.length === 0) return;
    const lastRound = rounds[rounds.length - 1];
    const newRounds = rounds.slice(0, -1);
    setRounds(newRounds);

    // Singles/Practice: 残り点数を再計算
    if (gameType === 'singles' || gameType === 'practice') {
      setRemaining(501 - newRounds.reduce((s, r) => s + r.score, 0));
    }

    // Doubles: doubleIn だったラウンドを戻す
    if (lastRound.doubleIn) {
      setPersonalDoubleIn(false);
      setDoubleInRoundScore(null);
    }

    // NCO カウントを戻す
    if (lastRound.nco) setNcoCount((p) => Math.max(0, p - 1));

    setInputError('');
  };

  const toggleNCO = () => {
    setNcoActive((p) => !p);
  };

  const doFinalize = (
    finalRounds: Round[],
    result: 'win' | 'loss',
    checkoutDart?: 1 | 2 | 3,
    coScore?: number,
    finalPdi = personalDoubleIn,
    finalDiScore = doubleInRoundScore
  ) => {
    // ダブルイン失敗ラウンド（doubleInAttempt）はスタッツから除外
    const scoringRounds = finalRounds.filter((r) => !r.doubleInAttempt);
    const ppr = calcGamePPR(scoringRounds);

    let first9: number | undefined;
    if ((gameType === 'singles' || gameType === 'practice') && scoringRounds.length >= 3) {
      first9 = scoringRounds.slice(0, 3).reduce((s, r) => s + r.score, 0) / 3;
    }

    let hundredPlus = 0, hundredFortyPlus = 0, oneEighty = 0;
    for (const r of scoringRounds) {
      if (r.score === 180) oneEighty++;
      else if (r.score >= 140) hundredFortyPlus++;
      else if (r.score >= 100) hundredPlus++;
    }

    const totalDarts = scoringRounds.reduce((s, r) => s + r.darts, 0);
    const shortDarts = result === 'win' && gameType === 'singles' && totalDarts <= 21;
    const highOut = checkoutDart != null && (coScore ?? 0) >= 100;
    const highStart =
      gameType === 'doubles' && finalPdi && finalDiScore != null && finalDiScore >= 100;

    const game: Game = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: gameType,
      date: new Date().toISOString(),
      result,
      rounds: finalRounds,                                          // 全ラウンド保存（ぽっち表示用）
      ...(checkoutDart != null ? { checkoutDart } : {}),
      noCheckouts: ncoCount,
      totalPoints: scoringRounds.reduce((s, r) => s + r.score, 0), // 失敗ラウンド除外
      totalDarts,                                                   // 失敗ラウンド除外
      ppr,
      ...(first9 != null ? { first9 } : {}),
      personalDoubleIn: finalPdi,
      awards: { hundredPlus, hundredFortyPlus, oneEighty, shortDarts, highOut, highStart },
    };

    onLegSave(game);

    if (gameType === 'gallon') {
      onMatchComplete();
      setPhase('select');
      return;
    }

    const newPlayer = playerLegs + (result === 'win' ? 1 : 0);
    const newOpp   = oppLegs   + (result === 'loss' ? 1 : 0);
    setPlayerLegs(newPlayer);
    setOppLegs(newOpp);
    setLastLegResult(result);
    setLegNumber((n) => n + 1);

    if (gameType === 'practice') {
      setPhase('between');
      return;
    }

    if (newPlayer === 2 || newOpp === 2) {
      onMatchComplete();
      setPhase('select');
    } else {
      setPhase('between');
    }
  };

  const handleWin  = () => doFinalize(rounds, 'win');
  const handleLose = () => doFinalize(rounds, 'loss');

  const currentPPR = calcGamePPR(rounds);

  // ─── Select ──────────────────────────────────────────
  if (phase === 'select') return <GameSelect onStart={startGame} />;

  const typeName =
    gameType === 'singles' ? 'Singles'
    : gameType === 'doubles' ? 'Doubles'
    : gameType === 'practice' ? 'Practice'
    : 'Gallon';
  const typeBadge =
    gameType === 'singles'
      ? 'bg-cyan-900 text-cyan-300'
      : gameType === 'doubles'
      ? 'bg-purple-900 text-purple-300'
      : gameType === 'practice'
      ? 'bg-green-900 text-green-300'
      : 'bg-amber-900 text-amber-300';

  // ─── Between legs ────────────────────────────────────
  if (phase === 'between') {
    const isPractice = gameType === 'practice';

    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 bg-zinc-900 px-4 py-2.5 flex items-center gap-2 border-b border-zinc-800">
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeBadge}`}>{typeName}</span>
          <span className="text-zinc-500 text-sm">Leg {legNumber - 1} 終了</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-widest mb-1">Leg {legNumber - 1}</p>
            <p className={`text-3xl font-black ${lastLegResult === 'win' ? 'text-emerald-400' : 'text-red-400'}`}>
              {lastLegResult === 'win' ? 'WIN' : 'LOSE'}
            </p>
          </div>

          {isPractice ? (
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Session</p>
              <p className="text-2xl font-bold text-zinc-300 tabular-nums">
                <span className="text-emerald-400">{playerLegs}W</span>
                <span className="text-zinc-600 mx-2">·</span>
                <span className="text-red-400">{oppLegs}L</span>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-10">
              <div className="text-center">
                <p className="text-xs text-zinc-500 mb-1">You</p>
                <p className={`text-7xl font-black tabular-nums leading-none ${playerLegs > oppLegs ? 'text-emerald-400' : 'text-zinc-300'}`}>
                  {playerLegs}
                </p>
              </div>
              <p className="text-4xl text-zinc-700">-</p>
              <div className="text-center">
                <p className="text-xs text-zinc-500 mb-1">Opp</p>
                <p className={`text-7xl font-black tabular-nums leading-none ${oppLegs > playerLegs ? 'text-red-400' : 'text-zinc-300'}`}>
                  {oppLegs}
                </p>
              </div>
            </div>
          )}

          <div className="w-full space-y-3 mt-4">
            <button
              onClick={startNextLeg}
              className="w-full py-4 rounded-2xl bg-emerald-600 active:bg-emerald-700 font-bold text-lg"
            >
              Leg {legNumber} →
            </button>
            {isPractice ? (
              <button
                onClick={() => {
                  onMatchComplete();
                  resetLegState();
                  setLegNumber(1);
                  setPlayerLegs(0);
                  setOppLegs(0);
                  setPhase('select');
                }}
                className="w-full py-3 rounded-2xl bg-zinc-800 active:bg-zinc-700 font-semibold text-sm text-zinc-300"
              >
                End Session
              </button>
            ) : (
              <button
                onClick={() => {
                  resetLegState();
                  setLegNumber(1);
                  setPlayerLegs(0);
                  setOppLegs(0);
                  setPhase('select');
                }}
                className="w-full py-2 text-zinc-600 text-sm active:text-zinc-400"
              >
                中断する
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Playing ─────────────────────────────────────────
  const isPractice = gameType === 'practice';

  return (
    <div className="flex flex-col h-full">
      {/* Checkout popup */}
      {checkoutPopup && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setCheckoutPopup(false)}
        >
          <div
            className="w-full max-w-sm bg-zinc-900 rounded-t-2xl border-t border-zinc-700 px-5 pt-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-center text-xs text-zinc-500 uppercase tracking-widest mb-1">Check Out</p>
            <p className="text-center text-4xl font-black tabular-nums text-white mb-5">
              {checkoutScore}
            </p>
            <div className="flex gap-3 mb-4">
              {([1, 2, 3] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => checkoutWithDart(d)}
                  className="flex-1 py-5 rounded-2xl bg-emerald-600 active:bg-emerald-500 font-bold text-2xl"
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCheckoutPopup(false)}
              className="w-full py-3 text-zinc-500 text-sm active:text-zinc-300"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 bg-zinc-900 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPhase('select')}
            className="text-zinc-500 active:text-white text-lg leading-none pr-1"
          >
            ←
          </button>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeBadge}`}>{typeName}</span>
          {gameType !== 'gallon' && (
            <span className="text-zinc-600 text-xs">Leg {legNumber}</span>
          )}
          <span className="text-zinc-400 text-sm">R{rounds.length + 1}</span>
        </div>
        <div className="flex items-center gap-3">
          {(gameType === 'singles' || gameType === 'doubles') && (
            <span className="text-xs text-zinc-600">{playerLegs}-{oppLegs}</span>
          )}
          {isPractice && (
            <span className="text-xs text-zinc-600">{playerLegs}W·{oppLegs}L</span>
          )}
          <span className="text-xs text-zinc-500">
            PPR {rounds.length > 0 ? currentPPR.toFixed(1) : '—'}
          </span>
        </div>
      </div>

      {/* Round history */}
      <div className="flex-shrink-0 h-10 bg-zinc-950 flex items-center">
        <div className="flex-1 overflow-x-auto px-4 flex items-center gap-1.5">
          {rounds.length === 0 ? (
            <span className="text-zinc-700 text-xs">スコア履歴</span>
          ) : (
            rounds.slice(-10).map((r, i) => (
              <span
                key={i}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded font-mono ${
                  r.score === 180
                    ? 'bg-yellow-700 text-yellow-100 font-bold'
                    : r.score >= 140
                    ? 'bg-orange-900 text-orange-200'
                    : r.score >= 100
                    ? 'bg-blue-900 text-blue-200'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {r.score}
                {r.doubleIn        && <span className="text-purple-400">●</span>}
                {r.doubleInAttempt && <span className="text-purple-800">●</span>}
                {r.nco             && <span className="text-amber-500">●</span>}
              </span>
            ))
          )}
        </div>
        {rounds.length > 0 && (
          <button
            onClick={handleUndo}
            className="flex-shrink-0 h-full px-3 text-zinc-500 active:text-red-400 border-l border-zinc-800 text-xs font-semibold"
          >
            取消
          </button>
        )}
      </div>

      {/* Input display */}
      <div className="flex-shrink-0 mx-4 mt-2 mb-1 rounded-xl bg-zinc-900 border border-zinc-700 px-4 py-2 flex items-center justify-between">
        {isPractice ? (
          // Practice: 左に残り点数、右に入力値
          <>
            <div>
              <p className="text-xs text-zinc-500 leading-none mb-0.5">残り</p>
              <p className="text-3xl font-black tabular-nums text-zinc-100 leading-none">{remaining}</p>
            </div>
            <span className={`text-4xl font-bold tabular-nums ${bust ? 'text-red-400' : 'text-zinc-400'}`}>
              {bust ? 'BUST!' : (input || '—')}
            </span>
          </>
        ) : (
          // その他: 得点入力のみ
          <>
            <span className="text-zinc-500 text-sm">得点</span>
            <span className={`text-4xl font-bold tabular-nums ${bust ? 'text-red-400' : ''}`}>
              {bust ? 'BUST!' : (input || '—')}
            </span>
          </>
        )}
      </div>
      {inputError && <p className="text-center text-xs text-red-400 mb-1">{inputError}</p>}

      {/* Number pad */}
      <div className="flex-shrink-0 px-4 grid grid-cols-3 gap-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="py-3 rounded-xl bg-zinc-800 active:bg-zinc-600 text-xl font-semibold"
          >
            {d}
          </button>
        ))}
        <button onClick={() => handleDigit('0')} className="py-3 rounded-xl bg-zinc-800 active:bg-zinc-600 text-xl font-semibold">0</button>
        <button onClick={handleDelete} className="py-3 rounded-xl bg-zinc-800 active:bg-zinc-600 text-xl">←</button>
        <button onClick={handleSubmit} className="py-3 rounded-xl bg-zinc-700 active:bg-zinc-500 text-base font-bold text-cyan-300">入力</button>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col gap-2 px-4 pt-2 pb-3 justify-end">
        {(() => {
          const gameOpened = rounds.some((r) => r.score > 0);
          if (gameType !== 'doubles') return null;
          if (personalDoubleIn) {
            return <div className="text-center text-xs text-purple-400 py-1">✓ Double In 済み</div>;
          }
          if (gameOpened) {
            // 相方がオープン済み → ボタン不要
            return <div className="text-center text-xs text-zinc-600 py-1">相方がオープン済み</div>;
          }
          return (
            <button
              onClick={() => setDoubleInPending((p) => !p)}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                doubleInPending
                  ? 'bg-purple-800 border-purple-500 text-white'
                  : 'bg-transparent border-purple-900 text-purple-400'
              }`}
            >
              {doubleInPending ? '● Double In（このラウンドに確定）' : 'Double In'}
            </button>
          );
        })()}

        <button
          onClick={toggleNCO}
          className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
            ncoActive
              ? 'bg-amber-700 border-amber-500 text-white'
              : 'bg-transparent border-zinc-700 text-zinc-400'
          }`}
        >
          No Check Out
        </button>

        <button
          onClick={handleCheckOutPress}
          className="py-3.5 rounded-xl bg-emerald-600 active:bg-emerald-700 font-bold text-base"
        >
          Check Out
        </button>

        {(gameType === 'doubles' || gameType === 'gallon') && (
          <button
            onClick={handleWin}
            className="py-2.5 rounded-xl bg-emerald-950 active:bg-emerald-900 border border-emerald-800 text-emerald-400 font-semibold text-sm"
          >
            Win（チームが上がった）
          </button>
        )}

        <button
          onClick={handleLose}
          className="py-2.5 rounded-xl bg-red-950 active:bg-red-900 border border-red-800 text-red-400 font-semibold text-sm"
        >
          Lose
        </button>
      </div>
    </div>
  );
}

function GameSelect({ onStart }: { onStart: (type: GameType) => void }) {
  return (
    <div className="h-full flex flex-col justify-center px-6 gap-4">
      <div className="text-center mb-2">
        <p className="text-2xl font-bold">New Game</p>
      </div>
      <button onClick={() => onStart('singles')}
        className="w-full py-6 rounded-2xl border-2 border-cyan-800 bg-cyan-950 active:bg-cyan-900 text-left px-6">
        <p className="text-2xl font-bold text-cyan-200">Singles</p>
      </button>
      <button onClick={() => onStart('doubles')}
        className="w-full py-6 rounded-2xl border-2 border-purple-800 bg-purple-950 active:bg-purple-900 text-left px-6">
        <p className="text-2xl font-bold text-purple-200">Doubles</p>
      </button>
      <button onClick={() => onStart('gallon')}
        className="w-full py-6 rounded-2xl border-2 border-amber-800 bg-amber-950 active:bg-amber-900 text-left px-6">
        <p className="text-2xl font-bold text-amber-200">Gallon</p>
      </button>
      <button onClick={() => onStart('practice')}
        className="w-full py-6 rounded-2xl border-2 border-green-800 bg-green-950 active:bg-green-900 text-left px-6">
        <p className="text-2xl font-bold text-green-200">Practice</p>
      </button>
    </div>
  );
}
