# UNO ARENA — Project Progress Index

> **Historical note:** this index was generated during development. The
> `Prompt*.md` files it references are not part of the public repository, and
> some architecture descriptions reflect the original design target rather than
> the shipped Next.js route-handler implementation. See the root README and
> `docs/ARCHITECTURE.md` for current behavior.

> Generated from a full read of every documentation file, both master prompt files, and the current source tree. Use this as the single entry point for understanding where the project stands.

## 1. Repository snapshot

- **Workspace**: this repository
- **Branch**: `main`
- **Latest commit**: see `git log`; this document is a historical snapshot
- **Stack actually installed**: Next.js 16.4.3, React 19.3.0, TypeScript 5, Tailwind CSS 4, Framer Motion 14.9, Zod 4, Supabase JS, Vitest 4, fast-check 4.
- **No Fastify / Prisma / standalone backend package** is installed. The backend is implemented as Next.js App Router API routes (`src/app/api/...`) backed by Supabase PostgreSQL via `src/lib/server/room-store.ts`.

## 2. Master prompt files (authoritative specification)

| File | Size | Role |
|---|---|---|
| `Prompt.md` | ~39.9 KB / 1,761 lines | "MASTER ENGINEERING PROMPT — UNO ARENA" (v1). Defines product vision, mandatory stack, official UNO rules, state machine, backend, realtime, DB, security, testing, deployment, 9-phase execution plan, and the 14 required docs. |
| `Prompt2.md` | ~38.5 KB / 1,561 lines | "UNO ARENA 2.0 — COMPREHENSIVE GAMEPLAY INTELLIGENCE, BOT AUTONOMY, CINEMATIC GAMEPLAY & SYSTEM RELIABILITY UPGRADE". Audit-first upgrade spec: two execution modes (local vs online), bot autonomy + intelligence, simulation lab, cinematic dealing, room lifecycle, cleanup, docs list. |

### 2.1 What Prompt.md demands (v1 baseline)

- Instant anonymous entry, 2–10 players, official Classic 108-card UNO, optional stacking, two scoring modes, grace period + bot takeover, vector cards.
- Server-authoritative pure game engine; atomic PG transactions; transactional outbox; private hand isolation.
- Fastify + Prisma + Supabase Realtime; monorepo `apps/web`, `apps/server`, `packages/*`.
- 14 docs (all present).
- 9-phase execution plan ending in production readiness.

### 2.2 What Prompt2.md demands (v2 upgrade)

- Deep audit of existing implementation; fix root cause of "bots do not play automatically".
- Two separate execution modes: **local** (browser-only, no DB/Realtime/Fastify) and **online** (Fastify + Supabase).
- Robust bot scheduler, strategic bot engine (Easy/Medium/Hard × 5 personalities), opponent modeling, Wild Draw Four challenge intelligence, UNO participation.
- Bot simulation lab (1k–10k matches) + replay.
- Cinematic game-start dealing sequence (shuffle → deal 7 each → initial discard → turn highlight), skip + reduced motion.
- Complete rule/room lifecycle/cleanup edge cases, 15-minute completed-room retention, idempotent cleanup.
- 14 additional/updated docs (mostly missing — see §4).

## 3. Existing documentation index (`docs/`)

All 14 v1 docs exist and are substantive.

| Doc | Purpose | Status |
|---|---|---|
| `PRODUCT_REQUIREMENTS.md` | PRD, audience, feature scope | ✅ Present |
| `GAME_RULES.md` | Official Classic UNO rules | ✅ Present |
| `CARD_INVENTORY.md` | 108-card matrix + data model | ✅ Present |
| `RULE_DECISIONS.md` | Edge-case rule decisions | ✅ Present |
| `GAME_ENGINE.md` | State machine + invariants | ✅ Present |
| `ARCHITECTURE.md` | High-level arch (describes Fastify/Prisma monorepo) | ⚠️ Describes target arch, not actual Next.js monolith |
| `DATABASE_SCHEMA.md` | Normalized PG schema (rooms, hands, outbox, etc.) | ⚠️ Describes target schema; actual uses single `rooms` JSONB snapshot |
| `REALTIME_PROTOCOL.md` | Event catalog + presence | ⚠️ Describes target protocol; actual uses `room-updated` broadcast only |
| `API_REFERENCE.md` | Fastify REST v1 endpoints | ⚠️ Describes target API; actual routes under `/api/rooms` |
| `SECURITY.md` | Threat model | ✅ Present |
| `PERFORMANCE.md` | Latency budgets | ✅ Present |
| `TESTING.md` | Testing pyramid | ⚠️ Describes broader strategy than implemented (Playwright/k6 not present) |
| `DEPLOYMENT.md` | Hosting/env/migrations | ✅ Present |
| `OPERATIONS.md` | Health checks, outbox, cleanup | ⚠️ Describes target outbox; actual has cleanup route + in-process bot turns |

