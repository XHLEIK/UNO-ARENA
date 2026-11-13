'use client';

import React, { useState } from 'react';
import { runBotSimulation, SimulationConfig, SimulationStats } from '@/lib/simulation/bot-simulation';

export default function BotSimulationPage() {
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [running, setRunning] = useState(false);
  const [matches, setMatches] = useState(200);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const config: SimulationConfig = {
        matches,
        playerCount: 4,
        difficulty: 'MEDIUM',
        personality: 'BALANCED',
        stackingEnabled: false,
        scoringMode: 'SINGLE_ROUND',
        targetScore: 500,
        seedBase: 1,
      };
      setStats(runBotSimulation(config));
      setRunning(false);
    }, 50);
  };

  return (
    <main className="min-h-screen bg-[#0B101B] text-white p-8">
      <h1 className="text-2xl font-black mb-4">Bot Simulation Lab (Dev Only)</h1>
      <div className="flex items-center gap-3 mb-6">
        <input
          type="number"
          value={matches}
          onChange={(e) => setMatches(Number(e.target.value))}
          className="px-3 py-2 rounded bg-neutral-800 border border-white/20"
        />
        <button
          onClick={run}
          disabled={running}
          className="px-4 py-2 rounded bg-yellow-400 text-black font-bold disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run'}
        </button>
      </div>
      {stats && (
        <pre className="bg-neutral-900 p-4 rounded-xl text-sm overflow-auto">
          {JSON.stringify(stats, null, 2)}
        </pre>
      )}
    </main>
  );
}
