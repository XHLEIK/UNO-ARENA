# UNO ARENA — Frontend Design Audit

## Scope

The redesigned frontend implements `Design.md` on the existing Next.js 16 App
Router + Supabase architecture. The authoritative game engine, bot behavior,
room lifecycle, scoring, challenge rules, and event contracts were not replaced
or duplicated in React.

## Audit findings before the redesign

No reference screenshot assets were present in the repository. The audit used
`Design.md`, the existing component tree, and the preserved pre-redesign table
variant (`GameTable.tsx.broken`) plus the old modal components.

| Finding | Root cause | Affected components |
|---|---|---|
| Wild/challenge decisions hid the hand and table behind full-screen blurred dialogs | `WildColorModal` and `ChallengeModal` used fixed full-viewport overlays | Contextual decisions, table awareness |
| Opponents were laid out as a wrapping row of same-sized chips | No seat-coordinate model or adaptive perimeter strategy | Opponent seating, 5–10 player tables |
| Hands could clip or force horizontal page overflow | Fixed large cards in a `min-w-max` flex row with limited overflow handling | Player hand, mobile, large hands |
| Discard pile was a single top card | No recent-card presentation model or deterministic placement | Discard pile, played-card feedback |
| Dealing did not consistently target the real table seats | Deal presentation was separated from the adaptive table layout | Dealing, seat synchronization |
| Action feedback was centered on text rather than card events | No event-driven effect layer keyed to authoritative `lastAction` | Skip, Reverse, Draw Two, Wild, Wild Draw Four |
| UNO could auto-declare or lose the post-play catch interaction | The play command received `canCallUno` automatically, while the engine models declaration and catch separately | UNO interaction |
| Table styling leaned on generic gradients and dashboard controls | No shared table-specific design tokens or primitives | Entire game stage |

Existing functionality identified as mandatory to preserve: the authoritative
Next.js/Supabase engine, room lifecycle, reconnect, bots, private-hand
boundaries, scoring, challenges, all game commands, +2-only stacking, and the
existing deal sessionStorage behavior.

## Implemented design system

- Dark green-black app shell with a physical felt table, ambient color washes,
  restrained borders, and no glassmorphism-heavy dashboard cards.
- Typography: `Outfit` for display, `DM Sans` for body copy, `JetBrains Mono`
  for room codes and table metadata.
- Shared primitives rebuilt in `src/components/ui`: brand, buttons, inputs,
  custom keyboard-accessible select, switch, segmented control, card, badge.
- Responsive layout tokens and safe-area handling in `src/app/globals.css`.
- UNO cards use the existing vector renderer with readable faces at every seat
  and hand size; playable cards get a yellow ring, selected cards lift.
- Reduced-motion handling for hand motion, dealing, summaries, and effects.

## Screens and flows

### Home

- Premium landing layout with a four-card table scene, room creation, join, and
  bot-practice flows.
- Room-code entry uses six controlled character inputs with paste support.
- Invite links (`?join=CODE`) open the Join tab with the code prefilled. The
  page remounts `HomeView` when the invite code is resolved so the controlled
  code input initializes correctly.
- House-rule controls cover table size, turn timer, match length, target score,
  and +2 stacking. +4 stacking remains intentionally off.

### Lobby

- Rebuilt as a cohesive room panel with invite copy action, player grid, ready
  state, host badge, rules summary, and host-only start flow.
- Handles one to ten players without dashboard-style card clutter.

### Game table

- Fixed game header, flexible table stage, and bottom hand dock.
- Adaptive opponent seating for two to ten players: natural arc for small
  tables, top row plus left/right columns for crowded tables.
- Central draw/discard cluster with a physical discard stack using the last
  four public discard cards; active color and pending +2 stack are visible.
- Opening deal animation starts from the central deck and targets real table
  seats. The local player's cards use real hand IDs; opponents receive
  face-down cards. Completion is remembered per game session through
  sessionStorage, with skip and reduced-motion paths.
- Wild color choice and Wild Draw Four challenge decisions render as contextual
  table panels, never full-screen blur dialogs.
- UNO supports both valid flows: declare before playing the second-to-last card,
  or call after playing when the engine exposes the missed-UNO catch window.
  The UI reads `unoDeclared`, `hasMissedUno`, and `canCallUno` from authoritative
  state rather than inventing a client-only catch window.
- Round/match summary displays scoring, winner treatment, confetti, host next
  round, and leave actions.

## Contract changes

- `PublicGameState` gained additive `recentDiscard?: UnoCard[]`.
- `getPublicGameState` serializes the last four discarded cards so the table can
  render a physical stack without exposing private hands.
- No authoritative rule logic was moved into presentation components.

## Verification

Executed successfully:

- `npx tsc --noEmit`
- `npx vitest run` — 17 tests passing
- `npm run build` — production build passes
- Targeted ESLint over the rewritten UI/table files reports no errors. The
  remaining `GameEffectLayer` exhaustive-deps warning is intentional: the effect
  keys off the observable action fields to avoid replaying effects when the
  parent recreates lookup objects.

Repo-wide lint still reports pre-existing issues outside the redesigned UI,
primarily `no-explicit-any` in API routes and `page.tsx`, plus
`react-hooks/set-state-in-effect` in the existing page orchestration. These were
not introduced by this redesign and were left unchanged to avoid widening the
scope into backend and session-management refactors.

## Manual browser checks

Not run in this pass. Recommended checks:

1. Open `/?join=CODE` and confirm the Join tab and code are prefilled.
2. Verify 2, 4, 6, and 10-player seating at desktop and phone widths.
3. Start a round and confirm the deal uses real local cards and every skip/
   reduced-motion path closes cleanly.
4. Play a Wild and a Wild Draw Four; confirm color choice and challenge actions
   stay inside the table.
5. Play to one card with and without declaring UNO; verify the catch window and
   post-play UNO recovery.
6. Finish a round and verify scoring, host next-round action, and leave flow.
