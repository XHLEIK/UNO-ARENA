# Security Policy

## Supported versions

Only the latest commit on `main` is supported. This is a personal,
non-commercial project maintained on a best-effort basis.

## Reporting a vulnerability

Please **do not open a public GitHub issue** for a security problem.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Select **Advisories** → **Report a vulnerability**.
3. Include reproduction steps, affected endpoint or component, impact, and any
   suggested fix.

If private reporting is unavailable, open a minimal public issue asking for a
private contact channel without disclosing technical details.

## In scope

- Disclosure of another player's hand or private state
- Session-token or reconnect-token forgery, theft, or replay
- Authorization bypass on room, start, ready, action, or cleanup endpoints
- Service-role key exposure in a client bundle
- Command replay or concurrency bugs that corrupt room state
- Wild Draw Four legality or UNO penalty manipulation
- Injection through nicknames, room codes, or command payloads
- Cross-room data access

## Deployment hardening

If you deploy this project publicly:

- Keep `SUPABASE_SERVICE_ROLE_KEY` and `CLEANUP_SECRET` server-side only.
- Never add a service-role key to a `NEXT_PUBLIC_*` variable.
- Put rate limiting or a WAF in front of room creation and join endpoints.
- Keep Supabase RLS enabled with no policies on `public.rooms`.
- Rotate keys immediately if a credential is exposed.
- Serve production traffic over HTTPS.
- Run the cleanup scheduler with a strong, randomly generated secret.
