# MASTER ENGINEERING PROMPT — UNO ARENA
## Production-Grade Real-Time Multiplayer UNO Platform

You are acting as a principal software architect, senior multiplayer game engineer, distributed systems engineer, database architect, security engineer, performance engineer and world-class UI/UX designer.

Your task is to PLAN, ARCHITECT, IMPLEMENT, TEST, OPTIMIZE and DOCUMENT a complete production-ready multiplayer UNO web application called **UNO ARENA**.

This is not a simple UNO clone or a frontend demonstration.

We are building a reliable, scalable, low-latency multiplayer card gaming platform where people can instantly create private rooms, invite friends and play UNO together without registering or sharing personal credentials.

Your responsibility is to produce a technically sound, visually exceptional, secure and maintainable application.

Do not take shortcuts. Do not implement fake functionality. Do not leave critical logic as TODOs. Do not sacrifice backend correctness for frontend speed or visual appearance.

---

# 1. PRODUCT VISION

Product name: UNO ARENA

Core concept:

A user opens the website and can immediately:

1. Create a private game room.
2. Receive a unique room code and invitation link.
3. Share the invitation with friends.
4. Allow friends to join using the room code.
5. Choose a nickname without registering.
6. Start a multiplayer UNO game.
7. Play in real time with up to 10 players.
8. Reconnect after temporary internet disconnections.
9. Play additional rounds and view scores.

No email, password, phone number, social account or conventional registration should be required.

The experience should feel like sitting around a physical UNO table with friends.

The product should prioritize:

- Instant accessibility.
- Fun and playful interactions.
- Accurate UNO rules.
- Beautiful card rendering.
- Responsive multiplayer gameplay.
- Low latency.
- Backend reliability.
- Strong security.
- Simple deployment.
- Maintainable architecture.

# 2. MANDATORY TECHNOLOGY STACK

Use the following technology stack.

## Frontend

- Next.js with App Router.
- React.
- TypeScript.
- Tailwind CSS.
- Framer Motion / Motion for animations.
- Lucide React for icons.
- Zod for client-side validation.
- Supabase JavaScript client.
- TanStack Query where appropriate.

## Backend

- Node.js.
- Fastify.
- TypeScript.
- Zod.
- Prisma ORM.
- PostgreSQL.
- Supabase Realtime.

## Infrastructure

- Supabase PostgreSQL.
- Supabase Realtime Broadcast.
- Supabase Realtime Presence.
- Supabase Anonymous Authentication.
- Supabase Row Level Security.
- Supabase database functions.
- Supabase connection pooling.
- Docker for local development and deployment portability.

## Testing

- Vitest.
- fast-check for property-based testing.
- Playwright for end-to-end testing.
- Autocannon or k6 for performance and load testing.

## Important infrastructure restriction

DO NOT introduce unnecessary infrastructure.

We specifically want:

- No Socket.IO.
- No standalone Redis.
- No Kafka.
- No separate message broker.
- No mandatory third-party cache provider.
- No unnecessary microservices.

Supabase should be the primary managed infrastructure platform.

Use Supabase PostgreSQL for durable game state and coordination.

Use Supabase Realtime for event distribution and presence.

Do not assume Supabase provides a general-purpose Redis-compatible cache. Avoid introducing a cache dependency unless actual measurements demonstrate that it is necessary.

The architecture must remain portable so that we can migrate hosting providers without rewriting the game engine.

# 3. RESEARCH UNO RULES BEFORE IMPLEMENTATION

This is one of the most important requirements.

Before writing the game engine, research the official Mattel Classic UNO rules and card inventory.

Use authoritative Mattel rulebooks and documentation.

Do not copy rules from random UNO clone implementations.

Create:

- docs/GAME_RULES.md
- docs/CARD_INVENTORY.md
- docs/RULE_DECISIONS.md

Document every rule, edge case, penalty, timing condition and optional rule.

Our default edition is:

CLASSIC UNO — 108 CARDS.

Do not mix UNO No Mercy, UNO Flip, UNO All Wild or other editions into the classic game.

## 3.1 Complete card inventory

There are four colors:

- Red.
- Blue.
- Green.
- Yellow.

Number cards:

- One zero card per color.
- Two copies of each number from 1 through 9 per color.

Action cards:

- Two Skip cards per color.
- Two Reverse cards per color.
- Two Draw Two cards per color.

Wild cards:

- Four Wild cards.
- Four Wild Draw Four cards.

Expected distribution:

| Card | Quantity |
|---|---:|
| Zero cards | 4 |
| Number 1–9 | 72 |
| Skip | 8 |
| Reverse | 8 |
| Draw Two | 8 |
| Wild | 4 |
| Wild Draw Four | 4 |
| Total | 108 |