## 4. Prompt2-required docs that are MISSING

Prompt2 §18 required docs — now created:

- `docs/UPGRADE_AUDIT.md`
- `docs/LOCAL_GAME_ARCHITECTURE.md`
- `docs/ONLINE_BOT_ARCHITECTURE.md`
- `docs/BOT_INTELLIGENCE.md`
- `docs/BOT_DIFFICULTY.md`
- `docs/BOT_PERSONALITIES.md`
- `docs/BOT_SIMULATION.md`
- `docs/BOT_SCHEDULER.md`
- `docs/CARD_DEALING_ANIMATION.md`
- `docs/GAME_EDGE_CASES.md`
- `docs/ROOM_LIFECYCLE.md`
- `docs/DATA_RETENTION.md`
- `docs/RECONNECTION_AND_TAKEOVER.md`
- `docs/TESTING_REPORT.md`
## 5. Actual implementation inventory (`src/`)

### 5.1 Game engine (`src/lib/game-engine/`)

- `cards.ts` — `createClassicUnoDeck()` (exact 108-card distribution, unique IDs), `shuffleDeck()` (Fisher-Yates, optional seeded Mulberry32 PRNG).
- `validation.ts` — `isCardPlayable`, `canPlayWildDrawFourLegally`.
- `engine.ts` — full state machine: `createInitialGame`, `executePlayCard`, `executeDrawCard`, `executePassTurn`, `executeCallUno`, `executeCatchMissedUno`, `executeSelectColor`, `executeChallengeWildDrawFour`, `executeAcceptWildDrawFour`, `getNextSeat`, `getPublicGameState`, `getPrivatePlayerState`, `assertGameStateInvariants`, draw-pile replenishment.
- `scoring.ts` — hand score + winner points.
- `bot.ts` — strategic bot engine: difficulty weights, 5 personalities with parameter sets, observation model, candidate evaluation, challenge decisions, UNO catch, `applyBotDecisionToState`, `isBotTurn`, `getBotTurnDelay`, `getPublicBotObservation`.
- `__tests__/engine.test.ts` — 17 tests (inventory, shuffle, validation, engine flows, UNO catch, public discard history, property-based conservation). All passing.

### 5.2 Execution modes

- **Local mode**: `src/lib/local/local-game.ts` — `LocalGameController` runs entirely in browser memory using the shared engine + local bot scheduler (`setTimeout`-based). Supports bot count/difficulty/personality/rules/scoring/seed/delay override. Cleanup + catch handling. ✅ Implemented.
- **Online mode**: Next.js API routes + `src/lib/server/room-store.ts` — durable JSONB snapshot per room in Supabase with optimistic concurrency (`store_version`), in-memory fallback, auth via session/reconnect tokens, bot turns executed synchronously inside mutations (`runBotTurns`), lifecycle/retention, cleanup. ✅ Implemented (diverges from documented Fastify/Prisma architecture).

### 5.3 Realtime

- `src/lib/realtime/client.ts` — subscribes to `uno:room:{roomId}` broadcast `room-updated`, triggers refetch.
- `src/lib/realtime/server.ts` — best-effort broadcast via Supabase REST broadcast API.
- No transactional outbox table; delivery is best-effort with polling fallback.

### 5.4 UI (`src/components/`, `src/app/`)

- `HomeView`, `LobbyView`, `GameTable`, `GameStartSequence` (cinematic deal), `UnoCardRenderer`, `WildColorModal`, `ChallengeModal`, `RoundSummaryModal`, `UnoButton`.
- Card rendering is SVG/CSS vector (accurate UNO faces).
- Fanned hand, opponent layout, history log, sound toggle, copy invite link.
- Game-start sequence: deal one-by-one, skip, reduced motion, sessionStorage "seen" flag.

### 5.5 API routes (`src/app/api/`)

- `health`, `maintenance/cleanup`, `rooms`, `rooms/join`, `rooms/[roomId]`, `rooms/[roomId]/actions`, `rooms/[roomId]/hand`, `rooms/[roomId]/leave`, `rooms/[roomId]/ready`, `rooms/[roomId]/reconnect`, `rooms/[roomId]/start`.

### 5.6 Types (`src/types/index.ts`)

- Full domain types: cards, phases, players, state, commands, realtime events, bot profiles, public/private state.

## 6. Architecture: documented vs actual

| Documented (ARCHITECTURE/DATABASE/REALTIME/API) | Actual code |
|---|---|
| Fastify stateless cluster + Prisma | Next.js serverless API routes + Supabase JS |
| Normalized multi-table schema + outbox | Single `rooms` table with JSONB `record` + `store_version` |
| Transactional outbox + retry | Best-effort broadcast + polling fallback |
| Fastify in-process outbox worker | `maintenance/cleanup` route + in-mutation bot turns |
| RLS on all tables | `rooms` RLS enabled, no policies (service role only) |
| Anonymous auth via Supabase | Custom guest identity + session/reconnect tokens (no Supabase anon auth) |

