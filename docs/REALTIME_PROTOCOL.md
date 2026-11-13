# UNO ARENA — Realtime Event Protocol & Supabase Realtime Architecture

## 1. Channel Topology & Security

UNO ARENA utilizes **Supabase Realtime Broadcast & Presence** without Socket.IO or Redis.

### 1.1 Channel Naming
Each room is bound to a dedicated broadcast channel:
```
uno:room:{room_id}
```

### 1.2 Channel Permissions
- Supabase Private Broadcast authorization is verified against the `room_players` table.
- A client can only join `uno:room:{room_id}` if they possess a valid session token for a seat in that room.

---

## 2. Event Types & Discriminated Payloads

Every event broadcasted over the channel adheres to the standard envelope:

```typescript
export interface BaseRealtimeEvent<TType extends string, TPayload> {
  eventId: string;
  roomId: string;
  gameSessionId: string;
  gameVersion: number;
  sequenceNumber: number;
  timestamp: string; // ISO 8601
  type: TType;
  payload: TPayload;
}
```

### 2.1 Event Catalog

| Event Type | Triggers When | Public Payload Contains |
|---|---|---|
| `ROOM_PLAYER_JOINED` | New player joins lobby | `player: { id, nickname, seatNumber }` |
| `ROOM_PLAYER_LEFT` | Player explicitly leaves lobby | `playerId: string` |
| `ROOM_PLAYER_READY` | Player toggles ready status | `playerId: string, isReady: boolean` |
| `GAME_STARTED` | Host starts the match | `initialPublicState: PublicGameState` |
| `TURN_CHANGED` | Turn advances to next player | `currentSeat: number, currentPlayerId: string, timeLimitMs: number` |
| `CARD_PLAYED` | Player plays a card | `playerId: string, card: UnoCard, remainingCardCount: number, activeColor: CardColor, nextPlayerId: string` |
| `CARD_DRAWN` | Player draws 1 or penalty cards | `playerId: string, drawnCount: number, remainingCardCount: number` |
| `UNO_DECLARED` | Player declares UNO | `playerId: string` |
| `UNO_MISSED` | Player entered 1-card state without calling UNO | `playerId: string, catchWindowExpiresAt: string` |
| `UNO_CAUGHT` | Opponent successfully catches missed UNO | `caughtPlayerId: string, catcherPlayerId: string, penaltyCardsCount: number` |
| `WILD_COLOR_SELECTED` | Player selects color for Wild / Wild Draw 4 | `playerId: string, selectedColor: CardColor` |
| `WILD_FOUR_CHALLENGE_STARTED` | Wild Draw 4 played, awaiting challenge | `challengedPlayerId: string, challengerPlayerId: string, timeLimitMs: number` |
| `WILD_FOUR_CHALLENGE_RESOLVED` | Challenge outcome computed | `wasIllegal: boolean, penalizedPlayerId: string, penaltyCardsCount: number` |
| `ROUND_FINISHED` | Player plays last card | `winnerId: string, roundScores: Record<string, number>, matchScores: Record<string, number>` |
| `MATCH_FINISHED` | Tournament score target reached | `winnerId: string, finalScores: Record<string, number>` |
| `PLAYER_RECONNECTED` | Disconnected player reclaims seat | `playerId: string` |
| `PLAYER_DISCONNECTED` | Player connection dropped | `playerId: string, gracePeriodExpiresAt: string` |

---

## 3. Public vs Private State Projection

To prevent cheating and map-hacking:
1. **Public Broadcast**: Contains only visible attributes (top discard card, active color, turn direction, remaining card counts per player). It **NEVER** contains the cards in any player's hand.
2. **Private Hand Sync**:
   - The private player hand is retrieved via authorized Fastify endpoint `GET /api/v1/rooms/:id/hand` or pushed over an authenticated private player channel.
   - When a player plays or draws, only that player receives their new private hand array.

---

## 4. Presence Protocol

Clients join the Presence state on channel `uno:room:{room_id}` with metadata:
```json
{
  "playerId": "...",
  "nickname": "...",
  "onlineAt": "2026-11-01T14:00:00Z"
}
```
If a player's presence heartbeats cease for > 15 seconds, the server marks `is_connected = false` and initiates the Bot Grace Period.