Implement a card factory that generates this exact distribution.

Each physical card must have a unique identifier.

Never use a card's face value as its unique identifier because duplicate cards exist.

## 3.2 Card functionality

Implement the following behavior:

NUMBER:
Play when the number matches the top discard card or when its color matches the current active color.

SKIP:
The next player loses their turn.

REVERSE:
Reverse the direction of play.

With two players, Reverse acts as Skip.

DRAW TWO:
The next player draws two cards and loses their turn.

WILD:
Can be played regardless of the current color.

The player must choose the next active color.

WILD DRAW FOUR:
The player chooses a color and the next player receives four cards and loses their turn, subject to the challenge rule.

A Wild Draw Four is legal only when the player has no card matching the current active color, according to official classic rules.

## 3.3 UNO declaration

Implement precise UNO declaration logic.

When a player has two cards and plays one, they must declare UNO.

Implement:

- UNO button.
- Automatic detection of a player entering a one-card state.
- A limited catch window.
- Missed UNO penalty of two cards.
- Catching player identity.
- Server-side validation of declaration timing.
- Protection against duplicate penalties.

The opportunity to catch a player must expire when the next player's turn begins.

Do not implement UNO as a simple frontend button with no server-side validation.

## 3.4 Wild Draw Four challenge

This must be implemented as a proper game state.

When a Wild Draw Four is played:

- Record the previous active color.
- Record the challenged player's hand information privately.
- Record the player who made the play.
- Allow the next player to challenge.
- Prevent ordinary moves until the challenge is resolved.

Challenge outcomes:

Successful challenge:
The Wild Draw Four was illegal.
The player who played it draws four cards.
The challenger does not draw cards.

Failed challenge:
The Wild Draw Four was legal.
The challenger draws six cards total.
The challenger loses their turn.

The challenge must be determined from the game state at the time of the original play.

Never reveal the challenged player's hand to other players.

## 3.5 Drawing cards

When a player cannot play:

- They draw one card.
- If playable, they may immediately play it.
- Otherwise, their turn ends.

A player may voluntarily draw instead of playing an available card under the classic rules.

Prevent duplicate drawing from retries or repeated requests.

## 3.6 Draw pile exhaustion

When the draw pile is empty:

- Preserve the top discard card.
- Reshuffle the remaining discard pile into the draw pile.
- Maintain correct card distribution.
- Handle cases where no reshuffle is possible.

This must be tested extensively.

## 3.7 Stacking

Default: OFF.

The host may enable stacking as an optional house rule.

Do not confuse house rules with official Classic UNO.

Implement stacking as an explicitly configured rules module.

When enabled, document exactly which combinations are permitted.

The default configuration must follow the documented classic rules.

## 3.8 Winning and scoring

Support two scoring modes.

MODE A: SINGLE ROUND

The first player to empty their hand wins.

MODE B: CUMULATIVE SCORING

When a player wins, calculate the value of the cards remaining in opponents' hands.

Scoring:

- Number cards: face value.
- Skip: 20.
- Reverse: 20.
- Draw Two: 20.
- Wild: 50.
- Wild Draw Four: 50.

Accumulate points across rounds.

Support a configurable target score.

Implement round summaries and a final match winner.

Research and document any official-rule details that differ by edition or rulebook.

# 4. GAME STATE MACHINE

Build a deterministic, server-authoritative game engine.

Never let the frontend decide whether a move is valid.

Create explicit game phases:

- WAITING_FOR_PLAYERS.
- LOBBY.
- STARTING.
- ACTIVE_TURN.
- DRAW_DECISION.
- UNO_CATCH_WINDOW.
- WILD_COLOR_SELECTION.
- WILD_FOUR_CHALLENGE.
- ROUND_FINISHED.
- MATCH_FINISHED.
- PAUSED.
- RECOVERING.

Create an explicit state transition system.

Each state transition must be deterministic and testable.

Every action must be validated against the current state.

Implement:

- Current player.
- Turn direction.
- Current active color.
- Current top discard card.
- Draw pile.
- Discard pile.
- Individual player hands.
- Player order.
- Pending penalties.
- UNO declaration state.
- Challenge state.
- Round score.
- Match score.
- Game version.

Use a version number to prevent stale updates.

Example:

A player submits an action with expected version 42.

The server must reject the action if the authoritative game version has already advanced to 43.

Never silently apply an action to an unexpected state.

# 5. BACKEND ARCHITECTURE

We want a backend that can scale horizontally.

Do not build a monolithic server that keeps all rooms in local memory.

