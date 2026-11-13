# UNO ARENA — Upgrade Audit

## 1. Current architecture
- Frontend: Next.js App Router, React, TypeScript, Tailwind, Framer Motion.
- Backend: Next.js API routes (`src/app/api`) + Supabase PostgreSQL via `src/lib/server/room-store.ts`.
- Game rules: shared pure engine in `src/lib/game-engine`.
- Realtime: Supabase broadcast `uno:room:{roomId}` (best-effort) + polling fallback.
- Local mode: `src/lib/local/local-game.ts` runs entirely in browser memory.

## 2. Identified defects (pre-fix)
- `npm run build` failed on 3 TypeScript errors (local-game spread; room-store undefined player). Fixed.
- Docs described Fastify/Prisma/normalized schema/outbox, but code uses Next.js monolith + single JSONB room snapshot.
- Prompt2-required docs (14) were missing.
- No bot simulation lab or replay tooling.
- Realtime delivery not durable (no outbox table).
- Bot weights not validated by simulation.
- No E2E/load/concurrency/security tests.

## 3. Root causes
- Architecture simplified to Next.js + Supabase JSONB for faster delivery; docs not reconciled.
- Missing developer tooling and documentation for the v2 upgrade.

## 4. Functionality worth preserving
- Shared deterministic game engine (`src/lib/game-engine`).
- 108-card factory and invariants.
- Local bot mode independence from server infra.
- Optimistic concurrency (`store_version`) in room store.
- Cinematic dealing sequence.

## 5. Proposed improvements
- Reconcile docs with actual architecture (this index + new docs).
- Add simulation lab (`src/lib/simulation`, `/dev/simulation`).
- Expand automated tests.
- Document polling fallback as the chosen realtime delivery strategy (no separate outbox service).

## 6. Files requiring modification
- `src/lib/local/local-game.ts`, `src/lib/server/room-store.ts` (build fixes).
- `docs/*` (new + reconciled).

## 7. Database migration requirements
- Existing `supabase/migrations/0001_rooms.sql` remains authoritative.
- No new tables required for current architecture; simulation/replay are client/dev-only.

## 8. Risks and testing strategy
- Keep engine deterministic and server-authoritative for online mode.
- Run `npm test` and `npm run build` after changes.
- Use simulation lab to compare difficulty win rates.
