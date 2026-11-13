# UNO ARENA — Frontend Redesign Report

## Summary

The frontend was rebuilt around the existing authoritative UNO engine without
introducing a second rules implementation. The result is a dark, physical
card-table experience with a new design system, rebuilt home and lobby surfaces,
an adaptive multiplayer table, table-based dealing, contextual Wild/challenge
decisions, and a premium round summary.

Detailed table notes are in `GAME_TABLE_IMPLEMENTATION_REPORT.md` and
`GAME_TABLE_REFERENCE_AUDIT.md`. Pre-redesign findings are in
`FRONTEND_DESIGN_AUDIT.md`.

## Design decisions

- Deep green-black felt surface with restrained ambient color, not a neon
  dashboard.
- Yellow is the primary interaction accent; UNO red, blue, and green remain
  card identities rather than UI decoration.
- `Outfit` / `DM Sans` / `JetBrains Mono` establish display, body, and utility
  typography.
- Cards remain the visual focus; table chrome is intentionally quiet.
- Contextual decisions stay inside the table so the hand and discard remain
  visible.
- Motion is short and purposeful, with reduced-motion fallbacks.

## Screens

### Home

- Balanced hero with a four-card scene and a single primary play panel.
- Create, Join, and Practice are separated into tabs.
- Join ignores bot settings; Practice owns bot count, difficulty, personality,
  and match length.
- Invite links open the Join tab with a prefilled room code.
- Custom room-code, select, switch, and segmented controls are rebuilt and
  keyboard operable.

### Lobby

- Invite-first composition with room code, copy action, player grid, ready
  controls, house rules, and host start flow.
- Host and ready states are visible without dashboard-card clutter.

### Table

- Compact header, flexible table stage, central draw/discard cluster, perimeter
  seating, and a bottom hand dock.
- Adaptive seating for 2–10 players.
- Deterministic discard stack with recent cards visible.
- Opening deal from the actual draw pile to actual seats.
- Playable-card highlighting, selected lift, scroll-safe hands, and drawn-card
  outline.
- UNO declaration and post-play catch-window recovery.
- Non-blocking Wild color and Wild Draw Four challenge panels.
- Action effects for skip, reverse, draw two, wild, wild draw four, stacking,
  and challenge outcomes.
- Card-play flights from the acting player's hand/seat to the discard stack.
- Round/match summary with score table, winner treatment, host next round, and
  leave action.

## Existing functionality preserved

- Next.js API routes and Supabase room storage.
- Local practice controller and online multiplayer.
- Authoritative play/draw/pass/UNO/color/challenge commands.
- Bot turns, room lifecycle, reconnect, scoring, and host migration.
- +2 stacking only; +4 stacking remains intentionally unavailable.
- Private hands remain private; only counts and public UNO state are exposed.

## API shape change

`PublicGameState.recentDiscard?: UnoCard[]` was added so the presentation layer
can draw the last four discarded cards. `getPublicGameState` supplies the data.
This is additive; no authoritative rule or command changed.

## Verification

Executed:

- `npx tsc --noEmit` — passed.
- `npx vitest run` — 1 file, 17 tests passed.
- `npm run build` — production build passed.
- Targeted ESLint over rewritten table/UI files — no errors; one intentional
  `GameEffectLayer` dependency warning.
- Repo-wide ESLint — 24 errors and 5 warnings remain, all pre-existing in API
  routes, page orchestration, engine/simulation `prefer-const`, sound, and type
  files. They were not introduced by this redesign.

Not executed:

- Playwright or browser screenshot QA. The user chose manual browser
  verification. No screenshots are claimed.
- Production deployment or live multiplayer soak testing.

## Known limitations

- Ordinary draws and penalty draws are reflected immediately in hand/card
  counts; the table does not yet animate every individual drawn card from the
  pile to the player. Action effects currently communicate the event and
  penalty amount.
- The deal has no independent shuffle flourish; it starts from the authoritative
  deck state and deals the seven-card sequence with staggered motion.
- No reference screenshots were present in the workspace, so visual comparison
  used `Design.md` descriptions rather than image diffing.
- Repo-wide lint debt and the existing page-level synchronous-effect warnings
  remain outside this frontend scope.

## Manual QA checklist

1. 320–430 px portrait, tablet, and 1366×768 desktop: no horizontal overflow,
   clipped hand, or overlapping seats.
2. Invite link opens Join with a prefilled code.
3. Two-, four-, six-, and ten-player tables render without seat collisions.
4. Deal animation, skip, reduced motion, and reconnection behavior.
5. Wild color selection and Wild Draw Four challenge stay within the table.
6. UNO before play, missed UNO after play, and opponent catch.
7. +2 stacking resolution.
8. Round and match summary scoring, next round, and leave.