Use a modular monolith initially.

This provides simple deployment while maintaining clear internal boundaries.

Recommended structure:

apps/
  web/
  server/

packages/
  game-engine/
  shared/
  validation/
  database/
  config/

apps/server/src/

  modules/
    identity/
    rooms/
    players/
    lobby/
    gameplay/
    scoring/
    realtime/
    sessions/
    administration/

  infrastructure/
    supabase/
    postgres/
    observability/

  plugins/
  routes/
  middleware/
  utils/

  app.ts
  server.ts

## 5.1 Fastify responsibilities

Fastify is the trusted application server.

It handles:

- Room creation.
- Room joining.
- Guest session verification.
- Player reconnection.
- Host permissions.
- Game initialization.
- Game commands.
- Rule validation.
- State transitions.
- Score calculations.
- Realtime event publishing.
- Error handling.
- Rate limiting.

Expose versioned APIs.

Example:

POST /api/v1/rooms
POST /api/v1/rooms/join
POST /api/v1/rooms/:id/ready
POST /api/v1/rooms/:id/start
GET /api/v1/rooms/:id
POST /api/v1/rooms/:id/actions
POST /api/v1/rooms/:id/reconnect
POST /api/v1/rooms/:id/leave

Use Zod to validate every request and response.

Do not trust browser-provided player IDs, room permissions, card ownership or turn information.

## 5.2 Server-authoritative game commands

All gameplay commands must go through Fastify.

Examples:

CREATE_ROOM
JOIN_ROOM
LEAVE_ROOM
PLAYER_READY
START_GAME
PLAY_CARD
DRAW_CARD
PASS_TURN
CALL_UNO
CATCH_MISSED_UNO
SELECT_COLOR
CHALLENGE_WILD_DRAW_FOUR
ACCEPT_WILD_DRAW_FOUR
RECONNECT_PLAYER
REQUEST_GAME_STATE

Use strongly typed discriminated unions.

Every command must contain:

- Command ID.
- Room ID.
- Player identity.
- Expected game version.
- Command type.
- Validated payload.

Implement idempotency.

Repeated commands must not produce repeated card draws, repeated penalties or repeated score changes.

## 5.3 Atomic game transactions

This is critical.

Two players must never be able to advance the same turn simultaneously.

Use PostgreSQL transactions and row-level locking.

Recommended approach:

1. Begin transaction.
2. Lock the relevant room/game row using SELECT FOR UPDATE.
3. Verify room status.
4. Verify player identity.
5. Verify player permissions.
6. Verify expected game version.
7. Check command idempotency.
8. Load authoritative game state.
9. Execute deterministic game-engine action.
10. Validate all resulting invariants.
11. Persist updated state.
12. Increment game version.
13. Store the game event.
14. Store an outbox event.
15. Commit transaction.

Only after successful commit should the event be distributed.

Do not broadcast uncommitted state.

Use database constraints wherever possible.

Keep transaction duration short.

Avoid external network calls inside database transactions.

Prisma may be used for normal queries, but use parameterized SQL for advanced PostgreSQL operations such as row locking and atomic database-specific operations.

## 5.4 Transactional outbox

Implement a transactional outbox.

Why?

A game action may commit successfully while the Realtime publishing operation fails.

Without an outbox, clients could remain unaware of an accepted move.

The outbox should:

- Be written in the same transaction as the game state.
- Track publication status.
- Support retry.
- Prevent duplicate event processing.
- Support multiple backend instances.
- Preserve event ordering per room.
- Allow recovery after server restart.

Publish events through Supabase Realtime after commit.

The frontend should also be able to fetch a fresh authoritative snapshot if it detects a missing event or version gap.

## 5.5 Multi-instance architecture

Fastify instances must be stateless.

Do not depend on:

- Local room maps.
- In-memory player sessions.
- Process-local turn locks.
- Process-local authoritative state.

All critical coordination must be shared through PostgreSQL.

Multiple Fastify instances should safely process commands for the same room.

Use database-level locking and optimistic version checks.

The architecture must support adding more Fastify instances without changing game logic.

# 6. SUPABASE REALTIME ARCHITECTURE

Supabase Realtime replaces Socket.IO.

Use:

- Broadcast for game events.
- Presence for connected players.
- PostgreSQL for authoritative state.

Do not use Realtime as the database.

Do not assume message delivery is durable.

## 6.1 Private room channels

Use a room-scoped channel.

Example:

uno:room:<room_id>

Use private channels and RLS authorization.

Only authorized members should subscribe.

Never allow a client to subscribe to arbitrary private game channels.

## 6.2 Event types

Implement strongly typed events.

