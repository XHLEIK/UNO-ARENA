'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { GameHeader } from '@/components/table/GameHeader';
import { PlayerSeat } from '@/components/table/PlayerSeat';
import { PlayerHand } from '@/components/table/PlayerHand';
import { DrawPile } from '@/components/table/DrawPile';
import { DiscardPile } from '@/components/table/DiscardPile';
import { GameEffectLayer } from '@/components/table/GameEffectLayer';
import { GameActionBar } from '@/components/table/GameActionBar';
import { WildColorSelector } from '@/components/table/WildColorSelector';
import { DrawFourChallengePanel } from '@/components/table/DrawFourChallengePanel';
import {
  CardPlayFlightLayer,
  type LocalCardOrigin,
} from '@/components/table/CardPlayFlightLayer';
import {
  GameStartSequence,
  type TablePoint,
} from '@/components/table/GameStartSequence';
import { RoundSummaryModal } from '@/components/modals/RoundSummaryModal';
import { PlayerAvatar } from '@/components/table/PlayerAvatar';
import { GameEnvironment } from '@/components/table/GameEnvironment';
import { ReverseEffect } from '@/components/table/ReverseEffect';
import { SkipEffect } from '@/components/table/SkipEffect';
import { RotateDeviceOverlay } from '@/components/table/RotateDeviceOverlay';
import { sounds } from '@/lib/sound/sound-effects';
import {
  CardColor,
  PlayableCard,
  PrivatePlayerState,
  PublicGameState,
} from '@/types';

interface GameTableProps {
  publicState: PublicGameState;
  privateState: PrivatePlayerState;
  myPlayerId: string;
  isHost: boolean;
  isLocalMode?: boolean;
  onPlayCard: (cardId: string, chosenColor?: CardColor, callUno?: boolean) => void;
  onDrawCard: () => void;
  onPassTurn: () => void;
  onCallUno: () => void;
  onCatchUno: (targetPlayerId: string) => void;
  onSelectColor: (color: CardColor) => void;
  onChallenge: () => void;
  onAcceptChallenge: () => void;
  onLeaveRoom: () => void;
  onNextRound?: () => void;
  /** Called once when the online turn clock reaches zero for this client. */
  onTurnExpired?: () => void;
}

function dealSeenKey(gameSessionId: string): string {
  return `uno-arena-deal:${gameSessionId}`;
}

function hasSeenDeal(gameSessionId: string): boolean {
  if (!gameSessionId) return true;
  try {
    return sessionStorage.getItem(dealSeenKey(gameSessionId)) === 'seen';
  } catch {
    return true;
  }
}

