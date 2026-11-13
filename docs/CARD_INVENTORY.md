# UNO ARENA — Complete 108-Card Inventory & Physical Identity Specification

## 1. Card Distribution Matrix

The Classic UNO deck contains exactly **108 cards**. Every physical card in an UNO ARENA deck has an immutable, globally unique identifier formatted as: `c_<card_id>`.

| Card Type | Red | Blue | Green | Yellow | Multi/Wild | Total |
|---|---:|---:|---:|---:|---:|---:|
| **0** | 1 | 1 | 1 | 1 | — | **4** |
| **1** | 2 | 2 | 2 | 2 | — | **8** |
| **2** | 2 | 2 | 2 | 2 | — | **8** |
| **3** | 2 | 2 | 2 | 2 | — | **8** |
| **4** | 2 | 2 | 2 | 2 | — | **8** |
| **5** | 2 | 2 | 2 | 2 | — | **8** |
| **6** | 2 | 2 | 2 | 2 | — | **8** |
| **7** | 2 | 2 | 2 | 2 | — | **8** |
| **8** | 2 | 2 | 2 | 2 | — | **8** |
| **9** | 2 | 2 | 2 | 2 | — | **8** |
| **Skip** | 2 | 2 | 2 | 2 | — | **8** |
| **Reverse** | 2 | 2 | 2 | 2 | — | **8** |
| **Draw Two (+2)** | 2 | 2 | 2 | 2 | — | **8** |
| **Wild** | — | — | — | — | 4 | **4** |
| **Wild Draw Four (+4)** | — | — | — | — | 4 | **4** |
| **Totals** | **25** | **25** | **25** | **25** | **8** | **108** |

---

## 2. Card Data Model

Each card is represented by the following TypeScript schema:

```typescript
export type CardColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export type WildColor = CardColor;

export type CardType =
  | 'NUMBER'
  | 'SKIP'
  | 'REVERSE'
  | 'DRAW_TWO'
  | 'WILD'
  | 'WILD_DRAW_FOUR';

export interface UnoCard {
  id: string; // Unique physical card identifier (e.g., 'card_red_7_a', 'card_wild_draw4_c')
  color: CardColor | null; // null for unplayed Wild cards
  type: CardType;
  value: number | null; // 0-9 for NUMBER cards, null for action/wild
  scoreValue: number; // Face value for numbers, 20 for actions, 50 for wilds
}
```

---

## 3. Physical Identity Guarantee

- Two cards may have the exact same face value (for example, two `Red 7`s exist in every standard deck).
- They **must never share the same ID**.
- The Card Factory creates deterministic IDs for each physical copy (e.g., `card_red_7_1` and `card_red_7_2`).
- Card ownership transitions throughout the match (Draw Pile $\rightarrow$ Player Hand $\rightarrow$ Discard Pile $\rightarrow$ Draw Pile upon reshuffle) always preserve total card conservation:

$$\sum \text{Player Hands} + \text{Draw Pile} + \text{Discard Pile} = 108 \text{ cards}$$