ROOM_PLAYER_JOINED
ROOM_PLAYER_LEFT
ROOM_PLAYER_READY
GAME_STARTED
TURN_CHANGED
CARD_PLAYED
CARD_DRAWN
UNO_DECLARED
UNO_MISSED
UNO_CAUGHT
WILD_COLOR_SELECTED
WILD_FOUR_CHALLENGE_STARTED
WILD_FOUR_CHALLENGE_RESOLVED
STACKING_APPLIED
ROUND_FINISHED
MATCH_FINISHED
PLAYER_RECONNECTED
PLAYER_DISCONNECTED
GAME_STATE_RECOVERED

Every event should include:

- Event ID.
- Room ID.
- Game version.
- Timestamp.
- Event type.
- Safe public payload.

Private events must only reach their intended player.

## 6.3 Public and private state separation

Create separate serializers.

getPublicGameState()
getPrivatePlayerState()
getSpectatorState()

Public state contains:

- Player nicknames.
- Player order.
- Remaining card counts.
- Current player.
- Current color.
- Top discard card.
- Current game phase.
- Public scores.

Private state contains:

- The requesting player's cards.
- Their private challenge information when applicable.
- Their own session-specific information.

Never send the complete authoritative game state to the browser.

Never send all players' cards through a shared Broadcast event.

Use separate private delivery mechanisms with strict authorization.

## 6.4 Presence

Use Supabase Presence for:

- Online status.
- Player connection status.
- Lobby presence.
- Reconnection indicators.

Presence must not be the source of truth for game membership or permissions.

Database state must remain authoritative.

## 6.5 Recovery

When a player reconnects:

1. Verify their session.
2. Verify their room membership.
3. Verify their reconnect token.
4. Invalidate the old session where appropriate.
5. Restore their private game state.
6. Fetch the latest authoritative game version.
7. Resubscribe to the room.
8. Resume gameplay.

Do not depend on receiving every historical Broadcast event.

# 7. DATABASE DESIGN

Use Supabase PostgreSQL.

Create a normalized schema.

Suggested tables:

rooms
room_players
player_sessions
game_sessions
game_state
player_hands
game_events
command_receipts
event_outbox
round_results
match_scores

Important database requirements:

- UUID primary keys.
- Foreign keys.
- Appropriate indexes.
- Unique room codes.
- Unique player seat positions within rooms.
- Unique command IDs within their proper scope.
- Timestamps.
- Game version constraints.
- Room lifecycle constraints.
- Session expiry.
- Referential integrity.

## 7.1 Room table

Fields:

- id
- room_code
- host_player_id
- status
- max_players
- edition
- rules_configuration
- scoring_mode
- created_at
- expires_at

## 7.2 Player table

Fields:

- id
- room_id
- guest_identity
- nickname
- seat_number
- is_ready
- is_connected
- connection_status
- joined_at
- last_seen_at

Do not store unnecessary personal information.

## 7.3 Game state

Store:

- Game ID.
- Room ID.
- Version.
- Current player.
- Direction.
- Current color.
- Top discard card.
- Draw pile.
- Discard pile.
- Game phase.
- Pending action.
- Round number.
- Match score.
- Last event sequence.

Store hands separately.

All card state must be persisted securely.

## 7.4 Row Level Security

RLS must be enabled on all tables exposed to Supabase client access.

Do not expose authoritative gameplay tables directly to untrusted clients.

Restrict private hand queries to the owning player.

Use server-side service credentials only inside Fastify.

Never expose the Supabase service role key in frontend environment variables.

Create SQL migrations and test RLS policies.

# 8. ANONYMOUS PLAYER IDENTITY

No registration should be required.

Use Supabase Anonymous Authentication.

Players receive an anonymous identity automatically.

Flow:

1. Open website.
2. Initialize anonymous session.
3. Enter nickname.
4. Create or join room.
5. Receive a room-specific session.
6. Play.

Implement:

- Secure session validation.
- Short-lived reconnect credentials.
- Reconnect token hashing.
- Token rotation.
- Expiration.
- Session revocation.
- Room membership validation.

Never use a room code alone as authorization.

Room codes are identifiers, not secrets.

Never log reconnect tokens or service credentials.

# 9. ROOM MANAGEMENT

Maximum players: 10.

Implement:

CREATE ROOM:

- Generate cryptographically random room code.
- Create host identity.
- Save room configuration.
- Create host player record.
- Generate invitation URL.

JOIN ROOM:

- Validate room code.
- Verify room status.
- Check available seats.
- Prevent duplicate active memberships.
- Create player session.
- Assign seat.

LOBBY:

