# UNO ARENA — Security Architecture

This document describes the security controls that exist in the shipped code.
It is not a claim of formal certification.

## 1. Threat model and mitigations

| Threat | Attack vector | Mitigation |
|---|---|---|
| Hand snooping | Client reads opponent cards | Opponent hands are removed from `PublicGameState`; private hands are returned only by the authenticated hand endpoint. |
| Card ownership spoofing | Client submits a card it does not own | The server verifies the `cardId` exists in the caller's authoritative hand before applying the play. |
| Out-of-turn moves | Client plays when it is not their turn | The engine validates `currentPlayerId` and the active phase. |
| Race conditions | Two clients submit moves simultaneously | `store_version` optimistic concurrency; the losing write is rejected and retried. |
| Command replay | Client retries the same command | `commandId` receipts are stored per room and return the original result. |
| Service-role leakage | Browser bundle exposes the backend key | The admin client is server-only and reads `SUPABASE_SERVICE_ROLE_KEY`; the browser uses the publishable key. |
| Room data exposure | Browser queries Supabase directly | `public.rooms` has RLS enabled with no policies and is granted only to `service_role`. |
| Reconnect token theft | Guessing or replaying a token | 256-bit random tokens, stored as SHA-256 hashes, rotated on successful reconnect. |
| Wild Draw Four cheating | Playing +4 while holding the active color | Legality is evaluated against the real hand on the server; only the outcome is broadcast. |
| Unauthorized cleanup | Anyone deletes room history | Cleanup requires the `x-cleanup-secret` header and refuses to delete active games. |
| Input injection | Malformed JSON or oversized values | Zod schemas bound strings, enums, counts, and timers at every route. |

## 2. Token model

- `sessionToken` — opaque bearer credential issued at create/join and required
  for mutations and private hand reads. Stored in the browser's
  `localStorage` under `uno-arena-session`.
- `reconnectToken` — 32 random bytes, returned once to the client. Only its
  SHA-256 hash is stored in the room record. A successful reconnect rotates
  the token.
- Anonymous play means there are no passwords, emails, or account recovery
  flows. A cleared browser session loses the seat unless the reconnect token
  was preserved.

## 3. Database controls

- `public.rooms` has RLS enabled and no policies.
- `anon` and `authenticated` have no table privileges.
- `service_role` has table access and execute permission on the cleanup
  function.
- The table stores one JSONB snapshot per room; there are no player-facing
  queries against it.

## 4. Known limitations

- **No built-in rate limiting.** Add a WAF or platform rate limit before
  exposing room creation and join endpoints publicly.
- **No formal CSRF token.** Mutations are JSON POST requests authenticated with
  a bearer token from `localStorage`; they are not cookie-authenticated.
  Protect against XSS, which is the relevant credential-theft vector.
- **No end-to-end encryption.** Traffic must be served over HTTPS.
- **Best-effort realtime.** Broadcast messages contain only a room ID, so a
  leaked broadcast does not expose hands.
- **In-memory fallback is not production storage.** It is per-process and
  non-durable.

## 5. Secret handling

- `.env*` is ignored except `.env.example`.
- Never put a service-role key in `NEXT_PUBLIC_*`.
- Never import `src/lib/supabase/admin.ts` from a client component.
- If a key is exposed, revoke it in Supabase and redeploy with a new value
  before making the repository or deployment public.

## 6. Reporting

See [`../SECURITY.md`](../SECURITY.md) for private vulnerability reporting.
