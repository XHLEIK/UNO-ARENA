# UNO ARENA — Architectural Rule Decisions & Edge Case Specifications

This document records deliberate engineering and rule design decisions for edge cases in UNO ARENA.

---

## 1. Starter Discard Card Edge Cases
When the top card of the Draw Pile is revealed to begin the Discard Pile:
- **Wild Draw Four**: Illegal as a first card according to official Mattel rules. The engine places the card back into the deck, shuffles, and flips another card until a non-Wild-Draw-Four appears.
- **Wild**: The starting player (the player to the left of the dealer) chooses the initial active color and can immediately play any valid card of that chosen color (or another Wild).
- **Draw Two**: The first player immediately draws 2 cards, their turn is skipped, and play passes to the next player.
- **Reverse**: The direction of play inverts immediately to counter-clockwise. The dealer plays first. In a 2-player game, this skips Player 2, so Player 1 plays first.
- **Skip**: The first player is skipped immediately, and play begins with the second player.

---

## 2. Reverse in a 2-Player Match
- In a 2-player game, **Reverse** acts identically to **Skip**:
  - Playing a Reverse skips the other player's turn.
  - The current player immediately takes another turn.

---

## 3. Voluntary Drawing & Single Play Rule
- A player is permitted under official rules to draw a card even if they possess a valid playable card in hand.
- If the card drawn from the Draw Pile is legal to play on the current discard, the player is given an explicit option in the UI:
  - **Play Drawn Card** (execute immediately).
  - **Pass Turn** (retain the drawn card in hand and end turn).
- A player may NOT draw multiple times on the same turn. Once a card is drawn, the player can only play that specific drawn card or pass.

---

## 4. Wild Draw Four Challenge Mechanics & Legality
- **Legality Definition**: A Wild Draw Four is legal if and only if the player playing it holds **ZERO cards in their hand matching the current active color** at the moment the card is played.
  - Wild cards in the hand do NOT count as matching the color.
  - Number cards and Action cards of the active color DO count as matching.
- **Privacy Enforcement**:
  - The server evaluates the player's hand internally inside an atomic transaction.
  - Hand cards are NEVER broadcast to the challenger or room.
  - The outcome (`CHALLENGE_SUCCESSFUL` vs `CHALLENGE_FAILED`) is broadcast along with the resulting penalty card count and turn progression.

---

## 5. UNO Calling & Catching Architecture
- **Declaration Window**:
  - A player can call UNO prior to playing their 2nd card or as part of the `PLAY_CARD` command (with `callUno: true`).
  - If they did not call UNO and now hold exactly 1 card, they enter the `UNO_CATCH_WINDOW` state.
- **Catch Window Expiry**:
  - The catch window closes as soon as the next player takes an action (either `DRAW_CARD` or `PLAY_CARD`).
- **Missed UNO Penalty**:
  - If another player submits a `CATCH_MISSED_UNO` command while the target player has 1 card and has not called UNO, the target player immediately draws 2 penalty cards.
  - If multiple opponents press catch simultaneously, the server processes the first one idempotently; subsequent catch commands receive a harmless `ALREADY_PROCESSED` acknowledgement without duplicate penalties.

---

## 6. Draw Pile Exhaustion & Reshuffle Invariant
- When the Draw Pile contains fewer cards than needed for a draw (e.g. Draw Two or Wild Draw Four):
  1. The top card of the Discard Pile is retained as the active discard.
  2. All other cards in the Discard Pile are collected, deterministically shuffled, and placed at the bottom of the Draw Pile.
  3. The remaining cards are drawn.
  4. If the Discard Pile has no available cards (e.g. all 108 cards are held in players' hands), drawing terminates gracefully without crash, and the turn advances.

---

## 7. Stacking Rules (When Enabled as House Rule)
- Default: **Disabled**.
- When enabled by host:
  - Playing a `DRAW_TWO` on top of an active `DRAW_TWO` increases the pending draw count by +2 and passes the obligation to the next player.
  - Playing a `WILD_DRAW_FOUR` on top of an active `WILD_DRAW_FOUR` increases the pending count by +4.
  - A `DRAW_TWO` cannot be stacked on a `WILD_DRAW_FOUR` or vice versa.