- Show all participants.
- Show ready status.
- Show host indicator.
- Allow host to configure rules.
- Allow players to leave.
- Allow host to transfer ownership.
- Allow host to start the game.

Room settings:

- Maximum players.
- Stacking enabled/disabled.
- Scoring mode.
- Score target.
- Turn timer.
- Disconnect policy.

The host cannot change game rules after a match starts.

Support room expiration and automatic cleanup.

# 10. DISCONNECT AND RECONNECTION SYSTEM

Default policy:

AUTOMATIC RECONNECTION WITH GRACE PERIOD AND BOT TAKEOVER.

When a player disconnects:

1. Mark them disconnected.
2. Start a configurable grace period.
3. Preserve their seat.
4. Preserve their hand.
5. Keep the game state valid.
6. Allow reconnection.

After the grace period:

- Transfer control to an automated player.
- Make deterministic, legal decisions.
- Do not reveal hidden information.
- Do not allow the bot to cheat.
- Preserve the original player identity.

If the original player reconnects, allow them to reclaim control according to the documented policy.

Handle host disconnections.

Handle Fastify restarts.

Handle Supabase Realtime interruptions.

Do not let a temporary network failure corrupt the match.

# 11. FRONTEND DESIGN SYSTEM

The visual experience is extremely important.

We do not want a generic SaaS dashboard.

We want a colorful, playful, polished digital card game.

The interface should feel like a combination of:

- A physical UNO card table.
- A modern multiplayer party game.
- A premium casual gaming application.

Use the actual UNO color identity:

- Red.
- Blue.
- Green.
- Yellow.

Use dark navy or deep charcoal for the game table background, with vibrant card colors.

The UI must be playful without looking childish.

Use:

- Smooth animations.
- Rounded card edges.
- Subtle shadows.
- Layered surfaces.
- Soft gradients.
- Responsive typography.
- Carefully designed spacing.
- Beautiful transitions.
- Subtle sound effects.
- Haptic feedback where supported.

Avoid excessive gradients, excessive glassmorphism, generic dashboard components and unnecessary visual clutter.

Use Lucide icons only for interface controls.

# 12. ACCURATE UNO CARD DESIGN

This is a non-negotiable visual requirement.

The UNO cards must be recognizable and accurately represented.

Do not use emoji as card graphics.

Do not use random colored rectangles with numbers.

Do not use AI-generated card images as the actual card faces.

Do not use incorrect symbols.

Build a dedicated reusable card rendering system.

Each card must support:

- Correct card background color.
- Correct number or action symbol.
- Correct Wild design.
- Correct card border.
- Correct aspect ratio.
- Correct corner markings.
- Correct card typography.
- Consistent proportions.

Implement SVG or CSS-based vector card rendering.

Card types:

NUMBER:
Large central number with appropriate styling.

SKIP:
Recognizable Skip symbol.

REVERSE:
Correct circular directional arrows.

DRAW TWO:
Correct +2 symbol.

WILD:
Four-color split background and appropriate central Wild design.

WILD DRAW FOUR:
Four-color split background and prominent +4 symbol.

Every card component must be data-driven.

Example:

CardRenderer({
  card,
  size,
  selected,
  playable,
  disabled
})

Create card variants:

- Small opponent hand card.
- Standard hand card.
- Large discard pile card.
- Animated flying card.
- Card preview.

Use a single card design system across the entire application.

Respect intellectual property. Use original code-drawn representations and permitted assets; do not redistribute copyrighted card artwork without permission.

# 13. FRONTEND SCREENS

Implement every screen completely.

## 13.1 Home page

The landing page should be playful and visually impressive.

Include:

- UNO ARENA branding.
- Animated floating cards.
- Create Room.
- Join Room.
- Quick Play if implemented.
- How to Play.
- Game statistics if available.
- Footer.

The main CTA should be obvious.

The user should be able to start playing within seconds.

## 13.2 Create room

Allow:

- Nickname.
- Maximum players.
- Stacking configuration.
- Scoring mode.
- Score target.
- Optional turn timer.
- Disconnect policy.

Create the room and redirect to the lobby.

## 13.3 Join room

Allow:

- Room code.
- Nickname.
- Invitation-link support.

Validate the room before joining.

Display useful error messages.

## 13.4 Lobby

Display:

- Room code.
- Copy invitation link.
- QR code if appropriate.
- Player list.
- Player avatars generated from deterministic initials or abstract patterns.
- Host indicator.
- Ready state.
- Game configuration.
- Start game button.
- Leave room button.

Support up to 10 participants.

## 13.5 Main game table

Design the gameplay screen carefully.

Layout:

TOP:
Opponent information.

