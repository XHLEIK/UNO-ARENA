# UNO ARENA — Official Game Rules (Classic Edition)

## 1. Overview & Inventory

UNO ARENA implements the authoritative **Mattel Classic UNO** rule set for 2 to 10 players using the standard **108-card deck**.

### The 108-Card Inventory
The deck consists of four colors: **Red**, **Blue**, **Green**, and **Yellow**, plus uncolored **Wild** cards.

| Category | Type | Breakdown per Color / Deck | Total Count |
|---|---|---|---|
| **Number (0)** | Red, Blue, Green, Yellow | 1 card of '0' per color | 4 cards |
| **Number (1–9)** | Red, Blue, Green, Yellow | 2 cards of each '1' through '9' per color (18 × 4) | 72 cards |
| **Action: Skip** | Red, Blue, Green, Yellow | 2 Skip cards per color (2 × 4) | 8 cards |
| **Action: Reverse** | Red, Blue, Green, Yellow | 2 Reverse cards per color (2 × 4) | 8 cards |
| **Action: Draw Two** | Red, Blue, Green, Yellow | 2 Draw Two (+2) cards per color (2 × 4) | 8 cards |
| **Wild** | Multi-color | 4 Wild cards | 4 cards |
| **Wild Draw Four** | Multi-color | 4 Wild Draw Four (+4) cards | 4 cards |
| **Total Deck** | | | **108 Cards** |

---

## 2. Setup & Dealing

1. **Seating**: 2 to 10 players are assigned seats in clockwise order around the table.
2. **Dealing**: Exactly 7 cards are dealt to each player from the shuffled 108-card deck.
3. **Draw Pile**: The remaining cards form the facedown Draw Pile.
4. **Discard Pile Initialization**: The top card of the Draw Pile is flipped over to begin the Discard Pile.
   - **Number Card**: Play begins with the player to the left of the dealer (or seat 0). Current active color matches the card color.
   - **Skip**: The first player is skipped; the second player starts.
   - **Reverse**: Play direction is inverted immediately (counter-clockwise). The dealer plays first. (In 2-player games, Reverse acts as Skip; player 2 is skipped and player 1 goes).
   - **Draw Two**: The first player must draw 2 cards and their turn is skipped.
   - **Wild**: The first player chooses the starting active color and plays normally.
   - **Wild Draw Four**: Illegal as a starter card. It is returned to the deck, the deck is reshuffled, and a new top card is drawn.

---

## 3. General Gameplay

Players take turns in the current turn direction (clockwise by default). On their turn, a player must do one of the following:

1. **Play a Matching Card**:
   - Matches the **Color** of the top discard card (or active wild color).
   - Matches the **Number** of the top discard card.
   - Matches the **Action/Symbol** of the top discard card (e.g. Blue Skip on Red Skip).
2. **Play a Wild Card**:
   - May be played on any card regardless of color or symbol.
   - The player declares the next active color upon playing.
3. **Play a Wild Draw Four Card**:
   - May be played on any card, but according to official rules, is **legal only if the player does NOT hold any card of the current active color**.
   - The player declares the next active color upon playing.
   - Subject to the **Challenge Rule** (see Section 5).
4. **Draw a Card**:
   - If the player has no playable card, or voluntarily chooses not to play a playable card, they draw 1 card from the Draw Pile.
   - If the drawn card is playable, the player may immediately play it in the same turn.
   - If the drawn card is not played, the player passes and their turn ends.

---

## 4. Action Cards

- **Skip**: The next player in the current turn direction loses their turn.
- **Reverse**: Inverts the direction of play (clockwise $\leftrightarrow$ counter-clockwise).
  - *Special 2-Player Rule*: In a 2-player game, Reverse functions exactly like a Skip card (the opponent is skipped and the player takes another turn).
- **Draw Two (+2)**: The next player draws 2 cards from the Draw Pile and loses their turn.
- **Wild**: Allows the player to select the active color (Red, Blue, Green, or Yellow) for subsequent play.
- **Wild Draw Four (+4)**: The player selects the active color, and the next player must draw 4 cards and lose their turn, unless they challenge.

---

## 5. The Wild Draw Four Challenge Rule

Under official Mattel rules, a Wild Draw Four may only be played if the player **does not possess any card matching the current active color** (number or action cards of that color). Wild cards in hand do not count as matching the color.

When Player A plays a Wild Draw Four, the next player (Player B) has two choices:
1. **Accept (+4)**: Draw 4 cards and lose their turn.
2. **Challenge**: Challenge Player A's play.

### Challenge Resolution:
- **Server Verification**: The server inspects Player A's hand at the moment the Wild Draw Four was played.
- **Case 1: Illegal Play (Challenge Successful)**
  - Player A actually held one or more cards matching the active color prior to playing the Wild Draw Four.
  - **Penalty**: Player A must draw 4 cards into their hand.
  - Player B draws **0 cards** and does **not** lose their turn! Player B continues their turn normally.
- **Case 2: Legal Play (Challenge Failed)**
  - Player A had no cards matching the active color.
  - **Penalty**: Player B must draw **6 cards total** (the original 4 + 2 penalty cards) and loses their turn.

*Privacy Guarantee*: Opponents never see the full hand of the challenged player; only the server validates legality.

---

## 6. Calling "UNO" & Catching Penalties

- **The Rule**: When a player plays their second-to-last card and is left with exactly **1 card**, they must declare **"UNO"**.
- **Catch Window**: If a player fails to call UNO before or upon playing their card, any opponent can press **"Catch UNO"**.
- **Window Expiry**: The catch window stays open until the next player starts their turn (by either drawing a card or playing a card).
- **Penalty**: If caught before the window closes, the offending player is penalized with **2 cards** drawn immediately from the Draw Pile.
- **Protection**: If the player called UNO in time, catch attempts are rejected.

---

## 7. Draw Pile Exhaustion & Reshuffling

- When the Draw Pile is depleted:
  1. The top card of the Discard Pile remains in place as the active discard.
  2. All remaining cards in the Discard Pile are collected and reshuffled deterministically to replenish the Draw Pile.
  3. The card distribution and integrity of all hands are strictly preserved.

---

## 8. Stacking (Optional House Rule)

- **Default**: **OFF** (Official Classic UNO does not permit stacking Draw Two or Wild Draw Four).
- **Host Configuration**: When enabled by the room host in lobby settings:
  - A Draw Two can be stacked on a Draw Two: the draw penalty accumulates (+2 $\rightarrow$ +4 $\rightarrow$ +6...) until a player cannot stack, and must draw the accumulated sum and lose their turn.
  - A Wild Draw Four can be stacked on a Wild Draw Four under the same logic.

---

## 9. Scoring and Winning

### Mode A: Single Round (Quick Play)
- The first player to play their final card (empty hand) immediately wins the round and the match.

### Mode B: Cumulative Scoring (Tournament Style)
- When a round ends, the winner receives points calculated from the cards left in all opponents' hands:
  - **Number Cards (0–9)**: Face value (0 to 9 points).
  - **Skip**: 20 points.
  - **Reverse**: 20 points.
  - **Draw Two**: 20 points.
  - **Wild**: 50 points.
  - **Wild Draw Four**: 50 points.
- Points accumulate across rounds. The first player to reach the target score (default **500 points**, or host-configured) wins the match.
