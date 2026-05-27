import { useState } from 'react';
import { Game, GameType } from '../types';

interface Props {
  onSave: (game: Game) => void;
  onClose: () => void;
}

function NumStepper({
  value,
  onChange,
  min = 0,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
}) {
  const n = parseInt(value, 10) || 0;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(String(Math.max(min, n - 1)))}
        className="w-8 h-8 rounded-lg bg-zinc-700 active:bg-zinc-600 text-lg font-bold flex items-center justify-center"
      >
        −
      </button>
      <span className="w-6 text-center tabular-nums font-semibold">{n}</span>
      <button
        type="button"
        onClick={() => onChange(String(n + 1))}
        className="w-8 h-8 rounded-lg bg-zinc-700 active:bg-zinc-600 text-lg font-bold flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-zinc-400 flex-shrink-0">{label}</span>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function ManualEntry({ onSave, onClose }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [gameType, setGameType] = useState<GameType>('singles');
  const [result, setResult] = useState<'win' | 'loss'>('win');
  const [pprStr, setPprStr] = useState('');
  const [roundsStr, setRoundsStr] = useState('10');
  const [first9Str, setFirst9Str] = useState('');
  // 0 = チームが上がった (doubles/gallon only), 1/2/3 = personal checkout darts
  const [checkoutDart, setCheckoutDart] = useState<0 | 1 | 2 | 3>(3);
  const [personalDoubleIn, setPersonalDoubleIn] = useState(false);
  const [ncoStr, setNcoStr] = useState('0');
  const [h100Str, setH100Str] = useState('0');
  const [h140Str, setH140Str] = useState('0');
  const [h180Str, setH180Str] = useState('0');
  const [highOut, setHighOut] = useState(false);
  const [highStart, setHighStart] = useState(false);
  const [error, setError] = useState('');

  const isTeamGame = gameType === 'doubles' || gameType === 'gallon';
  const personalCheckout = result === 'win' && checkoutDart > 0;

  const handleSave = () => {
    const pprVal = parseFloat(pprStr);
    if (isNaN(pprVal) || pprVal < 0 || pprVal > 180) {
      setError('PPR（0〜180）を入力してください');
      return;
    }

    const roundsVal = Math.max(1, parseInt(roundsStr, 10) || 10);
    const coD = personalCheckout ? (checkoutDart as 1 | 2 | 3) : undefined;

    // totalDarts: subtract saved darts on checkout
    let totalDarts = roundsVal * 3;
    if (coD != null && coD < 3) {
      totalDarts = (roundsVal - 1) * 3 + coD;
    }
    const totalPoints = Math.round((pprVal * totalDarts) / 3);

    const first9Val =
      gameType === 'singles' && first9Str !== '' ? parseFloat(first9Str) : undefined;

    const game: Game = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: gameType,
      date: new Date(date + 'T12:00:00').toISOString(),
      result,
      rounds: [],
      ...(coD != null ? { checkoutDart: coD } : {}),
      noCheckouts: parseInt(ncoStr, 10) || 0,
      totalPoints,
      totalDarts,
      ppr: pprVal,
      ...(first9Val != null ? { first9: first9Val } : {}),
      personalDoubleIn: gameType === 'doubles' ? personalDoubleIn : false,
      awards: {
        hundredPlus: parseInt(h100Str, 10) || 0,
        hundredFortyPlus: parseInt(h140Str, 10) || 0,
        oneEighty: parseInt(h180Str, 10) || 0,
        shortDarts: result === 'win' && (gameType === 'singles' || gameType === 'practice') && totalDarts <= 18,
        highOut: personalCheckout ? highOut : false,
        highStart: gameType === 'doubles' && personalDoubleIn ? highStart : false,
      },
    };

    onSave(game);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-zinc-900 flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800 z-10">
          <h2 className="font-bold text-base">手動入力</h2>
          <button onClick={onClose} className="text-zinc-400 text-2xl leading-none w-8 h-8 flex items-center justify-center">
            ×
          </button>
        </div>

        <div className="px-4 py-3 space-y-4 pb-8">
          {/* Date */}
          <Row label="日付">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
          </Row>

          {/* Game type */}
          <Row label="種別">
            <div className="flex gap-1.5">
              {(['singles', 'doubles', 'gallon', 'practice'] as GameType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setGameType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    gameType === t
                      ? t === 'singles'
                        ? 'bg-cyan-700 text-white'
                        : t === 'doubles'
                        ? 'bg-purple-700 text-white'
                        : t === 'practice'
                        ? 'bg-green-700 text-white'
                        : 'bg-amber-700 text-white'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {t === 'singles' ? 'S' : t === 'doubles' ? 'D' : t === 'practice' ? 'P' : 'G'}
                </button>
              ))}
            </div>
          </Row>

          {/* Result */}
          <Row label="結果">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResult('win')}
                className={`px-4 py-1 rounded-lg text-sm font-bold ${
                  result === 'win' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                WIN
              </button>
              <button
                type="button"
                onClick={() => setResult('loss')}
                className={`px-4 py-1 rounded-lg text-sm font-bold ${
                  result === 'loss' ? 'bg-red-800 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                LOSE
              </button>
            </div>
          </Row>

          {/* PPR */}
          <Row label="PPR">
            <input
              type="number"
              inputMode="decimal"
              placeholder="例: 45.2"
              value={pprStr}
              onChange={(e) => setPprStr(e.target.value)}
              className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
          </Row>

          {/* Rounds */}
          <Row label="ラウンド数">
            <NumStepper value={roundsStr} onChange={setRoundsStr} min={1} />
          </Row>

          {/* Checkout — only if win */}
          {result === 'win' && (
            <Row label="あがり">
              <div className="flex gap-1.5">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCheckoutDart(d as 1 | 2 | 3)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      checkoutDart === d ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {d}本
                  </button>
                ))}
                {isTeamGame && (
                  <button
                    type="button"
                    onClick={() => setCheckoutDart(0)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      checkoutDart === 0 ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Team
                  </button>
                )}
              </div>
            </Row>
          )}

          {/* First 9 — Singles only */}
          {gameType === 'singles' && (
            <Row label="First 9">
              <input
                type="number"
                inputMode="decimal"
                placeholder="例: 55.0"
                value={first9Str}
                onChange={(e) => setFirst9Str(e.target.value)}
                className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
              />
            </Row>
          )}

          {/* Double In — Doubles only */}
          {gameType === 'doubles' && (
            <Row label="Double In">
              <button
                type="button"
                onClick={() => setPersonalDoubleIn((p) => !p)}
                className={`px-4 py-1 rounded-lg text-sm font-bold ${
                  personalDoubleIn ? 'bg-purple-700 text-white' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {personalDoubleIn ? '✓ あり' : 'なし'}
              </button>
            </Row>
          )}

          {/* NCO */}
          <Row label="NCO（トライ回数）">
            <NumStepper value={ncoStr} onChange={setNcoStr} />
          </Row>

          {/* Awards section */}
          <div className="bg-zinc-800 rounded-xl p-3 space-y-3">
            <p className="text-xs text-zinc-500 font-semibold tracking-wide uppercase">アワード</p>
            <Row label="180">
              <NumStepper value={h180Str} onChange={setH180Str} />
            </Row>
            <Row label="140+">
              <NumStepper value={h140Str} onChange={setH140Str} />
            </Row>
            <Row label="100+">
              <NumStepper value={h100Str} onChange={setH100Str} />
            </Row>
            {result === 'win' && personalCheckout && (
              <Row label="High Out">
                <button
                  type="button"
                  onClick={() => setHighOut((p) => !p)}
                  className={`px-4 py-1 rounded-lg text-sm font-bold ${
                    highOut ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {highOut ? '✓ あり' : 'なし'}
                </button>
              </Row>
            )}
            {gameType === 'doubles' && personalDoubleIn && (
              <Row label="High Start">
                <button
                  type="button"
                  onClick={() => setHighStart((p) => !p)}
                  className={`px-4 py-1 rounded-lg text-sm font-bold ${
                    highStart ? 'bg-purple-700 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {highStart ? '✓ あり' : 'なし'}
                </button>
              </Row>
            )}
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-cyan-600 active:bg-cyan-700 font-bold text-base"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
