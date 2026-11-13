'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Clock3,
  Copy,
  Crown,
  Layers3,
  LogOut,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge, Brand, Button } from '@/components/ui';
import { PlayerAvatar } from '@/components/table/PlayerAvatar';
import { RoomRulesConfig, ScoringMode } from '@/types';

interface LobbyViewProps {
  roomCode: string;
  roomId: string;
  hostPlayerId: string;
  myPlayerId: string;
  maxPlayers: number;
  players: {
    id: string;
    nickname: string;
    seatNumber: number;
    isReady: boolean;
    isConnected: boolean;
    isHost: boolean;
    isBot?: boolean;
  }[];
  rules: RoomRulesConfig;
  scoringMode: ScoringMode;
  onToggleReady: (isReady: boolean) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomCode,
  hostPlayerId,
  myPlayerId,
  maxPlayers,
  players,
  rules,
  scoringMode,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = myPlayerId === hostPlayerId;
  const me = players.find((player) => player.id === myPlayerId);
  const canStart = isHost && players.length >= 2;
  const openSeats = Math.max(0, maxPlayers - players.length);
  const allReady =
    players.length >= 2 && players.every((player) => player.isReady || player.isHost);

  const copyInviteLink = async () => {
    const url = `${window.location.origin}/?join=${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="lobby-shell safe-top">
      <header className="game-header">
        <div className="game-header-side">
          <Brand compact />
          <Badge variant="accent">Lobby</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onLeaveRoom} className="gap-1.5">
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Leave room</span>
        </Button>
      </header>

      <main className="lobby-main">
        <div className="lobby-left">
          <motion.section
            className="lobby-panel lobby-invite"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="eyebrow">Private table</span>
                <h1 className="mt-2 font-display text-[clamp(30px,4vw,44px)] font-black leading-[0.95] tracking-[-0.055em] text-white">
                  Your table is open.
                </h1>
                <p className="mt-2 max-w-[360px] text-xs leading-relaxed text-ink-muted">
                  Share the code and keep the group chat close. The match starts
                  when the host deals.
                </p>
              </div>
              <Badge variant="neutral">
                {players.length}/{maxPlayers} seated
              </Badge>
            </div>

            <div className="lobby-code" aria-label={`Room code ${roomCode}`}>
              {roomCode}
            </div>
            <p className="lobby-code-hint">
              {openSeats > 0
                ? `${openSeats} ${openSeats === 1 ? 'seat' : 'seats'} still open.`
                : 'The table is full.'}{' '}
              Anyone with this code can join.
            </p>

            <div className="lobby-invite-actions">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={copyInviteLink}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? 'Invite copied' : 'Copy invite link'}
              </Button>
              <span className="font-mono text-[9px] text-ink-dim">
                uno-arena / {roomCode}
              </span>
            </div>
          </motion.section>

          <section className="lobby-panel">
            <div className="lobby-status">
              <div>
                <h2 className="lobby-status-title">At the table</h2>
                <span className="lobby-status-meta">
                  {allReady ? 'Everyone is ready' : 'Waiting for the table'}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-ink-dim">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {players.length}/{maxPlayers}
              </span>
            </div>

            <div className="player-grid">
              {players.map((player, index) => {
                const isMe = player.id === myPlayerId;
                return (
                  <motion.div
                    key={player.id}
                    className="lobby-player"
                    data-me={isMe ? 'true' : undefined}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04, duration: 0.25 }}
                  >
                    <PlayerAvatar
                      nickname={player.nickname}
                      isHost={player.isHost}
                      isBot={player.isBot}
                      isConnected={player.isConnected}
                      seatNumber={player.seatNumber}
                      size="md"
                    />
                    <div className="lobby-player-copy">
                      <div className="lobby-player-name">
                        <span>{player.nickname}</span>
                        {isMe && <span className="text-ink-dim">(you)</span>}
                      </div>
                      <div className="lobby-player-meta">
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{
                            background: player.isConnected
                              ? 'var(--success)'
                              : 'var(--fg-dim)',
                          }}
                          aria-hidden="true"
                        />
                        {player.isConnected ? 'Online' : 'Offline'}
                        <span className="text-ink-dim/70">·</span>
                        Seat {player.seatNumber + 1}
                        {player.isHost && (
                          <Crown className="h-3 w-3 text-accent" aria-label="Host" />
                        )}
                        {player.isBot && <Badge variant="info">Bot</Badge>}
                      </div>
                    </div>
                    <span
                      className="lobby-player-ready"
                      data-ready={player.isReady ? 'true' : undefined}
                    >
                      {player.isReady ? 'Ready' : 'Waiting'}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {openSeats > 0 && (
              <p className="mt-4 flex items-center gap-1.5 text-[10px] leading-relaxed text-ink-dim">
                <Sparkles className="h-3 w-3 text-accent/70" aria-hidden="true" />
                Open seats stay available until the host starts the match.
              </p>
            )}
          </section>
        </div>

        <aside className="lobby-right">
          <section className="lobby-panel">
            <span className="eyebrow">Match settings</span>
            <h2 className="lobby-status-title mt-2">House rules</h2>
            <div className="settings-grid mt-4">
              <div className="setting-tile">
                <span>Scoring</span>
                <strong>
                  {scoringMode === 'CUMULATIVE' ? 'Cumulative' : 'Single round'}
                </strong>
                {scoringMode === 'CUMULATIVE' && (
                  <span className="text-accent">{rules.targetScore} points</span>
                )}
              </div>
              <div className="setting-tile">
                <span>Turn timer</span>
                <strong>{rules.turnTimerSeconds}s</strong>
              </div>
              <div className="setting-tile">
                <span>+2 stacking</span>
                <strong className={rules.stackingEnabled ? 'text-[#75e69b]' : ''}>
                  {rules.stackingEnabled ? 'Enabled' : 'Off'}
                </strong>
              </div>
              <div className="setting-tile">
                <span>Deck</span>
                <strong>108 cards</strong>
              </div>
            </div>
            <div className="mt-4 grid gap-2 rounded-xl border border-white/[0.08] bg-black/15 p-3 text-[10px] leading-relaxed text-ink-dim">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3 text-[#75e69b]" aria-hidden="true" />
                Wild Draw Four challenges enabled
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers3 className="h-3 w-3 text-accent" aria-hidden="true" />
                +4 stacking is intentionally off
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                Bots get a {rules.botGracePeriodSeconds}s grace period
              </span>
            </div>
          </section>

          <section className="lobby-panel">
            {isHost ? (
              <>
                <div className="lobby-status">
                  <div>
                    <h2 className="lobby-status-title">Ready to deal?</h2>
                    <span className="lobby-status-meta">
                      {players.length < 2
                        ? 'Invite at least one more player'
                        : allReady
                          ? 'The table is ready'
                          : 'You can start once players are in'}
                    </span>
                  </div>
                  <Badge variant={canStart ? 'success' : 'neutral'}>
                    {canStart ? 'Ready' : 'Waiting'}
                  </Badge>
                </div>

                <div className="lobby-actions">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={!canStart}
                    onClick={onStartGame}
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    {canStart ? 'Start match' : 'Waiting for players'}
                  </Button>
                  {!me?.isReady && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="w-full"
                      onClick={() => onToggleReady(true)}
                    >
                      Mark yourself ready
                    </Button>
                  )}
                  <p className="lobby-host-note">
                    The host controls the first deal. Everyone else sees the table
                    the moment it starts.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="lobby-status">
                  <div>
                    <h2 className="lobby-status-title">Waiting for the host</h2>
                    <span className="lobby-status-meta">
                      {me?.isReady ? 'You are ready to play' : 'Mark ready when you are'}
                    </span>
                  </div>
                  <Badge variant={me?.isReady ? 'success' : 'neutral'}>
                    {me?.isReady ? 'Ready' : 'Waiting'}
                  </Badge>
                </div>
                <div className="lobby-actions">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    variant={me?.isReady ? 'secondary' : 'primary'}
                    onClick={() => onToggleReady(!me?.isReady)}
                  >
                    {me?.isReady ? 'Mark as not ready' : 'Ready up'}
                  </Button>
                  <p className="lobby-host-note">
                    The host will start the match when everyone is in.
                  </p>
                </div>
              </>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
};