CENTER:
Discard pile.
Draw pile.
Current active color.
Turn direction.
Current game phase.

BOTTOM:
Current player's hand.

SIDEBAR OR OVERLAY:
Player list.
Scores.
Game log.
Settings.

The game table should adapt to player count.

For 2 players, use a compact layout.

For 3–6 players, use a circular arrangement.

For 7–10 players, use an optimized responsive arrangement that does not obstruct the cards.

## 13.6 Player hand

Cards should:

- Fan out naturally.
- Overlap intelligently.
- Be selectable.
- Animate when selected.
- Lift when hovered.
- Highlight legal moves.
- Support touch.
- Support drag-and-drop where useful.

Never make card selection dependent only on drag-and-drop.

Provide accessible click/tap interactions.

## 13.7 Wild color selection

When a Wild card is played, show a polished color selection interface.

Four large selectable color choices.

The selected color must be sent to Fastify and validated.

## 13.8 UNO interaction

When a player has one card:

- Show a clear UNO button.
- Add an attention-grabbing animation.
- Provide a sound cue if sound is enabled.
- Show the catch window when another player misses UNO.

The timing must be server-controlled.

## 13.9 End-of-round screen

Display:

- Winner.
- Remaining cards.
- Points earned.
- Player scores.
- Next round button.
- Return to lobby.

Add tasteful celebration animations.

Do not use intrusive animations that block subsequent actions.

# 14. ANIMATIONS AND GAME FEEDBACK

Use Motion for animations.

Implement:

- Card draw animation.
- Card play animation.
- Discard pile update.
- Turn indicator transition.
- Skip animation.
- Reverse direction animation.
- Draw Two penalty animation.
- Draw Four penalty animation.
- UNO alert.
- Challenge result animation.
- Winner celebration.

Use CSS transforms and opacity wherever possible.

Avoid expensive layout recalculations.

Support reduced-motion preferences.

Animations must never block the underlying game state update.

The authoritative state must update independently of the animation timeline.

# 15. RESPONSIVE DESIGN

The game must work on:

- Desktop.
- Laptop.
- Tablets.
- Mobile browsers.

Mobile is especially important.

For mobile:

- Cards should remain readable.
- Player hands should be horizontally scrollable or intelligently fanned.
- Action buttons must be touch-friendly.
- Opponent cards must not obstruct the center table.
- Avoid accidental card selection.
- Handle landscape and portrait orientation.

Use responsive layouts rather than simply shrinking the desktop interface.

# 16. PERFORMANCE ENGINEERING

Performance must be considered from the beginning.

## Frontend

- Use Next.js Server Components where appropriate.
- Keep interactive game components isolated.
- Avoid unnecessary global state updates.
- Use memoization carefully.
- Avoid rerendering every opponent when one player draws.
- Lazy-load nonessential components.
- Optimize fonts and images.
- Avoid oversized dependencies.
- Use efficient card rendering.
- Keep animations on the compositor where possible.

## Backend

- Keep game-engine functions pure.
- Avoid unnecessary database round trips.
- Use compact payloads.
- Use connection pooling.
- Keep transactions short.
- Index frequently queried fields.
- Avoid N+1 queries.
- Use atomic updates.
- Minimize serialized state size.
- Avoid unnecessary synchronous work.

## Realtime

- Send only relevant events.
- Do not broadcast full game state after every move.
- Use versioned event messages.
- Avoid unnecessary channel subscriptions.
- Reconcile state after missing events.
- Use private channels.
- Avoid excessive presence updates.

## Latency targets

Treat these as measurable engineering objectives, not guaranteed results.

- Local game-engine action: under 5 ms for typical actions.
- Backend processing: P95 under 30 ms.
- Database transaction: P95 under 30 ms.
- Game event delivery: P95 under 100 ms in a well-positioned deployment.
- Reconnection: under 2 seconds under normal conditions.

Optimize using actual measurements.

Do not introduce caching without evidence.

# 17. RELIABILITY AND FAULT TOLERANCE

The system must handle:

- Browser refresh.
- Internet disconnection.
- Fastify restart.
- Duplicate requests.
- Concurrent moves.
- Stale clients.
- Supabase Realtime interruption.
- PostgreSQL transaction failure.
- Event publication failure.
- Host disconnection.
- Room expiration.

Implement:

- Idempotency keys.
- Game versioning.
- Transactional outbox.
- Retry mechanisms.
- Reconnection.
- State snapshots.
- Event sequence numbers.
- Graceful shutdown.
- Health checks.
- Structured error responses.
- Observability.

A successfully committed move must never disappear merely because a Realtime message failed.

# 18. SECURITY

