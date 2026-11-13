# UNO ARENA — Online Bot Architecture

## 1. Overview
Online games are server-authoritative through Next.js API routes and Supabase PostgreSQL.

## 2. Bot execution
- Bot turns are drained synchronously inside room mutations via `runBotTurns` in `src/lib/server/room-store.ts`.
- Consecutive bot turns (including Wild color selection, challenges, UNO catches) execute until a connected human turn or game end.
- Disconnected humans are covered by the bot engine until reconnect.

## 3. Safety
- Version checks prevent stale bot decisions.
- Fallback draw/pass/select-color/accept-challenge prevents freezes.
- Guard loop (max 200) prevents infinite loops.

## 4. Recovery
- No separate scheduler persistence is required because bot turns drain within the request that triggered them.
- Reconnect calls `runBotTurns` to resume.
- Server restart: next client poll/mutation triggers bot drain.
