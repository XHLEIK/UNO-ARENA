# UNO ARENA — Database Schema & Data Dictionary

## 1. Relational Schema Design

UNO ARENA utilizes PostgreSQL hosted on Supabase as the single authoritative source of truth.

```mermaid
erDiagram
    ROOM ||--o{ ROOM_PLAYER : "has members"
    ROOM ||--o| GAME_SESSION : "coordinates"
    ROOM_PLAYER ||--o{ PLAYER_HAND : "holds"
    GAME_SESSION ||--|| GAME_STATE : "maintains"
    GAME_SESSION ||--o{ GAME_EVENT : "logs"
    GAME_SESSION ||--o{ EVENT_OUTBOX : "publishes"
    ROOM_PLAYER ||--o{ COMMAND_RECEIPT : "executes"
    GAME_SESSION ||--o{ ROUND_RESULT : "records"

    ROOM {
        uuid id PK
        varchar room_code UK
        uuid host_player_id
        varchar status
        int max_players
        varchar edition
        jsonb rules_configuration
        varchar scoring_mode
        timestamp created_at
        timestamp expires_at
    }

    ROOM_PLAYER {
        uuid id PK
        uuid room_id FK
        varchar guest_identity
        varchar nickname
        int seat_number
        boolean is_ready
        boolean is_connected
        varchar connection_status
        varchar reconnect_token_hash
        timestamp joined_at
        timestamp last_seen_at
    }

    GAME_SESSION {
        uuid id PK
        uuid room_id FK
        int current_round
        int version
        varchar status
        timestamp started_at
        timestamp finished_at
    }

    GAME_STATE {
        uuid id PK
        uuid game_session_id FK
        int version
        varchar current_player_id
        int direction
        varchar active_color
        jsonb top_discard
        jsonb draw_pile
        jsonb discard_pile
        varchar game_phase
        jsonb pending_action
        int round_number
        jsonb match_scores
        timestamp updated_at
    }

    PLAYER_HAND {
        uuid id PK
        uuid game_session_id FK
        uuid player_id FK
        jsonb cards
        int card_count
        boolean uno_declared
        timestamp updated_at
    }

    EVENT_OUTBOX {
        uuid id PK
        uuid game_session_id FK
        uuid room_id FK
        int sequence_number
        varchar event_type
        jsonb payload
        varchar status
        int retry_count
        timestamp created_at
        timestamp published_at
    }

    COMMAND_RECEIPT {
        uuid id PK
        uuid command_id UK
        uuid game_session_id FK
        uuid player_id FK
        varchar command_type
        int resulting_version
        jsonb result_payload
        timestamp created_at
    }
```

---

## 2. Table Specifications & Indexes

### 2.1 `rooms`
- `id` (UUID, Primary Key, default `gen_random_uuid()`)
- `room_code` (VARCHAR(6), Unique, Indexed): Cryptographically random 6-character alphanumeric code for inviting players.
- `host_player_id` (UUID): Reference to the creator of the room.
- `status` (VARCHAR(32)): `LOBBY`, `IN_GAME`, `FINISHED`, `ABANDONED`.
- `max_players` (INT, Default 10): 2 to 10 players.
- `rules_configuration` (JSONB): Stacking toggle, turn timer length, bot grace period.
- `scoring_mode` (VARCHAR(32)): `SINGLE_ROUND` or `CUMULATIVE`.
- `target_score` (INT, Default 500).

### 2.2 `room_players`
- `id` (UUID, Primary Key)
- `room_id` (UUID, Foreign Key $\rightarrow$ `rooms.id` ON DELETE CASCADE)
- `guest_identity` (VARCHAR(64)): Anonymous identity generated on first visit.
- `nickname` (VARCHAR(32)): Display name chosen by player.
- `seat_number` (INT): Seat index from 0 to 9. Unique constraint on `(room_id, seat_number)`.
- `is_ready` (BOOLEAN): Lobby ready check state.
- `is_connected` (BOOLEAN): Connection flag updated by presence / disconnect handlers.
- `reconnect_token_hash` (VARCHAR(128)): Argon2/SHA-256 hash of secret reconnection token issued to player.

### 2.3 `game_state`
- `game_session_id` (UUID, Foreign Key $\rightarrow$ `game_sessions.id`)
- `version` (INT, Not Null): Monotonically increasing version counter for optimistic locking.
- `current_player_id` (UUID): Whose turn it is.
- `direction` (INT): `1` (Clockwise) or `-1` (Counter-Clockwise).
- `active_color` (VARCHAR(16)): `RED`, `BLUE`, `GREEN`, `YELLOW`.
- `top_discard` (JSONB): Complete card object of current active discard.
- `draw_pile` (JSONB): Array of card objects currently remaining in Draw Pile.
- `discard_pile` (JSONB): Array of card objects currently in Discard Pile.
- `game_phase` (VARCHAR(32)): `ACTIVE_TURN`, `DRAW_DECISION`, `WILD_COLOR_SELECTION`, `WILD_FOUR_CHALLENGE`, `ROUND_FINISHED`, etc.
- `pending_action` (JSONB): Stacking accumulation, challenge metadata.

### 2.4 `player_hands`
- `id` (UUID, Primary Key)
- `game_session_id` (UUID)
- `player_id` (UUID)
- `cards` (JSONB): Array of private card objects currently held by this player.
- `card_count` (INT): Cached count for rapid public projection without deserializing private cards.
- `uno_declared` (BOOLEAN): Flag set when player calls UNO with 1 card.
- Unique constraint on `(game_session_id, player_id)`.

### 2.5 `event_outbox`
- Ensures at-least-once, ordered delivery to Supabase Realtime broadcast channels.
- `sequence_number` (INT): Monotonic sequence number per room.
- `status` (VARCHAR(16)): `PENDING`, `PUBLISHED`, `FAILED`.
- Index on `(status, created_at)`.