The docs describe a more production-grade target; the code is a working, simpler monolith. This divergence should be reconciled in `ARCHITECTURE.md` / `DATABASE_SCHEMA.md` or the code upgraded.

## 7. Build, test, lint status

- `npm test` → ✅ 1 test file, 17 tests pass.
- `npm run build` → ✅ passes after fixing 3 TypeScript errors.
- `npm test` → ✅ 1 file, 17 tests pass.
- Lint not run in this pass.

## 8. Feature progress matrix

| Area | Spec (Prompt/Prompt2) | Implementation | Status |
|---|---|---|---|
| 108-card factory | Required | `cards.ts` | ✅ |
| Shuffle (deterministic) | Required | `cards.ts` | ✅ |
| Game state machine | Required | `engine.ts` | ✅ |
| Move validation | Required | `validation.ts` | ✅ |
| Action cards (Skip/Reverse/Draw2/Wild/WD4) | Required | `engine.ts` | ✅ |
| Wild Draw Four challenge | Required | `engine.ts` | ✅ |
| UNO declare + catch | Required | `engine.ts` | ✅ |
| Draw pile exhaustion/reshuffle | Required | `engine.ts` | ✅ |
| Stacking (optional) | Required | `pendingStackCount` in state | ⚠️ Partial |
| Scoring (single + cumulative) | Required | `scoring.ts` + engine | ✅ |
| Local bot mode (no DB) | Prompt2 | `local-game.ts` | ✅ |
| Online multiplayer | Required | API routes + room-store | ✅ |
| Bot autonomy (auto-play) | Prompt2 (bug fix) | local `schedule()` + online `runBotTurns` | ✅ |
| Bot difficulty (Easy/Med/Hard) | Prompt2 | `bot.ts` | ✅ |
| Bot personalities (5) | Prompt2 | `bot.ts` | ✅ |
| Opponent modeling | Prompt2 | observation model | ⚠️ Basic |
| Simulation lab (1k–10k) | Prompt2 | Not present | ❌ |
| Bot decision replay | Prompt2 | Not present | ❌ |
| Cinematic dealing | Prompt2 | `GameStartSequence` + `dealing.ts` | ✅ |
| Reconnection + takeover | Required | `reconnect` route + room-store | ⚠️ Partial |
| Host migration | Required | `leaveRoom` | ✅ |
| Room cleanup (retention) | Prompt2 | `cleanupExpiredRooms` + `applyLifecycle` | ✅ |
| Security (RLS, tokens) | Required | service-role only table + token hashing | ⚠️ Partial |
| Realtime outbox | Required | best-effort broadcast | ⚠️ Partial |
| Tests (unit/property/e2e/load) | Required | 16 engine tests only | ⚠️ Partial |
| Docs (v1 14) | Required | All present | ✅ |
| Docs (Prompt2 14) | Required | All created | ✅ |

## 9. Known defects / gaps to address

1. **Build breaks** on 3 TypeScript errors (local-game spread; room-store undefined player). Must fix before production.
2. **Documentation drift**: `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `REALTIME_PROTOCOL.md`, `API_REFERENCE.md`, `OPERATIONS.md` describe Fastify/Prisma/normalized schema/outbox, but code is a Next.js monolith with a single JSONB room snapshot and best-effort broadcast. Reconcile.
3. **Missing Prompt2 docs** (14 files) — none of the upgrade audit/bot/dealing/lifecycle docs exist.
4. **No bot simulation lab** or replay tooling; bot weights not validated by simulation.
5. **No E2E/Playwright, load (k6/Autocannon), concurrency, or security tests** despite TESTING.md claiming them.
6. **Realtime is not durable** (no outbox table); clients rely on polling + best-effort broadcast.
7. **Bot takeover on disconnect** is represented (`isBotControlled`) but full grace-period + takeover scheduling in online mode needs verification.
8. **Reconnection token storage** uses `localStorage` (client) — acceptable for anonymous play but not hardened.
9. **No Supabase Anonymous Auth** used; identity is custom guest tokens (diverges from Prompt §8).

## 10. Recommended next steps (in priority order)

1. Fix the 3 TypeScript build errors and re-run `npm run build`.
2. Reconcile documentation with actual architecture (or implement the documented Fastify/Prisma backend).
3. Create the 14 missing Prompt2 docs, starting with `UPGRADE_AUDIT.md` recording current defects/root causes.
4. Add a bot simulation harness (Node script using shared engine) to validate Easy < Medium < Hard win rates over ≥1,000 matches.
5. Add an outbox table + retry worker (or document the polling fallback as the chosen design).
6. Expand tests: concurrency (version conflict), reconnection, cleanup idempotency, bot scheduler.
7. Run Playwright E2E for create/join/start/play/reconnect flows.

---

*This index reflects a development snapshot. See `git log` for the current repository state.*