Treat every browser as untrusted.

Implement:

- Anonymous identity verification.
- Room membership validation.
- Player ownership checks.
- Private hand isolation.
- RLS.
- Secure reconnect tokens.
- Token hashing.
- Rate limiting.
- Input validation.
- Request size limits.
- Room-code brute-force protection.
- Origin validation.
- Secure HTTP headers.
- Service-role key protection.
- No sensitive data in logs.

Never trust:

- Browser-provided card ownership.
- Browser-provided current turn.
- Browser-provided game scores.
- Browser-provided player permissions.
- Browser-provided game state.

All critical game decisions must be validated by the backend.

# 19. TESTING STRATEGY

A multiplayer game must be tested beyond ordinary unit tests.

## Unit tests

Test every card type and every rule.

## Property-based tests

Use fast-check.

Properties should include:

- A card cannot exist twice with the same physical card ID.
- The total card inventory is preserved.
- Every player hand contains only valid cards.
- No player can play out of turn.
- No illegal card can be played.
- The current player always exists.
- Every transition produces a valid game state.
- Game version only increases.
- No card is lost during draw-pile reshuffling.

## Integration tests

Test:

- Room creation.
- Joining.
- Starting a game.
- Multiplayer turns.
- Wild challenges.
- UNO penalties.
- Reconnection.
- Scoring.
- Room cleanup.

## Concurrency tests

Simulate two players submitting commands simultaneously.

Verify that only the correct command succeeds.

Test duplicate commands.

Test stale versions.

Test database lock contention.

## Security tests

Attempt to:

- Read another player's hand.
- Play another player's card.
- Subscribe to an unauthorized room.
- Modify another player's identity.
- Bypass turn validation.
- Replay a previously accepted command.
- Join a full room.
- Use an expired reconnect token.

## Load tests

Use k6 or Autocannon.

Simulate:

- Multiple simultaneous rooms.
- Up to 10 players per room.
- Rapid game actions.
- Reconnect storms.
- Multiple Fastify instances.
- Supabase Realtime message load.

Measure:

- P50 latency.
- P95 latency.
- P99 latency.
- Database query latency.
- Transaction contention.
- Event delivery latency.
- Error rate.
- Memory consumption.
- CPU consumption.

Do not claim scalability without actual load-test evidence.

# 20. OBSERVABILITY

Implement structured logging.

Track:

- Room creation.
- Player joins.
- Game starts.
- Game actions.
- Invalid actions.
- Reconnection events.
- Transaction failures.
- Outbox retries.
- Realtime publication failures.
- Game completion.

Metrics:

- Active rooms.
- Active players.
- Moves per second.
- Average players per room.
- Database transaction duration.
- Realtime event delivery.
- Failed commands.
- Reconnection rate.
- Room abandonment rate.

Never log card hands, reconnect tokens or sensitive authentication information.

# 21. DEPLOYMENT ARCHITECTURE

The project must be easy to deploy.

Frontend:
Vercel or another Next.js-compatible provider.

Backend:
A single Node.js hosting provider capable of running Fastify.

Database and Realtime:
Supabase.

Use environment variables.

Create:

.env.example
Dockerfile
docker-compose.yml
README.md

Document:

- Supabase project creation.
- Database migration.
- RLS setup.
- Anonymous authentication configuration.
- Realtime configuration.
- Frontend deployment.
- Fastify deployment.
- Environment variables.
- Production security settings.
- Health checks.
- Backup and recovery.

Do not require paid third-party services to run the basic application.

Make local development possible with Docker and Supabase CLI.

Be transparent about free-tier limitations, connection limits and Realtime quotas.

Do not claim that the free tier can handle 10,000 concurrent players without evidence.

# 22. DEVELOPMENT EXECUTION PLAN

Do not implement everything in one enormous uncontrolled code-generation operation.

Work in verified phases.

PHASE 0 — REPOSITORY INSPECTION

- Inspect existing files.
- Identify current dependencies.
- Identify existing conventions.
- Identify available skills and project instructions.
- Produce a technical assessment.
- Do not overwrite working functionality.

PHASE 1 — RULES AND ARCHITECTURE

- Research official Classic UNO rules.
- Verify 108-card inventory.
- Document house rules.
- Design game state machine.
- Design database schema.
- Design realtime event contracts.
- Create architecture diagrams.
- Identify security risks.

PHASE 2 — GAME ENGINE

- Implement card factory.
- Implement shuffle.
- Implement initial dealing.
- Implement legal move validation.
- Implement every action card.
- Implement Wild challenges.
- Implement UNO penalties.
- Implement stacking configuration.
- Implement scoring.
- Implement game completion.
- Implement state invariants.

