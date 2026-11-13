# UNO ARENA — API Reference

Base URL in development: `http://localhost:3000`.

All endpoints are Next.js App Router route handlers. Request and response bodies
are JSON. Mutating online endpoints require the `playerId` and `sessionToken`
issued when the player created or joined the room. Errors use:

```json
{ "error": "Human-readable message" }
```

Status codes are mapped from the error message by
`src/lib/server/http.ts` (for example, not-found → 404, conflict → 409,
unauthorized → 401, validation → 400).

---

## 1. Rooms

### `POST /api/rooms`

Create a room and become its host.

```json
{
  "nickname": "Alice",
  "maxPlayers": 6,
  "scoringMode": "CUMULATIVE",
  "targetScore": 500,
  "botCount": 2,
  "botDifficulty": "MEDIUM",
  "botPersonality": "BALANCED",
  "rules": {
    "stackingEnabled": false,
    "turnTimerSeconds": 30,
    "botGracePeriodSeconds": 30
  }
}
```

All fields except `nickname` are optional. `maxPlayers` is 2–10; `targetScore`
is 100–2000; timers are 10–120 seconds.

Response `201`:

```json
{
  "room": {
    "id": "uuid",
    "roomCode": "K9W2XP",
    "hostPlayerId": "uuid",
    "status": "LOBBY",
    "maxPlayers": 6,
    "rules": { "...": "..." },
    "scoringMode": "CUMULATIVE"
  },
  "player": {
    "id": "uuid",
    "nickname": "Alice",
    "seatNumber": 0,
    "isHost": true
  },
  "sessionToken": "opaque bearer token",
  "reconnectToken": "opaque reconnect token"
}
```

The session token is required for every later mutation. Store it in
`localStorage`; the client does so under `uno-arena-session`.

### `POST /api/rooms/join`

```json
{ "roomCode": "K9W2XP", "nickname": "Bob" }
```

Response `200` has the same shape as room creation.

### `GET /api/rooms/:roomId`

Optional query parameters: `playerId`, `sessionToken`.

Returns public room data, players, and (when valid viewer credentials are
provided) the viewer's private game state. Opponent hands are never included.

### `POST /api/rooms/:roomId/ready`

```json
{ "playerId": "uuid", "sessionToken": "...", "isReady": true }
```

### `POST /api/rooms/:roomId/start`

Host only. Requires at least two players.

```json
{ "playerId": "uuid", "sessionToken": "..." }
```

### `POST /api/rooms/:roomId/leave`

```json
{ "playerId": "uuid", "sessionToken": "..." }
```

### `POST /api/rooms/:roomId/reconnect`

```json
{ "reconnectToken": "..." }
```

Returns a fresh session token, the player record, and the room details. The
reconnect token is rotated on success.

### `GET /api/rooms/:roomId/hand`

Query parameters: `playerId`, `sessionToken`.

Returns only the caller's private hand and UNO state.

---

## 2. Game commands

### `POST /api/rooms/:roomId/actions`

```json
{
  "commandId": "uuid-v4",
  "playerId": "uuid",
  "sessionToken": "opaque token",
  "expectedVersion": 12,
  "type": "PLAY_CARD",
  "payload": { "cardId": "c_red_7_1", "chosenColor": "RED" }
}
```

- `commandId` must be a UUID and is stored as an idempotency receipt.
- `expectedVersion` must match the room's current game version.
- `payload` is intentionally open at the schema level and validated by the
  engine.

Supported `type` values and payloads:

| Type | Payload |
|---|---|
| `PLAY_CARD` | `{ cardId, chosenColor?, callUno? }` |
| `DRAW_CARD` | `{}` |
| `PASS_TURN` | `{}` |
| `CALL_UNO` | `{}` |
| `CATCH_MISSED_UNO` | `{}` |
| `SELECT_COLOR` | `{ color }` |
| `CHALLENGE_WILD_DRAW_FOUR` | `{}` |
| `ACCEPT_WILD_DRAW_FOUR` | `{}` |

Response `200`:

```json
{
  "success": true,
  "gameState": { "version": 13, "phase": "ACTIVE_TURN", "...": "..." }
}
```

A retried `commandId` returns the original result without applying the command
twice.

---

## 3. Operations

### `GET /api/health`

Public health probe.

```json
{
  "status": "ok",
  "service": "uno-arena",
  "timestamp": "2026-11-13T00:00:00.000Z",
  "uptime": 123.4,
  "storage": "postgres",
  "realtime": "supabase"
}
```

`storage` is `postgres` or `memory`; `realtime` is `supabase` or
`polling-only`.

### `POST /api/maintenance/cleanup`

Requires header `x-cleanup-secret: <CLEANUP_SECRET>`.

Optional query parameter `limit` (1–200, default 50).

Deletes expired `LOBBY` and `FINISHED` rooms. Active `IN_GAME` rooms are never
deleted. Returns `{ "deleted": <count> }`.

---

## 4. Client flow

1. `POST /api/rooms` or `POST /api/rooms/join`, then persist the session.
2. Poll `GET /api/rooms/:roomId` every four seconds and subscribe to
   `uno:room:{roomId}` for `room-updated`.
3. In the lobby, call `/ready` and `/start`.
4. In game, fetch `/hand` for private cards and submit `/actions` commands.
5. On refresh, call `/reconnect` with the stored reconnect token.
6. On leave, call `/leave` and clear local session storage.
