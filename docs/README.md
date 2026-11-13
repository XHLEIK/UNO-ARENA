# Documentation Index

The root [`README.md`](../README.md) is the primary guide to the project. This
folder contains the detailed rules, design notes, audits, and operations
references produced during development.

## Authoritative for the shipped app

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Actual runtime topology, trust boundaries, storage, and trade-offs |
| [API_REFERENCE.md](API_REFERENCE.md) | Actual route handlers, payloads, and client flow |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Environment, Supabase setup, hosting, cleanup, rollback |
| [SECURITY.md](SECURITY.md) | Implemented controls and known limitations |
| [GAME_RULES.md](GAME_RULES.md) | Rules, card inventory, scoring, edge cases |
| [RULE_DECISIONS.md](RULE_DECISIONS.md) | Deliberate rule interpretations |

## Rules and product

- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) — product scope and requirements
- [GAME_RULES.md](GAME_RULES.md) — rules, card inventory, scoring, edge cases
- [RULE_DECISIONS.md](RULE_DECISIONS.md) — deliberate rule interpretations
- [GAME_EDGE_CASES.md](GAME_EDGE_CASES.md) — edge-case catalogue
- [CARD_INVENTORY.md](CARD_INVENTORY.md) — 108-card composition

## Engine and bots

- [GAME_ENGINE.md](GAME_ENGINE.md) — state machine and invariants
- [LOCAL_GAME_ARCHITECTURE.md](LOCAL_GAME_ARCHITECTURE.md) — browser-only practice mode
- [BOT_INTELLIGENCE.md](BOT_INTELLIGENCE.md) — bot evaluation and strategy
- [BOT_DIFFICULTY.md](BOT_DIFFICULTY.md) — difficulty weights
- [BOT_PERSONALITIES.md](BOT_PERSONALITIES.md) — personality profiles
- [BOT_SCHEDULER.md](BOT_SCHEDULER.md) — turn scheduling
- [BOT_SIMULATION.md](BOT_SIMULATION.md) — simulation lab
- [ONLINE_BOT_ARCHITECTURE.md](ONLINE_BOT_ARCHITECTURE.md) — bots in server rooms

## Backend and operations

- [REALTIME_PROTOCOL.md](REALTIME_PROTOCOL.md) — event protocol design notes
- [ROOM_LIFECYCLE.md](ROOM_LIFECYCLE.md) — lobby through cleanup
- [RECONNECTION_AND_TAKEOVER.md](RECONNECTION_AND_TAKEOVER.md) — reconnect and idle handling
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — data model notes
- [DATA_RETENTION.md](DATA_RETENTION.md) — retention windows
- [OPERATIONS.md](OPERATIONS.md) — runbook
- [PERFORMANCE.md](PERFORMANCE.md) — performance notes

## Testing

- [TESTING.md](TESTING.md) — test strategy
- [TESTING_REPORT.md](TESTING_REPORT.md) — test results and coverage notes

## Frontend and audits

- [GAME_TABLE_IMPLEMENTATION_REPORT.md](GAME_TABLE_IMPLEMENTATION_REPORT.md)
- [GAME_TABLE_REFERENCE_AUDIT.md](GAME_TABLE_REFERENCE_AUDIT.md)
- [FRONTEND_DESIGN_AUDIT.md](FRONTEND_DESIGN_AUDIT.md)
- [FRONTEND_REDESIGN_REPORT.md](FRONTEND_REDESIGN_REPORT.md)
- [CARD_DEALING_ANIMATION.md](CARD_DEALING_ANIMATION.md)
- [PROJECT_PROGRESS_INDEX.md](PROJECT_PROGRESS_INDEX.md) — historical implementation snapshot
- [UPGRADE_AUDIT.md](UPGRADE_AUDIT.md) — upgrade audit

## Status note

Some documents were written before or alongside implementation and describe a
planned Fastify/Prisma monorepo, a richer realtime event catalogue, or a
normalized database schema. Those are design references, not descriptions of
the shipped code. When a document conflicts with the root README or the four
authoritative documents above, the README and those documents win.
