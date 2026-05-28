import { useState } from 'react';
import { Game } from './types';
import { loadGames, saveGames } from './storage';
import Dashboard from './components/Dashboard';
import GameView from './components/GameView';
import History from './components/History';
import Awards from './components/Awards';

type Tab = 'stats' | 'game' | 'history' | 'awards';
type GamePhase = 'select' | 'playing' | 'between';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [games, setGames] = useState<Game[]>(() => loadGames());
  const [gamePhase, setGamePhase] = useState<GamePhase>('select');
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);

  const handleLegSave = (game: Game) => {
    const updated = [...games, game];
    setGames(updated);
    saveGames(updated);
  };

  const handleMatchComplete = () => {
    setActiveTab('game');
  };

  const handleDeleteGame = (id: string) => {
    const updated = games.filter((g) => g.id !== id);
    setGames(updated);
    saveGames(updated);
  };

  const handleAddGame = (game: Game) => {
    const updated = [...games, game].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setGames(updated);
    saveGames(updated);
  };

  const handleTabPress = (tab: Tab) => {
    if (tab === activeTab) return;
    // ゲーム進行中（playing or between）に他タブへ移動しようとした場合
    if (activeTab === 'game' && gamePhase !== 'select') {
      setPendingTab(tab);
      return;
    }
    setActiveTab(tab);
  };

  const confirmLeave = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setGamePhase('select');
    }
    setPendingTab(null);
  };

  const cancelLeave = () => {
    setPendingTab(null);
  };

  return (
    <div className="flex flex-col h-dvh max-w-sm mx-auto bg-zinc-950 text-white select-none pt-[env(safe-area-inset-top)]">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === 'stats' && <Dashboard games={games} />}
        {activeTab === 'game' && (
          <GameView
            onLegSave={handleLegSave}
            onMatchComplete={handleMatchComplete}
            onPhaseChange={setGamePhase}
          />
        )}
        {activeTab === 'history' && <History games={games} onAddGame={handleAddGame} onDeleteGame={handleDeleteGame} />}
        {activeTab === 'awards' && <Awards games={games} />}
      </main>

      <nav className="flex-shrink-0 bg-zinc-900 border-t border-zinc-800 flex pb-[env(safe-area-inset-bottom)]">
        {(
          [
            { id: 'stats', label: 'Stats', icon: '📊' },
            { id: 'game', label: 'Game', icon: '🎯' },
            { id: 'history', label: 'History', icon: '📋' },
            { id: 'awards', label: 'Awards', icon: '🏆' },
          ] as { id: Tab; label: string; icon: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabPress(tab.id)}
            className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400'
                : 'text-zinc-500 active:text-zinc-300'
            }`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* 離脱確認ダイアログ */}
      {pendingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-xs bg-zinc-900 rounded-2xl border border-zinc-700 p-6">
            <p className="text-base font-bold text-center mb-2">ゲームを中断しますか？</p>
            <p className="text-sm text-zinc-400 text-center mb-6">
              入力中のデータは失われます
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelLeave}
                className="flex-1 py-3 rounded-xl bg-zinc-800 active:bg-zinc-700 font-semibold text-sm text-zinc-300"
              >
                戻る
              </button>
              <button
                onClick={confirmLeave}
                className="flex-1 py-3 rounded-xl bg-red-700 active:bg-red-600 font-bold text-sm text-white"
              >
                中断する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
