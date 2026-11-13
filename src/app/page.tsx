// src/app/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HomeView, type PracticeOptions } from '@/components/home/HomeView';
import { LobbyView } from '@/components/lobby/LobbyView';
import { GameTable } from '@/components/table/GameTable';
import { subscribeToRoom } from '@/lib/realtime/client';
import { LocalGameController } from '@/lib/local/local-game';
import {
  PublicGameState,
  PrivatePlayerState,
  RoomRulesConfig,
  ScoringMode,
  CardColor,
} from '@/types';

const SESSION_KEY = 'uno-arena-session';

interface StoredSession {
  roomId: string;
  roomCode: string;
  playerId: string;
  sessionToken: string;
  reconnectToken: string;
  nickname: string;
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable in private mode; the session still works.
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore.
  }
}

export default function UnoArenaApp() {
  const [view, setView] = useState<'home' | 'lobby' | 'game'>('home');
  const [roomId, setRoomId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [hostPlayerId, setHostPlayerId] = useState<string>('');
  const [maxPlayers, setMaxPlayers] = useState<number>(10);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [reconnectToken, setReconnectToken] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [players, setPlayers] = useState<any[]>([]);
  const [rules, setRules] = useState<RoomRulesConfig>({
    stackingEnabled: false,
    turnTimerSeconds: 30,
    botGracePeriodSeconds: 30,
    targetScore: 500,
  });
  const [scoringMode, setScoringMode] = useState<ScoringMode>('SINGLE_ROUND');
  const [publicGameState, setPublicGameState] = useState<PublicGameState | null>(null);
  const [privatePlayerState, setPrivatePlayerState] = useState<PrivatePlayerState | null>(null);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const restoredRef = useRef(false);
  const localControllerRef = useRef<LocalGameController | null>(null);

  // Check URL search params for ?join=CODE
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) setInitialJoinCode(code.toUpperCase());
  }, []);

  const remember = useCallback(
    (session: StoredSession) => {
      setRoomId(session.roomId);
      setRoomCode(session.roomCode);
      setPlayerId(session.playerId);
      setSessionToken(session.sessionToken);
      setReconnectToken(session.reconnectToken);
      setNickname(session.nickname);
      persistSession(session);
    },
    []
  );

  // Restore a persisted session after a refresh.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const stored = readSession();
    if (!stored) {
      setIsRestoring(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${stored.roomId}/reconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reconnectToken: stored.reconnectToken }),
        });
        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        if (cancelled) return;

        remember({
          ...stored,
          sessionToken: data.sessionToken,
          reconnectToken: data.reconnectToken ?? stored.reconnectToken,
        });
        setHostPlayerId(stored.playerId);
        if (data.publicState) {
          setPublicGameState(data.publicState);
          setPrivatePlayerState(data.privateState ?? null);
          setView('game');
        } else {
          setView('lobby');
        }
      } catch {
        clearSession();
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [remember]);

  // Poll room and private hand. Realtime triggers the same sync immediately.
  const syncState = useCallback(async () => {
    if (!roomId) return;

    try {
      const query = playerId
        ? `?playerId=${encodeURIComponent(playerId)}&sessionToken=${encodeURIComponent(sessionToken)}`
        : '';
      const res = await fetch(`/api/rooms/${roomId}${query}`);
      if (res.status === 404) {
        setView('home');
        setRoomId('');
        setPublicGameState(null);
        setPrivatePlayerState(null);
        clearSession();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();

      setPlayers(data.players || []);
      setHostPlayerId(data.room?.hostPlayerId || '');
      setMaxPlayers(data.room?.maxPlayers ?? 10);
      setRules((previous) => data.room?.rules ?? previous);
      setScoringMode(data.room?.scoringMode || 'SINGLE_ROUND');

      if (data.gameState) {
        setPublicGameState(data.gameState);
        setView((current) => (current === 'lobby' ? 'game' : current));

        if (playerId && sessionToken) {
          const handRes = await fetch(
            `/api/rooms/${roomId}/hand?playerId=${encodeURIComponent(playerId)}&sessionToken=${encodeURIComponent(sessionToken)}`
          );
          if (handRes.ok) {
            setPrivatePlayerState(await handRes.json());
          }
        }
      }
    } catch {
      // Ignore network jitter; the next poll retries.
    }
  }, [roomId, playerId, sessionToken]);

  // Polling fallback + immediate sync while in a room.
  useEffect(() => {
    if (view === 'home' || !roomId || isRestoring) return;

    void syncState();
    const timer = setInterval(() => void syncState(), 4000);
    const onFocus = () => void syncState();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [view, roomId, syncState, isRestoring]);

  // Supabase Realtime broadcast subscription.
  useEffect(() => {
    if (!roomId || view === 'home') return;
    return subscribeToRoom(roomId, () => void syncState());
  }, [roomId, view, syncState]);

  // Entering the table prefers landscape on phones. Browsers that refuse the
  // request (no fullscreen, no Screen Orientation API) fall back to the overlay.
  useEffect(() => {
    if (view !== 'game') return;
    // `lock` is not in the standard DOM lib even where browsers implement it.
    const orientation =
      typeof screen !== 'undefined'
        ? (screen.orientation as ScreenOrientation & {
            lock?: (mode: 'landscape') => Promise<void>;
          })
        : undefined;
    if (!orientation?.lock) return;

    void orientation.lock('landscape').catch(() => {});
    return () => {
      try {
        orientation.unlock?.();
      } catch {
        // Unlocking is best-effort.
      }
    };
  }, [view]);

  // Local games own timers and listeners; release them with the component.
  useEffect(
    () => () => {
      localControllerRef.current?.destroy();
      localControllerRef.current = null;
    },
    []
  );

  // Best-effort leave on tab close/refresh.
  useEffect(() => {
    if (isLocalMode || !roomId || !playerId || !sessionToken) return;
    const onUnload = () => {
      void fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, sessionToken }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [roomId, playerId, sessionToken, isLocalMode]);

  const handleCreateRoom = async (params: {
    nickname: string;
    maxPlayers: number;
    scoringMode: ScoringMode;
    targetScore: number;
    rules: RoomRulesConfig;
  }) => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');

      remember({
        roomId: data.room.id,
        roomCode: data.room.roomCode,
        playerId: data.player.id,
        sessionToken: data.sessionToken,
        reconnectToken: data.reconnectToken,
        nickname: data.player.nickname,
      });
      setHostPlayerId(data.room.hostPlayerId);
      setMaxPlayers(data.room.maxPlayers);
      setPlayers([data.player]);
      setRules(data.room.rules);
      setScoringMode(params.scoringMode);
      setPublicGameState(null);
      setPrivatePlayerState(null);
      setView('lobby');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleJoinRoom = async (code: string, playerNickname: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, nickname: playerNickname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join room');

      remember({
        roomId: data.room.id,
        roomCode: data.room.roomCode,
        playerId: data.player.id,
        sessionToken: data.sessionToken,
        reconnectToken: data.reconnectToken,
        nickname: data.player.nickname,
      });
      setPlayers([data.player]);
      setPublicGameState(null);
      setPrivatePlayerState(null);
      setView('lobby');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleQuickBotPractice = (params: PracticeOptions) => {
    setErrorMsg(null);
    localControllerRef.current?.destroy();
    clearSession();

    const controller = new LocalGameController({
      nickname: params.nickname,
      botCount: params.botCount,
      difficulty: params.difficulty,
      personality: params.personality,
      scoringMode: params.scoringMode,
      targetScore: params.targetScore,
      rules: params.rules,
    });
    localControllerRef.current = controller;

    const update = () => {
      const snapshot = controller.getSnapshot();
      setPublicGameState(snapshot.publicState);
      setPrivatePlayerState(snapshot.privateState);
      setPlayers(snapshot.publicState.players);
      const error = controller.getLastError();
      if (error) setErrorMsg(error);
    };

    controller.subscribe(update);
    setIsLocalMode(true);
    setRoomId('');
    setRoomCode('LOCAL');
    setPlayerId('local-human');
    setHostPlayerId('local-human');
    setNickname(params.nickname);
    setMaxPlayers(params.botCount + 1);
    setRules(params.rules);
    setScoringMode(params.scoringMode);
    update();
    setView('game');
    controller.start();
  };

  const handleToggleReady = async (isReady: boolean) => {
    if (!roomId || !playerId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, sessionToken, isReady }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update ready state');
      }
      await syncState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleStartGame = async () => {
    if (!roomId || !playerId) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, sessionToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start game');

      setPublicGameState(data.gameState);
      setView('game');
      await syncState();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const sendCommand = async (type: string, payload: any = {}) => {
    if (isLocalMode) {
      const controller = localControllerRef.current;
      if (!controller) return;
      switch (type) {
        case 'PLAY_CARD':
          controller.playCard(payload.cardId, payload.chosenColor, payload.callUno);
          break;
        case 'DRAW_CARD':
          controller.drawCard();
          break;
        case 'PASS_TURN':
          controller.passTurn();
          break;
        case 'CALL_UNO':
          controller.callUno();
          break;
        case 'CATCH_MISSED_UNO':
          controller.catchUno(payload.targetPlayerId);
          break;
        case 'SELECT_COLOR':
          controller.selectColor(payload.color);
          break;
        case 'CHALLENGE_WILD_DRAW_FOUR':
          controller.challenge();
          break;
        case 'ACCEPT_WILD_DRAW_FOUR':
          controller.acceptChallenge();
          break;
        default:
          setErrorMsg('Unsupported local action');
      }
      return;
    }

    if (!roomId || !playerId || !publicGameState) return;

    try {
      const commandId = crypto.randomUUID();
      const res = await fetch(`/api/rooms/${roomId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId,
          playerId,
          sessionToken,
          expectedVersion: publicGameState.version,
          type,
          payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          await syncState();
          return;
        }
        throw new Error(data.error || 'Move rejected');
      }

      setPublicGameState(data.publicState);
      setPrivatePlayerState(data.privateState);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handlePlayCard = (cardId: string, chosenColor?: CardColor, callUno?: boolean) => {
    void sendCommand('PLAY_CARD', { cardId, chosenColor, callUno });
  };
  const handleDrawCard = () => void sendCommand('DRAW_CARD');
  const handlePassTurn = () => void sendCommand('PASS_TURN');
  const handleCallUno = () => void sendCommand('CALL_UNO');
  const handleCatchUno = (targetPlayerId: string) =>
    void sendCommand('CATCH_MISSED_UNO', { targetPlayerId });
  const handleSelectColor = (color: CardColor) =>
    void sendCommand('SELECT_COLOR', { color });
  const handleChallenge = () => void sendCommand('CHALLENGE_WILD_DRAW_FOUR');
  const handleAcceptChallenge = () => void sendCommand('ACCEPT_WILD_DRAW_FOUR');

  const handleNextRound = () => {
    if (isLocalMode) {
      localControllerRef.current?.nextRound();
      return;
    }
    void handleStartGame();
  };

  const handleLeaveRoom = () => {
    if (isLocalMode) {
      localControllerRef.current?.destroy();
      localControllerRef.current = null;
      setIsLocalMode(false);
    } else if (roomId && playerId && sessionToken) {
      void fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, sessionToken }),
        keepalive: true,
      });
    }
    clearSession();
    setView('home');
    setRoomId('');
    setRoomCode('');
    setPlayerId('');
    setHostPlayerId('');
    setSessionToken('');
    setReconnectToken('');
    setPlayers([]);
    setPublicGameState(null);
    setPrivatePlayerState(null);
    setInitialJoinCode('');
    setErrorMsg(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-[#0B101B] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="font-black text-3xl italic tracking-tight">
            <span className="text-red-500">UNO</span>
            <span className="text-yellow-400">ARENA</span>
          </div>
          <p className="text-sm text-neutral-400">Restoring your table…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-950/95 border border-red-700 text-red-100 text-sm shadow-2xl max-w-[92vw]">
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-300 hover:text-white font-black"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {view === 'home' && (
        <HomeView
          key={initialJoinCode || 'home'}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onQuickBotPractice={handleQuickBotPractice}
          initialJoinCode={initialJoinCode}
        />
      )}

      {view === 'lobby' && (
        <LobbyView
          roomCode={roomCode}
          roomId={roomId}
          hostPlayerId={hostPlayerId}
          myPlayerId={playerId}
          maxPlayers={maxPlayers}
          players={players}
          rules={rules}
          scoringMode={scoringMode}
          onToggleReady={handleToggleReady}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {view === 'game' && publicGameState && privatePlayerState && (
        <GameTable
          isHost={hostPlayerId === playerId}
          publicState={publicGameState}
          privateState={privatePlayerState}
          myPlayerId={playerId}
          isLocalMode={isLocalMode}
          onPlayCard={handlePlayCard}
          onDrawCard={handleDrawCard}
          onPassTurn={handlePassTurn}
          onCallUno={handleCallUno}
          onCatchUno={handleCatchUno}
          onSelectColor={handleSelectColor}
          onChallenge={handleChallenge}
          onAcceptChallenge={handleAcceptChallenge}
          onLeaveRoom={handleLeaveRoom}
          onNextRound={handleNextRound}
          onTurnExpired={isLocalMode ? undefined : () => void syncState()}
        />
      )}
    </>
  );
}
