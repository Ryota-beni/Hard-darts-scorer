import { useState } from 'react';
import { Game } from './types';
import { loadGames, saveGames } from './storage';
import Dashboard from './components/Dashboard';
import GameView from './components/GameView';
import History from './components/History';
import Awards from './components/Awards';

type Tab = 'stats' | 'game' | 'history' | 'awards';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [games, setGames] = useState<Game[]>(() => loadGames());

  const handleLegSave = (game: Game) => {
    const updated = [...games, game];
    setGames(updated);
    saveGames(updated);
  };

  const handleMatchComplete = () => {
    setActiveTab('stats');
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

  return (
    <div className="flex flex-col h-dvh max-w-sm mx-auto bg-zinc-950 text-white select-none pt-[env(safe-area-inset-top)]">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === 'stats' && <Dashboard games={games} />}
        {activeTab === 'game' && <GameView onLegSave={handleLegSave} onMatchComplete={handleMatchComplete} />}
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
            onClick={() => setActiveTab(tab.id)}
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
    </div>
  );
}
