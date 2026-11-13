# UNO ARENA — Comprehensive Testing Strategy

## 1. Testing Pyramid

### 1.1 Unit & State Transition Testing (Vitest)
- 108 card factory distribution verification.
- Every card action: Skip, Reverse, Draw Two, Wild, Wild Draw Four.
- 2-player Reverse edge case.
- Wild Draw Four challenge legality (positive and negative cases).
- UNO declaration timing and 2-card catch penalty.
- Empty Draw Pile reshuffle card conservation.
- Stacking logic (when enabled vs disabled).
- Single round and Cumulative tournament scoring.

### 1.2 Property-Based Testing (`fast-check`)
- Arbitrary sequences of legal/illegal commands never violate card count ($=108$).
- Monotonic version increment.
- No player ever holds duplicate physical card IDs.
- Deterministic outcome reproduction via seeds.

### 1.3 Concurrency & Lock Testing
- Simulated race condition: two players submitting `PLAY_CARD` simultaneously with identical expected version. Exactly one succeeds; the second receives version mismatch (HTTP 409).
