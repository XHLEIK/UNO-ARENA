# UNO ARENA — Deployment Guide

The application is one Next.js project. It can be deployed to Vercel, a Node
container, or any host that runs Next.js. Supabase provides durable storage and
optional Realtime fan-out.

## 1. Requirements

- Node.js **20.9+**
- A Supabase project (recommended for any public deployment)
- npm (a `package-lock.json` is committed)

## 2. Environment variables

Set these on the hosting platform, never in the repository:

| Variable | Exposure | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Online mode |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Online mode |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Online mode |
| `CLEANUP_SECRET` | Server only | Cleanup endpoint |

`SUPABASE_SECRET_KEY` is accepted as a server-side alias for the service-role
key. Do not add either server secret to a `NEXT_PUBLIC_*` variable.

Without Supabase credentials the app starts in memory mode. That mode is
single-process and non-durable; do not use it in production.

## 3. Database setup

1. Create a Supabase project.
2. Open the SQL editor and run
   [`../supabase/migrations/0001_rooms.sql`](../supabase/migrations/0001_rooms.sql).
   With the Supabase CLI:

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

3. Confirm `public.rooms` has RLS enabled and no policies.
4. Copy the project URL, publishable key, and service-role key into the hosting
   environment.

The migration also creates `public.uno_cleanup_expired_rooms()` for scheduled
cleanup.

## 4. Build and run

```bash
npm ci
npm run test
npm run build
npm start
```

`npm run build` runs Next.js's production build and TypeScript checks. The
default start command serves on port 3000; set `PORT` if your host requires it.

## 5. Vercel

1. Import `XHLEIK/UNO-ARENA` into Vercel.
2. Framework preset: **Next.js**.
3. Add the environment variables from section 2 to Production and Preview.
4. Deploy.
5. Verify `GET /api/health` returns `"storage": "postgres"` and
   `"realtime": "supabase"`.

Vercel's serverless functions cannot share the in-memory fallback. Supabase is
required for rooms to survive across requests and instances.

## 6. Cleanup schedule

`POST /api/maintenance/cleanup` requires the cleanup secret:

```bash
curl -X POST "https://your-domain.example/api/maintenance/cleanup?limit=50" \
  -H "x-cleanup-secret: $CLEANUP_SECRET"
```

Run it daily from your scheduler. Active `IN_GAME` rooms are never deleted;
expired lobby and finished rooms are removed.

## 7. Health and monitoring

- `GET /api/health` — storage mode, realtime configuration, uptime.
- Watch response times and 5xx rates on `/api/rooms/*`.
- Alert on repeated `storage: "memory"` in production; it means the service
  key is missing.
- Check Supabase row counts and the `rooms_expires_at_idx` query plan if the
  table grows unexpectedly.

## 8. Scaling notes

- Route handlers are stateless when Supabase is configured.
- Room commands are serialized with `store_version`; expect retries under
  heavy contention.
- Realtime is best-effort. Clients poll every four seconds, so a Realtime
  outage increases latency but does not corrupt state.
- Put rate limiting or a WAF in front of room creation and join endpoints.
  The app does not ship with a built-in rate limiter.

## 9. Rollback

1. Redeploy the previous commit.
2. If a schema change is involved, apply a reverse Supabase migration before
   rolling back application code.
3. Rotate `CLEANUP_SECRET` if it may have leaked.
4. Rotate the Supabase service-role key in the Supabase dashboard and update
   the host environment if the key was exposed.
