# UNO ARENA — Game Table Reference Audit

## Reference material

No reference screenshots were present in the repository or `public/` at audit
time. The visual audit therefore uses the reference descriptions and acceptance
criteria in `Design.md`, plus the previous implementation preserved in
`src/components/table/GameTable.tsx.broken` and the unused modal components.

## Pre-redesign table problems

| Problem | Root cause | Affected area |
|---|---|---|
| Wild color and Wild Draw Four decisions covered the entire table with a dark, blurred modal | `WildColorModal` and `ChallengeModal` used `fixed inset-0` with `backdrop-blur` | Contextual decisions, hand visibility, table awareness |
| Opponents were arranged as a wrapping row of similar chips | No seat-coordinate model; opponents were rendered in a flex-wrap strip | Player seating, ten-player layout |
| The player hand could be clipped or pushed off-screen | `overflow-x-auto` around a `min-w-max` row with fixed large cards and negative spacing | Hand, mobile layouts, large hands |
| The discard pile had no physical depth or controlled variation | A single top card was rendered without a recent-card stack or deterministic placement | Discard pile, played-card feedback |
| Dealing was visually separate from the real seat positions | The previous sequence used a generic overlay and did not target the actual table layout | Dealing, seat synchronization |
| The table used gradients and neon-style accents rather than a restrained card-table surface | Existing styling was dashboard-oriented and not built from a physical table model | Entire game stage |
| Action feedback was mostly a text ticker | No event-driven effect layer tied to the authoritative `lastAction` | Skip, Reverse, Draw Two, Wild, Wild Draw Four |
| UNO declaration behavior did not preserve both valid call patterns | The old table submitted `privateState.canCallUno` automatically and did not support the post-play catch window | UNO interaction |
| 5–10 player layouts were not designed around collision-free space | No adaptive seating strategy | Multiplayer tables |

## Existing functionality that had to be preserved

- Authoritative server and local engine rules; no React copy of legality logic.
- Exact `PLAY_CARD`, `DRAW_CARD`, `PASS_TURN`, `CALL_UNO`,
  `CATCH_MISSED_UNO`, `SELECT_COLOR`, `CHALLENGE_WILD_DRAW_FOUR`, and
  `ACCEPT_WILD_DRAW_FOUR` contracts.
- Room lifecycle, host migration, reconnection, bot turns, scoring, and round
  transitions.
- Private-hand boundaries: opponents always see card backs and counts, never
  card identities.
- Optional +2 stacking; +4 stacking remains disabled.
- Reduced-motion and sessionStorage behavior for the opening deal.

## Target interaction model used for the rebuild

- Human at the bottom; opponents around the perimeter with increasing spacing
  pressure as the table grows.
- The draw and discard piles are the visual center; the discard pile is a
  deterministic criss-cross stack of recent cards.
- Dealing originates at the draw pile and travels to real seat coordinates.
- Wild and challenge decisions are compact table panels, not blocking dialogs.
- Playable cards are highlighted by the engine-derived `isPlayable` flag.
- Action feedback is driven by authoritative events, not invented UI state.
- All essential controls remain reachable at mobile portrait and landscape
  sizes.

## Responsive and performance concerns

- Ten-player tables need deliberate top-row plus side-column placement rather
  than an arbitrary arc.
- The hand needs horizontal scrolling for large counts instead of shrinking
  cards below a readable width.
- The visual discard stack is capped at four recent cards; the full history
  remains in the engine state.
- Opponent card backs are lightweight DOM layers, not full card faces.
- Animation must remain presentation-only: state updates and server commands
  never wait for an animation callback.
