# UNO ARENA — Game Table Implementation Report

## Outcome

The game table was rebuilt as a single immersive surface while keeping the
authoritative engine and room contracts intact. The implemented experience
covers the full table lifecycle: lobby exit, opening deal, turn play, contextual
wild/challenge decisions, UNO calls, action feedback, and round results.

## Components changed

### Shared UI and shell

- `src/app/layout.tsx` — `Outfit`, `DM Sans`, and `JetBrains Mono` font wiring,
  metadata, and viewport configuration.
- `src/app/globals.css` — design tokens, felt table, card, hand, seat, decision,
  effect, lobby, home, and summary styles; desktop, tablet, portrait, and
  landscape breakpoints; safe-area handling.
- `src/components/ui/index.tsx` — brand, buttons, inputs, custom keyboard-
  accessible select, switch, segmented control, card, badge.
- `src/components/ui/RoomCodeInput.tsx` — controlled six-character room-code
  entry with paste, navigation, and disabled states.

### Home and lobby

- `src/components/home/HomeView.tsx` — landing composition, Create/Join/
  Practice tabs, room-code entry, match settings, bot settings, house-rule
  summary, and accessible rules dialog.
- `src/components/lobby/LobbyView.tsx` — invite copy, player grid, host badge,
  ready controls, rule summary, and host start flow.

### Table

- `src/components/table/GameTable.tsx` — table integration, adaptive seating,
  contextual decision layer, deal session, UNO state, sound, invite copy, and
  summary orchestration.
- `src/components/table/GameStartSequence.tsx` — table-based deal animation,
  actual local card IDs, face-down opponent cards, seat targets, skip, and
  reduced-motion completion.
- `src/components/table/PlayerSeat.tsx`, `PlayerAvatar.tsx`, `OpponentHand.tsx`
  — seat presentation, turn state, card backs, UNO and missed-UNO indicators.
- `src/components/table/PlayerHand.tsx` — scroll-safe hand, dynamic overlap,
  fanned cards, playable rings, selected lift, and keyboard-operable buttons.
- `src/components/table/DrawPile.tsx`, `DiscardPile.tsx`,
  `DiscardCardStack.tsx` — central piles, draw affordance, deterministic recent
  discard stack, and active color/store context.
- `src/components/table/GameHeader.tsx` — compact header, room code, sound, and
  leave controls.
- `src/components/table/GameActionBar.tsx`, `UnoButton.tsx`,
  `WildColorSelector.tsx`, `DrawFourChallengePanel.tsx`,
  `GameEffectLayer.tsx` — contextual actions, non-blocking wild color and
  challenge decisions, UNO/catch state, and event-driven action feedback.
- `src/components/modals/RoundSummaryModal.tsx` — winner treatment, score
  table, confetti, host next-round, and leave actions.
- `src/components/card/UnoCardRenderer.tsx` — preserved vector card system and
  extended presentation states.

### State contract

- `src/types/index.ts` — additive `recentDiscard?: UnoCard[]` on
  `PublicGameState`.
- `src/lib/game-engine/engine.ts` — `getPublicGameState` serializes the last
  four discard cards for the physical stack. No rule behavior changed.

## Seating

- 2 players: human bottom, opponent top.
- 3 players: two opponents upper-left and upper-right.
- 4 players: top opponent plus left and right opponents.
- 5–6 players: top row plus one opponent per side.
- 7–10 players: adaptive top row plus two or three seats per side.
- Seat chips switch to compact sizes at crowded tables and scale down further at
  eight or more opponents.
- The central play area remains clear because side seats use the perimeter, not
  the middle.

## Dealing

- The deal layer sits on the actual table stage.
- Cards originate at the center draw pile and animate to the same seat
  coordinates used during gameplay.
- The local player's seven cards use the real private hand IDs and faces;
  opponents receive face-down cards.
- The sequence is skippable, respects reduced motion, and records completion in
  sessionStorage per authoritative `gameSessionId`.
- Animation completion never advances authoritative state.

