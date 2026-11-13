# UNO ARENA — Local Game Architecture

## 1. Overview
Local games run entirely in the browser. No Supabase records, Realtime channels, or game APIs are created.

## 2. Components
- `LocalGameController` (`src/lib/local/local-game.ts`): in-memory state, bot scheduling, cleanup.
- Shared engine (`src/lib/game-engine`): authoritative UNO rules.
- Local bot scheduler: `setTimeout`-based, cancels stale decisions via version checks.
- Local animation controller: `GameStartSequence`.

## 3. State lifecycle
- Created in constructor from `LocalGameOptions`.
- Mutated via engine execution functions.
- Destroyed on leave/new game; timers cleared.

## 4. Persistence
- Optional session recovery via `sessionStorage` is not currently implemented; state is in-memory only.
- New game/leave clears state.

## 5. Cleanup
- `destroy()` clears timers and listeners; state released.
