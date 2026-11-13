'use client';

import React, { useMemo, useState } from 'react';
import {
  Bot,
  Clock3,
  Hash,
  Layers3,
  LogIn,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { UnoCardRenderer } from '@/components/card/UnoCardRenderer';
import {
  BotDifficulty,
  BotPersonality,
  RoomRulesConfig,
  ScoringMode,
  UnoCard,
} from '@/types';
import {
  Badge,
  Brand,
  Button,
  Input,
  SegmentedControl,
  Select,
  Switch,
} from '@/components/ui';
import { RoomCodeInput } from '@/components/ui/RoomCodeInput';

export interface PracticeOptions {
  nickname: string;
  botCount: number;
  difficulty: BotDifficulty;
  personality: BotPersonality;
  scoringMode: ScoringMode;
  targetScore: number;
  rules: RoomRulesConfig;
}

interface HomeViewProps {
  onCreateRoom: (params: {
    nickname: string;
    maxPlayers: number;
    scoringMode: ScoringMode;
    targetScore: number;
    rules: RoomRulesConfig;
  }) => void;
  onJoinRoom: (roomCode: string, nickname: string) => void;
  onQuickBotPractice: (params: PracticeOptions) => void;
  initialJoinCode?: string;
}

type HomeTab = 'create' | 'join' | 'practice';

const SCORE_OPTIONS = [200, 300, 500].map((score) => ({
  value: String(score),
  label: `${score} points`,
}));

const PLAYER_OPTIONS = Array.from({ length: 9 }, (_, index) => {
  const count = index + 2;
  return {
    value: String(count),
    label: `${count} players`,
    description: count === 10 ? 'Full table' : undefined,
  };
});

const BOT_OPTIONS = Array.from({ length: 9 }, (_, index) => {
  const bots = index + 1;
  return {
    value: String(bots),
    label: `${bots} ${bots === 1 ? 'bot' : 'bots'}`,
    description: `${bots + 1} players total`,
  };
});

const PERSONALITY_OPTIONS = [
  { value: 'BALANCED', label: 'Balanced', description: 'Mixes safe plays with calculated risks.' },
  { value: 'STRATEGIST', label: 'Strategist', description: 'Protects wilds and weaponizes timing.' },
  { value: 'AGGRESSOR', label: 'Aggressor', description: 'Punishes every opening immediately.' },
  { value: 'DEFENSIVE', label: 'Defensive', description: 'Holds power cards and avoids attention.' },
  { value: 'UNPREDICTABLE', label: 'Unpredictable', description: 'Impossible to read. Good luck.' },
];

const SCORING_OPTIONS: Array<{ value: ScoringMode; label: string; hint: string }> = [
  { value: 'SINGLE_ROUND', label: 'Single round', hint: 'One deal' },
  { value: 'CUMULATIVE', label: 'Race to finish', hint: 'First to target' },
];

const SCENE_CARDS: UnoCard[] = [
  { id: 'scene-wild', color: null, type: 'WILD_DRAW_FOUR', value: null, scoreValue: 50 },
  { id: 'scene-red', color: 'RED', type: 'NUMBER', value: 7, scoreValue: 7 },
  { id: 'scene-skip', color: 'BLUE', type: 'SKIP', value: null, scoreValue: 20 },
  { id: 'scene-green', color: 'GREEN', type: 'DRAW_TWO', value: null, scoreValue: 20 },
];

function playerLabel(count: number): string {
  return `${count} ${count === 1 ? 'player' : 'players'}`;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  onQuickBotPractice,
  initialJoinCode = '',
}) => {
  const [tab, setTab] = useState<HomeTab>(initialJoinCode ? 'join' : 'create');
  const [nickname, setNickname] = useState('Player 1');
  const [roomCode, setRoomCode] = useState(initialJoinCode.toUpperCase());
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [botCount, setBotCount] = useState('3');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('SINGLE_ROUND');
  const [targetScore, setTargetScore] = useState('500');
  const [stackingEnabled, setStackingEnabled] = useState(false);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState('30');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('MEDIUM');
  const [botPersonality, setBotPersonality] = useState<BotPersonality>('BALANCED');
  const [rulesOpen, setRulesOpen] = useState(false);

  const targetScoreValue = Number(targetScore);
  const commonRules = useMemo<RoomRulesConfig>(
    () => ({
      stackingEnabled,
      turnTimerSeconds: Number(turnTimerSeconds),
      botGracePeriodSeconds: 30,
      targetScore: targetScoreValue,
    }),
    [stackingEnabled, targetScoreValue, turnTimerSeconds]
  );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    onCreateRoom({
      nickname: nickname.trim() || 'Player 1',
      maxPlayers: Number(maxPlayers),
      scoringMode,
      targetScore: targetScoreValue,
      rules: commonRules,
    });
  };

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    onJoinRoom(code, nickname.trim() || 'Player 2');
  };

  const handlePractice = (event: React.FormEvent) => {
    event.preventDefault();
    onQuickBotPractice({
      nickname: nickname.trim() || 'Player 1',
      botCount: Number(botCount),
      difficulty: botDifficulty,
      personality: botPersonality,
      scoringMode,
      targetScore: targetScoreValue,
      rules: commonRules,
    });
  };

  const tabButton = (value: HomeTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      data-active={tab === value}
      className="home-tab"
      onClick={() => setTab(value)}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="home-shell">
      <header className="home-header">
        <Brand />
        <div className="flex items-center gap-2">
          <Badge variant="success" className="hidden sm:inline-flex">
            Live tables
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRulesOpen(true)}
            className="gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            How to play
          </Button>
        </div>
      </header>

      <main className="home-main">
        <div className="home-hero">
          <section className="home-copy">
            <div className="home-kicker">Real-time multiplayer UNO</div>
            <h1 className="home-title">
              Play the table.
              <span className="accent-line">Own the night.</span>
            </h1>
            <p className="home-description">
              A private room, a real deck, and the friends who always say
              &ldquo;one more game.&rdquo; Create a table, share the code, and
              let the cards do the talking.
            </p>

            <div className="home-card-scene" aria-hidden="true">
              {SCENE_CARDS.map((card) => (
                <div key={card.id} className="scene-card">
                  <UnoCardRenderer card={card} size="lg" />
                </div>
              ))}
              <span className="scene-caption">108 cards / no mercy</span>
            </div>

            <div className="home-facts">
              <span>
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> 2–10 players
              </span>
              <span>
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Live turns
              </span>
              <span>
                <Layers3 className="h-3.5 w-3.5" aria-hidden="true" /> +2 stacking
              </span>
            </div>
          </section>

          <section className="home-panel" aria-label="Play UNO Arena">
            <div className="home-panel-heading">
              <div>
                <span className="eyebrow">Choose your table</span>
                <h2 className="home-panel-title">Ready when you are.</h2>
                <p className="home-panel-subtitle">
                  No account. No download. Just a room code.
                </p>
              </div>
              <Sparkles className="mt-1 h-4 w-4 shrink-0 text-accent/70" aria-hidden="true" />
            </div>

            <div className="home-tabs" role="tablist" aria-label="Play mode">
              {tabButton('create', 'Create', <Plus aria-hidden="true" />)}
              {tabButton('join', 'Join', <LogIn aria-hidden="true" />)}
              {tabButton('practice', 'Practice', <Bot aria-hidden="true" />)}
            </div>

            {tab === 'create' && (
              <form className="home-form" onSubmit={handleCreate}>
                <Input
                  label="Your name"
                  value={nickname}
                  maxLength={32}
                  autoComplete="nickname"
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="What should the table call you?"
                />

                <div className="home-form-row">
                  <Select
                    label="Table size"
                    value={maxPlayers}
                    options={PLAYER_OPTIONS}
                    onChange={setMaxPlayers}
                  />
                  <Select
                    label="Turn timer"
                    value={turnTimerSeconds}
                    options={[
                      { value: '15', label: '15 seconds' },
                      { value: '30', label: '30 seconds' },
                      { value: '60', label: '60 seconds' },
                    ]}
                    onChange={setTurnTimerSeconds}
                  />
                </div>

                <SegmentedControl<ScoringMode>
                  label="Match length"
                  ariaLabel="Match length"
                  value={scoringMode}
                  options={SCORING_OPTIONS}
                  onChange={setScoringMode}
                  columns={2}
                />

                {scoringMode === 'CUMULATIVE' && (
                  <Select
                    label="Target score"
                    value={targetScore}
                    options={SCORE_OPTIONS}
                    onChange={setTargetScore}
                  />
                )}

                <Switch
                  label="+2 stacking"
                  description="Stack a Draw Two on a pending Draw Two to pass the penalty on."
                  checked={stackingEnabled}
                  onChange={setStackingEnabled}
                />

                <div className="home-rules">
                  <strong>House rules:</strong> Wild Draw Four challenges are on.
                  Drawn cards can be played immediately. +4 stacking stays off.
                </div>

                <div className="home-form-actions">
                  <Button type="submit" size="lg" className="w-full">
                    Create a room <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <p className="home-footnote">
                    You&apos;ll get a 6-character code to share with your table.
                  </p>
                </div>
              </form>
            )}

            {tab === 'join' && (
              <form className="home-form" onSubmit={handleJoin}>
                <div className="grid gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-dim">
                    Room code
                  </span>
                  <RoomCodeInput
                    value={roomCode}
                    onChange={setRoomCode}
                    disabled={Boolean(initialJoinCode)}
                  />
                  <span className="text-center text-[10px] leading-relaxed text-ink-dim">
                    Ask the host for the 6-character code from their lobby.
                  </span>
                </div>

                <Input
                  label="Your name"
                  value={nickname}
                  maxLength={32}
                  autoComplete="nickname"
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="What should the table call you?"
                />

                <div className="home-form-actions">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={roomCode.trim().length !== 6}
                  >
                    Join the table <LogIn className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <p className="home-footnote">
                    <Hash className="h-3 w-3" aria-hidden="true" /> Rooms are private
                    and expire when everyone leaves.
                  </p>
                </div>
              </form>
            )}

            {tab === 'practice' && (
              <form className="home-form" onSubmit={handlePractice}>
                <Input
                  label="Your name"
                  value={nickname}
                  maxLength={32}
                  autoComplete="nickname"
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="What should the table call you?"
                />

                <div className="home-form-row">
                  <Select
                    label="Opponents"
                    value={botCount}
                    options={BOT_OPTIONS}
                    onChange={setBotCount}
                  />
                  <Select
                    label="Bot personality"
                    value={botPersonality}
                    options={PERSONALITY_OPTIONS}
                    onChange={(value) => setBotPersonality(value as BotPersonality)}
                  />
                </div>

                <SegmentedControl<BotDifficulty>
                  label="Difficulty"
                  ariaLabel="Bot difficulty"
                  value={botDifficulty}
                  options={[
                    { value: 'EASY', label: 'Easy', hint: 'Warm-up' },
                    { value: 'MEDIUM', label: 'Medium', hint: 'Fair fight' },
                    { value: 'HARD', label: 'Hard', hint: 'No mercy' },
                  ]}
                  onChange={setBotDifficulty}
                  columns={3}
                />

                <SegmentedControl<ScoringMode>
                  label="Match length"
                  ariaLabel="Practice match length"
                  value={scoringMode}
                  options={SCORING_OPTIONS}
                  onChange={setScoringMode}
                  columns={2}
                />

                {scoringMode === 'CUMULATIVE' && (
                  <Select
                    label="Target score"
                    value={targetScore}
                    options={SCORE_OPTIONS}
                    onChange={setTargetScore}
                  />
                )}

                <Switch
                  label="+2 stacking"
                  description="Practice the same house rule you play online."
                  checked={stackingEnabled}
                  onChange={setStackingEnabled}
                />

                <div className="home-form-actions">
                  <Button type="submit" size="lg" className="w-full">
                    Deal me in <Bot className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <p className="home-footnote">
                    Plays instantly in this browser. {playerLabel(Number(botCount) + 1)} at
                    the table.
                  </p>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>

      <footer className="home-footer">
        <span>UNO Arena / private tables</span>
        <span>Built for the group chat</span>
      </footer>

      {rulesOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#03070b]/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rules-title"
          onClick={() => setRulesOpen(false)}
        >
          <div
            className="home-panel max-h-[88dvh] w-full max-w-[560px] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="eyebrow">The short version</span>
                <h2 id="rules-title" className="home-panel-title mt-1">
                  How to play
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setRulesOpen(false)}
                aria-label="Close rules"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 text-sm leading-relaxed text-ink-muted">
              <p>
                Match the top discard by <strong className="text-white">color</strong>,{' '}
                <strong className="text-white">number</strong>, or{' '}
                <strong className="text-white">symbol</strong>. If you can&apos;t
                play, draw from the pile. A drawn card can be played immediately.
              </p>
              <div className="grid gap-2 rounded-xl border border-white/[0.08] bg-black/20 p-3 text-xs">
                <p><strong className="text-white">Skip</strong> — the next player loses their turn.</p>
                <p><strong className="text-white">Reverse</strong> — turn order flips.</p>
                <p><strong className="text-white">Draw Two</strong> — next player draws 2 and loses their turn.</p>
                <p><strong className="text-white">Wild</strong> — choose the active color.</p>
                <p><strong className="text-white">Wild Draw Four</strong> — choose a color and send 4 cards. The next player may challenge it.</p>
              </div>
              <p>
                A Wild Draw Four is only legal when you hold no card matching the
                active color. A successful challenge makes the player draw 4; a
                failed challenge costs the challenger 6.
              </p>
              <p>
                Call <strong className="text-accent">UNO</strong> when you play
                your second-to-last card. If an opponent catches you first, you
                draw 2 penalty cards.
              </p>
              <p className="text-xs text-ink-dim">
                House rule: +2 stacking is optional and set by the host. +4 stacking
                is not enabled in this arena.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