export const GameTable: React.FC<GameTableProps> = ({
  publicState,
  privateState,
  myPlayerId,
  isHost,
  isLocalMode = false,
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onCatchUno,
  onSelectColor,
  onChallenge,
  onAcceptChallenge,
  onLeaveRoom,
  onNextRound,
  onTurnExpired,
}) => {
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showDealSequence, setShowDealSequence] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const localPlayOriginRef = useRef<LocalCardOrigin | null>(null);
  const promptedDeadlineRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowDealSequence(!hasSeenDeal(publicState.gameSessionId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [publicState.gameSessionId]);

  const isMyTurn = publicState.currentPlayerId === myPlayerId;
  const me = publicState.players.find((player) => player.id === myPlayerId);
  const canCallUno =
    privateState.canCallUno ||
    (privateState.hand.length === 1 && Boolean(me?.hasMissedUno));
  const currentPlayer = publicState.players.find(
    (player) => player.id === publicState.currentPlayerId
  );

  const opponents = useMemo(() => {
    const everyone = publicState.players;
    const mySeat = everyone.find((player) => player.id === myPlayerId)?.seatNumber ?? 0;
    return everyone
      .filter((player) => player.id !== myPlayerId)
      .sort((a, b) => {
        const distanceA = (a.seatNumber - mySeat + everyone.length) % everyone.length;
        const distanceB = (b.seatNumber - mySeat + everyone.length) % everyone.length;
        return distanceA - distanceB;
      });
  }, [publicState.players, myPlayerId]);

  const seatPoints = useMemo<Record<string, TablePoint>>(() => {
    const points: Record<string, TablePoint> = {
      [myPlayerId]: { x: 50, y: 86 },
    };
    const count = opponents.length;

    if (count === 1) {
      points[opponents[0].id] = { x: 50, y: 11.5 };
      return points;
    }

    if (count === 2) {
      points[opponents[0].id] = { x: 25, y: 11.5 };
      points[opponents[1].id] = { x: 75, y: 11.5 };
      return points;
    }

    if (count === 3) {
      points[opponents[0].id] = { x: 15, y: 42 };
      points[opponents[1].id] = { x: 50, y: 11.5 };
      points[opponents[2].id] = { x: 85, y: 42 };
      return points;
    }

    if (count === 4 || count === 5) {
      const topCount = count === 4 ? 2 : 3;
      const topXs = topCount === 2 ? [34, 66] : [25, 50, 75];
      topXs.forEach((x, index) => {
        points[opponents[index].id] = { x, y: 11.5 };
      });
      points[opponents[topCount].id] = { x: 12.5, y: 42 };
      points[opponents[topCount + 1].id] = { x: 87.5, y: 42 };
      return points;
    }

    const topCount = count % 2 === 0 ? 4 : 3;
    const topXs = topCount === 4 ? [21, 40, 60, 79] : [25, 50, 75];
    topXs.forEach((x, index) => {
      points[opponents[index].id] = { x, y: 11 };
    });

    const sideCount = count - topCount;
    const sidePerColumn = Math.ceil(sideCount / 2);
    const sideYs =
      sidePerColumn >= 3 ? [23, 37, 51] : [30, 50];
    let leftIndex = 0;
    let rightIndex = 0;

    opponents.slice(topCount).forEach((player, index) => {
      const isLeft = index % 2 === 0;
      const row = isLeft ? leftIndex++ : rightIndex++;
      points[player.id] = {
        x: isLeft ? 12.5 : 87.5,
        y: sideYs[row] ?? 46,
      };
    });

    return points;
  }, [myPlayerId, opponents]);

  const compactSeats = opponents.length >= 4;
  const seatScale =
    opponents.length >= 6 ? 0.8 : opponents.length >= 5 ? 0.94 : 1;

  const activeColorHex =
    publicState.activeColor === 'RED'
      ? '#e43b44'
      : publicState.activeColor === 'BLUE'
        ? '#1d7fce'
        : publicState.activeColor === 'GREEN'
          ? '#2f9f4d'
          : '#ffd23f';
  const pendingStack = publicState.pendingStackCount ?? 0;
  const pendingChallenge = publicState.pendingChallenge;
  const lastAction = publicState.lastAction;
  const lastCard =
    lastAction?.type === 'CARD_PLAYED' ? lastAction.card : undefined;
  const skippedPlayerId = lastAction?.skippedPlayerId;
  const skipToken = skippedPlayerId ? lastAction.timestamp : undefined;
  // With two players the engine treats Reverse as Skip; do not show both.
  const reverseActive =
    lastCard?.type === 'REVERSE' && publicState.players.length > 2;
  const reverseToken = reverseActive ? lastAction?.timestamp : undefined;
  const turnDurationMs = (publicState.turnTimerSeconds || 30) * 1000;
  const turnOwnerId =
    publicState.phase === 'WILD_FOUR_CHALLENGE'
      ? pendingChallenge?.challengerPlayerId
      : publicState.phase === 'WILD_COLOR_SELECTION'
        ? publicState.pendingWildSelection?.playerId
        : publicState.currentPlayerId;
  const challengeOpen =
    publicState.phase === 'WILD_FOUR_CHALLENGE' &&
    pendingChallenge?.challengerPlayerId === myPlayerId;
  const wildSelectionOpen =
    publicState.phase === 'WILD_COLOR_SELECTION' &&
    publicState.pendingWildSelection?.playerId === myPlayerId;
  const wildPanelOpen = Boolean(pendingWildCardId) || wildSelectionOpen;

  // The server owns online timeouts. Nudge it with a fresh sync the moment
  // this client's clock hits zero; the deadline key makes the nudge one-shot.
  useEffect(() => {
    if (isLocalMode || !onTurnExpired) return;
    if (turnOwnerId !== myPlayerId || !publicState.turnDeadline) return;

    const deadline = publicState.turnDeadline;
    if (promptedDeadlineRef.current === deadline) return;

    const clockOffset = (publicState.serverNow ?? Date.now()) - Date.now();
    const remaining = deadline - (Date.now() + clockOffset);
    const prompt = () => {
      if (promptedDeadlineRef.current === deadline) return;
      promptedDeadlineRef.current = deadline;
      onTurnExpired();
    };

    if (remaining <= 0) {
      prompt();
      return;
    }

    const id = window.setTimeout(prompt, remaining + 120);
    return () => window.clearTimeout(id);
  }, [
    isLocalMode,
    myPlayerId,
    onTurnExpired,
    publicState.serverNow,
    publicState.turnDeadline,
    turnOwnerId,
  ]);

  const opponentMissedUno = opponents.find(
    (player) => player.hasMissedUno && player.cardCount === 1
  );
  const challengedPlayer = pendingChallenge
    ? publicState.players.find(
        (player) => player.id === pendingChallenge.challengedPlayerId
      )
    : undefined;
  const challengerPlayer = pendingChallenge
    ? publicState.players.find(
        (player) => player.id === pendingChallenge.challengerPlayerId
      )
    : undefined;

  const turnLabel = (() => {
    if (publicState.phase === 'ROUND_FINISHED') return 'Round complete';
    if (publicState.phase === 'MATCH_FINISHED') return 'Match complete';

    if (publicState.phase === 'WILD_COLOR_SELECTION') {
      return wildSelectionOpen
        ? 'Choose a color'
        : `${currentPlayer?.nickname ?? 'Player'} is choosing a color`;
    }

    if (publicState.phase === 'WILD_FOUR_CHALLENGE') {
      return challengeOpen
        ? 'Your challenge decision'
        : `Waiting on ${challengerPlayer?.nickname ?? 'the next player'}`;
    }

    if (publicState.phase === 'DRAW_DECISION') {
      return isMyTurn
        ? 'Play the drawn card or pass'
        : `${currentPlayer?.nickname ?? 'Player'} is deciding`;
    }

    return isMyTurn
      ? 'Your turn'
      : `${currentPlayer?.nickname ?? 'Player'}'s turn`;
  })();

  const captureLocalCardOrigin = (cardId: string) => {
    const card = Array.from(
      document.querySelectorAll<HTMLElement>('[data-hand-card-id]')
    ).find((element) => element.dataset.handCardId === cardId);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    localPlayOriginRef.current = {
      cardId,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const handleCardClick = (card: PlayableCard) => {
    if (!isMyTurn || !card.isPlayable) return;

    if (card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR') {
      setSelectedCardId(card.id);
      setPendingWildCardId(card.id);
      return;
    }

    captureLocalCardOrigin(card.id);
    setSelectedCardId(null);
    sounds.playCardSnap();
    onPlayCard(card.id, undefined, privateState.unoDeclared);
  };

  const handleWildColorSelection = (color: CardColor) => {
    if (pendingWildCardId) {
      captureLocalCardOrigin(pendingWildCardId);
      setPendingWildCardId(null);
      setSelectedCardId(null);
      sounds.playCardSnap();
      onPlayCard(pendingWildCardId, color, privateState.unoDeclared);
      return;
    }

    onSelectColor(color);
  };

  const handleDraw = () => {
    sounds.playDrawCard();
    onDrawCard();
  };

  const handleCallUno = () => {
    sounds.playUnoAlert();
    onCallUno();
  };

  const handleDealComplete = () => {
    setShowDealSequence(false);
    try {
      sessionStorage.setItem(dealSeenKey(publicState.gameSessionId), 'seen');
    } catch {
      // Session storage is optional; the deal has still completed.
    }
  };

  const toggleSound = () => {
    setIsMuted(sounds.toggleMute());
  };

  const roundOver =
    publicState.phase === 'ROUND_FINISHED' ||
    publicState.phase === 'MATCH_FINISHED';

  return (
    <div className="game-shell">
      <GameHeader
        roundNumber={publicState.roundNumber}
        isHost={isHost}
        isLocalMode={isLocalMode}
        isMuted={isMuted}
        onToggleSound={toggleSound}
        onLeaveRoom={onLeaveRoom}
      />

      <main className="game-main">
        <div className="game-stage" ref={stageRef}>
          <GameEnvironment />
          <span className="table-ground-shadow" aria-hidden="true" />
          <span className="table-rim" aria-hidden="true" />
          <div className="felt-table" aria-hidden="true">
            <span className="table-emblem">
              <strong>UNO</strong>
              <small>ARENA</small>
            </span>
          </div>

          {opponents.map((player) => {
            const point = seatPoints[player.id] ?? { x: 50, y: 18 };
            return (
              <div
                key={player.id}
                className="seat-slot"
                data-seat-player-id={player.id}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  '--seat-scale': seatScale,
                } as React.CSSProperties}
              >
                <PlayerSeat
                  player={player}
                  isCurrentTurn={turnOwnerId === player.id}
                  compact={compactSeats}
                  turnDeadline={publicState.turnDeadline}
                  serverNow={publicState.serverNow}
                  turnDurationMs={turnDurationMs}
                  isSkipped={skippedPlayerId === player.id}
                  skipToken={skipToken}
                />
              </div>
            );
          })}

          <div className="table-center">
            <div
              className="turn-readout"
              data-my-turn={isMyTurn ? 'true' : undefined}
              aria-live="polite"
            >
              <span
                className="turn-color-dot"
                style={{ background: activeColorHex, color: activeColorHex }}
                aria-hidden="true"
              />
              <span className="turn-readout-text">{turnLabel}</span>
            </div>

            <div className="piles">
              <DrawPile
                count={publicState.drawPileCount}
                onDraw={handleDraw}
                isMyTurn={isMyTurn}
                canDraw={privateState.canDraw}
                phase={publicState.phase}
              />
              <DiscardPile
                topCard={publicState.topDiscard}
                recentCards={publicState.recentDiscard}
                count={publicState.discardPileCount}
                pendingStack={pendingStack}
                activeColor={publicState.activeColor}
              />
              <ReverseEffect
                active={reverseActive}
                token={reverseToken}
                direction={publicState.direction}
                color={lastCard?.color ?? publicState.activeColor}
              />
            </div>

            <div className="table-meta">
              <span className="inline-flex items-center gap-1.5">
                {publicState.direction === 1 ? (
                  <RotateCw className="h-3 w-3 text-ink-dim" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-3 w-3 text-ink-dim" aria-hidden="true" />
                )}
                <span>
                  {publicState.direction === 1 ? 'Clockwise' : 'Counter-clockwise'}
                </span>
              </span>
              {publicState.phase === 'WILD_FOUR_CHALLENGE' &&
                !challengeOpen &&
                challengerPlayer && (
                  <span className="text-[#ffd58a]">
                    {challengerPlayer.nickname} is deciding
                  </span>
                )}
            </div>

            {pendingStack > 0 && (
              <div className="stack-notice" role="status">
                {isMyTurn ? 'Stack a +2 or draw' : 'Stack pending'} · {pendingStack}{' '}
                cards
              </div>
            )}
          </div>

          <div className="decision-layer">
            <div className="decision-panel-wrap">
              <WildColorSelector
                isOpen={wildPanelOpen}
                onSelectColor={handleWildColorSelection}
              />
              <DrawFourChallengePanel
                isOpen={challengeOpen}
                challengedNickname={challengedPlayer?.nickname ?? 'Opponent'}
                previousColor={pendingChallenge?.previousColor ?? publicState.activeColor}
                timeLimitMs={pendingChallenge?.timeLimitMs ?? 0}
                startedAt={pendingChallenge?.startedAt ?? 0}
                onChallenge={onChallenge}
                onAccept={onAcceptChallenge}
              />
            </div>
          </div>

        </div>

        <div
          className="hand-dock"
          data-dealing={showDealSequence ? 'true' : undefined}
          data-my-turn={isMyTurn ? 'true' : undefined}
        >
          <div className="hand-toolbar">
            <div className="hand-player">
              <div className="hand-avatar-wrap">
                <PlayerAvatar
                  nickname={me?.nickname ?? 'You'}
                  isHost={me?.isHost}
                  isConnected={me?.isConnected}
                  isCurrentTurn={turnOwnerId === myPlayerId}
                  seatNumber={me?.seatNumber ?? 0}
                  size="sm"
                  turnDeadline={publicState.turnDeadline}
                  serverNow={publicState.serverNow}
                  turnDurationMs={turnDurationMs}
                  showTimerValue
                />
                <SkipEffect
                  active={skippedPlayerId === myPlayerId}
                  token={skipToken}
                />
              </div>
              <div className="min-w-0">
                <div className="hand-player-name">
                  {me?.nickname ?? 'You'}
                  <span className="hand-count">
                    {privateState.hand.length}
                    <span className="hand-count-unit">
                      {privateState.hand.length === 1 ? 'card' : 'cards'}
                    </span>
                  </span>
                </div>
                <span className="hand-player-sub">Your hand</span>
              </div>
              {me?.unoDeclared && <span className="hand-uno">UNO</span>}
            </div>

            <GameEffectLayer
              lastAction={publicState.lastAction ?? null}
              playerNicknames={Object.fromEntries(
                publicState.players.map((player) => [player.id, player.nickname])
              )}
              pendingStack={pendingStack}
            />

            <div className="hand-actions">
              <GameActionBar
                phase={publicState.phase}
                isMyTurn={isMyTurn}
                canCallUno={canCallUno}
                unoDeclared={privateState.unoDeclared}
                canPass={privateState.canPass}
                canDraw={privateState.canDraw}
                catchTargetPlayerId={opponentMissedUno?.id ?? null}
                catchTargetNickname={opponentMissedUno?.nickname ?? ''}
                onCallUno={handleCallUno}
                onCatchUno={onCatchUno}
                onPassTurn={onPassTurn}
                onDraw={handleDraw}
              />
            </div>
          </div>

          <PlayerHand
            hand={privateState.hand}
            drawnCardId={privateState.drawnCardId}
            selectedCardId={selectedCardId}
            isMyTurn={isMyTurn}
            onCardClick={handleCardClick}
          />
        </div>

        {showDealSequence && (
          <GameStartSequence
            isOpen
            publicState={publicState}
            privateState={privateState}
            myPlayerId={myPlayerId}
            seatPoints={seatPoints}
            onComplete={handleDealComplete}
          />
        )}
      </main>

      <CardPlayFlightLayer
        lastAction={publicState.lastAction}
        myPlayerId={myPlayerId}
        stageRef={stageRef}
        localOriginRef={localPlayOriginRef}
      />

      <RotateDeviceOverlay />

      <RoundSummaryModal
        isOpen={roundOver}
        isHost={isHost}
        winnerNickname={
          publicState.players.find((player) => player.id === publicState.winnerPlayerId)?.nickname ??
          'Winner'
        }
        isMatchOver={publicState.phase === 'MATCH_FINISHED'}
        scoringMode={publicState.scoringMode}
        targetScore={publicState.targetScore}
        players={publicState.players}
        onNextRound={() => onNextRound?.()}
        onLeaveRoom={onLeaveRoom}
      />
    </div>
  );
};