## Hand and card actions

- The hand is horizontally scrollable when needed and uses dynamic overlap
  rather than shrinking cards below a readable width.
- Playable cards come from the engine-provided `isPlayable` flag; visibility is
  recalculated on every private-state update.
- Selected wild cards lift and open the contextual color selector.
- Drawn cards receive an outline in the hand.
- Cards are buttons with labels and keyboard support; dragging is not required.

## Decisions and UNO

- Wild color selection is a compact table panel with four large color choices.
- Wild Draw Four challenge is a compact panel showing the challenged player,
  previous color, penalty, timer, and Challenge/Accept actions.
- The player who played the Wild Draw Four chooses the color; the victim chooses
  challenge or accept.
- No normal gameplay decision uses a full-screen blur.
- UNO can be declared before playing the second-to-last card; the declaration is
  forwarded on the play command.
- If the player enters a one-card hand without declaring, the missed-UNO window
  is shown from authoritative state and the player can still call UNO while the
  window remains open.
- Opponents with a missed UNO window receive a catch action.

## Action effects

`GameEffectLayer` reacts to authoritative `lastAction` values and presents:

- Stacking / +2 penalty badge.
- Missed-UNO catch.
- Wild Draw Four challenge result.
- Skip, Reverse, Draw Two, Wild, and Wild Draw Four badges.

Effects are short, transform/opacity based, and do not block input. The layer
does not fabricate cards or rule outcomes.

### Card-play flight

`CardPlayFlightLayer` watches authoritative `CARD_PLAYED` events and flies the
played card from the acting player's table seat to the discard stack. The local
player's flight starts from the actual clicked hand card, captured before the
command is sent. Opponent and bot flights start from their rendered seat.

The flight carries the real public card face, uses the actual discard target,
shrinks to the pile card size, never blocks input, and is skipped when reduced
motion is requested. It is presentation-only and does not delay or alter the
authoritative turn.

## Responsive behavior

- Game shell uses `100dvh`, a fixed compact header, flexible table stage, and a
  bottom hand dock.
- Safe-area insets are applied in the header and hand dock without double
  padding.
- Home and lobby layouts collapse to single-column panels on narrow screens.
- Table seats switch to compact chips and scale at crowded tables.
- Contextual decision panels are anchored inside the table stage and sized to
  the viewport.
- The hand row scrolls rather than overflowing the page.
- The hand dock no longer paints an opaque footer bar; the hand cards sit directly
  over the table shell without a black strip behind or under them.

## Performance decisions

- Opponent card backs are lightweight repeated layers, not full card faces.
- Only four recent discard cards are rendered in the physical stack.
- Deal steps are built once with `useMemo` from authoritative state.
- Event effects key off observable action fields so unrelated parent renders do
  not replay them.
- Animations use transforms and opacity; authoritative commands are accepted
  independently of animation completion.

## Preserved functionality

- Next.js App Router routes and Supabase-backed room storage.
- Local practice controller and online multiplayer paths.
- Bot turns, difficulty, personality, and room start behavior.
- Engine legality, scoring, challenge resolution, reconnect, and room lifecycle.
- Existing command contracts and private-hand boundaries.
- +2 stacking only; +4 stacking intentionally remains off.

## Verification and limitations

- `npx tsc --noEmit`: passed.
- `npx vitest run`: 17 tests passed.
- `npm run build`: passed.
- Targeted ESLint on rewritten UI files: no errors; one intentional
  exhaustive-deps warning in `GameEffectLayer`.
- Repo-wide lint retains pre-existing API/page/engine issues; see
  `FRONTEND_DESIGN_AUDIT.md`.
- Browser screenshots and Playwright visual QA were not run in this pass; the
  user chose manual browser verification.
- The action layer communicates effects and penalties, but it does not yet
  animate each penalty card travelling from the draw pile to the victim. The
  same applies to ordinary draw-card flights. Those are presentation gaps, not
  rule gaps.
- No reference screenshots were present in the workspace.