Write tests before moving forward.

PHASE 3 — DATABASE AND BACKEND

- Configure Supabase.
- Create migrations.
- Implement RLS.
- Implement anonymous sessions.
- Implement room management.
- Implement game commands.
- Implement transactions.
- Implement idempotency.
- Implement event outbox.
- Implement reconnection.
- Implement Fastify APIs.

PHASE 4 — REALTIME

- Implement private room channels.
- Implement event publisher.
- Implement presence.
- Implement private player updates.
- Implement recovery snapshots.
- Implement event ordering.
- Test multiple backend instances.

PHASE 5 — FRONTEND DESIGN SYSTEM

- Create theme.
- Create reusable card components.
- Create animations.
- Create typography.
- Create responsive layouts.
- Create common UI components.

PHASE 6 — COMPLETE GAME UI

- Home.
- Create room.
- Join room.
- Lobby.
- Game table.
- Player hand.
- UNO button.
- Wild selection.
- Challenge interface.
- Scoreboard.
- End-of-round screen.

PHASE 7 — INTEGRATION

- Connect frontend and backend.
- Connect Supabase Realtime.
- Implement optimistic interactions carefully.
- Implement reconnection.
- Test real multiplayer sessions.

PHASE 8 — HARDENING

- Unit tests.
- Integration tests.
- E2E tests.
- Security tests.
- Concurrency tests.
- Load tests.
- Performance profiling.
- Error handling.

PHASE 9 — PRODUCTION READINESS

- Final documentation.
- Deployment configuration.
- Database migration verification.
- Environment configuration.
- Health checks.
- Production build.
- Final acceptance report.

Do not skip phases.

Do not move forward while critical tests from the current phase are failing.

# 23. REQUIRED DOCUMENTATION

Create:

docs/
  PRODUCT_REQUIREMENTS.md
  GAME_RULES.md
  CARD_INVENTORY.md
  RULE_DECISIONS.md
  GAME_ENGINE.md
  ARCHITECTURE.md
  DATABASE_SCHEMA.md
  REALTIME_PROTOCOL.md
  API_REFERENCE.md
  SECURITY.md
  PERFORMANCE.md
  TESTING.md
  DEPLOYMENT.md
  OPERATIONS.md

Every architectural decision should have a clear reason.

Document important trade-offs.

# 24. ENGINEERING PRINCIPLES

Follow these principles throughout development:

1. Correctness before optimization.
2. Security before convenience.
3. Server authority over client authority.
4. Deterministic game logic.
5. Atomic database transactions.
6. Minimal infrastructure.
7. Explicit state transitions.
8. Strong TypeScript types.
9. No unnecessary abstractions.
10. No premature microservices.
11. No fake functionality.
12. No silent error handling.
13. No untested critical logic.
14. No leaking private information.
15. No overengineering.

The game engine must be independent of the UI and database.

The frontend must never contain authoritative UNO rules.

The backend must never trust client-generated game state.

Supabase Realtime must never be treated as durable storage.

# 25. DEFINITION OF DONE

The project is not complete until:

- A user can create a room.
- Another user can join through a room code.
- Ten players can occupy a room.
- A match can start.
- Exactly 108 classic cards are generated.
- Initial cards are dealt correctly.
- All card actions work.
- UNO declarations work.
- Missed UNO penalties work.
- Wild Draw Four challenges work.
- Stacking is configurable.
- Both scoring modes work.
- Players can disconnect and reconnect.
- Bots can take over disconnected players.
- Private hands remain private.
- Concurrent actions cannot corrupt the game.
- Game state survives backend restarts.
- Realtime event failures can recover.
- All critical tests pass.
- The frontend works on desktop and mobile.
- Production builds succeed.
- Deployment documentation is complete.

Provide a final engineering report showing:

- Implemented features.
- Architecture decisions.
- Test results.
- Known limitations.
- Performance measurements.
- Security considerations.
- Deployment instructions.

Do not fabricate test results or claim unverified functionality.

---

# FINAL INSTRUCTION

Think like a principal engineer building a real multiplayer game that people will actually use.

Be critical of your own architecture.

If you find a more reliable or simpler approach within the selected technology stack, explain the trade-off before changing the architecture.

Inspect the repository before modifying it.

Use the available project skills, particularly UI/UX design skills, where applicable.

Research before implementing.

Build incrementally.

Run tests.

Fix failures.

Verify everything.

The goal is not merely to produce code that looks impressive.

The goal is to build **UNO ARENA — a genuinely reliable, beautiful, secure, low-latency multiplayer UNO platform that is easy to deploy and enjoyable to play.**