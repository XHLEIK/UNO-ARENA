# UNO ARENA — Operations & Runbook

## 1. Health Checks & Monitoring
- **Liveness Endpoint**: `GET /health` $\rightarrow$ `{ "status": "ok", "uptime": 12345 }`
- **Readiness Endpoint**: `GET /ready` $\rightarrow$ Checks database connection pool and Supabase Realtime connectivity.

## 2. Background Tasks & Outbox Dispatcher
- The Fastify backend runs an in-process outbox dispatcher poll interval (every 250ms) to ensure pending events in `event_outbox` are dispatched to Supabase Realtime Broadcast.
- Failed events are retried with exponential backoff up to 5 times.
- Stale rooms (> 24 hours inactive) are marked `ABANDONED` by a daily maintenance cleanup query.
