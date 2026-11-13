# UNO ARENA — Game Engine Architecture & State Machine

## 1. Engine Philosophy
The `@uno-arena/game-engine` is a **pure, side-effect-free, deterministic TypeScript state machine**.
- Zero database imports.
- Zero network or timer imports.
- Every state transition is an immutable function:
  $$f(\text{State}, \text{Action}) \rightarrow \text{Result}<\text{NewState}, \text{EngineError}>$$

---

## 2. State Machine Phases

```mermaid
stateDiagram-v2
    [*] --> LOBBY
    LOBBY --> STARTING: Host triggers start (min 2 players)
    STARTING --> ACTIVE_TURN: Deal 7 cards each, flip top discard

    state ACTIVE_TURN {
        [*] --> AWAITING_ACTION
        AWAITING_ACTION --> DRAW_DECISION: Player draws 1 card
        DRAW_DECISION --> AWAITING_ACTION: Played drawn card
        DRAW_DECISION --> NEXT_TURN: Passed turn
    }

    ACTIVE_TURN --> WILD_COLOR_SELECTION: Wild / Wild Draw 4 played
    WILD_COLOR_SELECTION --> WILD_FOUR_CHALLENGE: Color chosen & was Wild Draw 4
    WILD_COLOR_SELECTION --> NEXT_TURN: Color chosen & was regular Wild

    WILD_FOUR_CHALLENGE --> NEXT_TURN: Accepted (+4) or Challenge Resolved

    ACTIVE_TURN --> UNO_CATCH_WINDOW: Player has 1 card left without calling UNO
    UNO_CATCH_WINDOW --> NEXT_TURN: Next player takes action OR catch applied

    ACTIVE_TURN --> ROUND_FINISHED: Player has 0 cards left
    ROUND_FINISHED --> LOBBY: Match finished (or single round)
    ROUND_FINISHED --> STARTING: Next round in tournament
```

---

## 3. Invariant Verifications

After every transition, the engine automatically asserts the following mathematical invariants:
1. **Card Conservation**: `drawPile.length + discardPile.length + sum(playerHands.length) === 108`.
2. **Card Uniqueness**: Set of all card IDs has size exactly 108.
3. **Turn Bounds**: Current player index is always within valid active player bounds.
4. **Non-Empty Discard Pile**: Discard pile has at least 1 card (the active top discard).
