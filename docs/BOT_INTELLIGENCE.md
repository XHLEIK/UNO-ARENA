# UNO ARENA — Bot Intelligence

## 1. Observation model
- Bots only read their own hand plus public state (counts, discard, direction, active color, history).
- Opponent hands are never accessed.

## 2. Decision pipeline
1. Build public observation.
2. Generate legal candidates.
3. Score each candidate via `actionScore`.
4. Apply difficulty/personality modifiers.
5. Select action with controlled randomness.

## 3. Challenge decisions
- Uses public probability estimate only.
- Expected-value comparison between accepting (+4) and challenging (0/6).
- Final outcome determined by engine.

## 4. UNO behavior
- `shouldCallUno` with small miss chance by difficulty.
- Bots can catch missed UNO based on public flags.

## 5. Bounded simulation
- Not implemented as Monte Carlo; utility model only.
- Future enhancement: add determinization with strict budget.
