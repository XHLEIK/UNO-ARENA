# UNO ARENA — Performance Engineering & Latency Budgets

## 1. Latency Budgets & Benchmarking Targets
- **Engine Transition Execution**: < 2 ms (pure CPU in-memory state transition).
- **Database Transaction (Lock, Validate, Update, Outbox Insert)**: P95 < 25 ms.
- **Fastify Request-to-Response**: P95 < 35 ms.
- **Supabase Realtime Broadcast Fanout**: P95 < 75 ms to connected clients.
- **Reconnection State Restoration**: < 1.5 seconds.

## 2. Frontend Rendering Optimization
- SVG Vector card rendering uses static path definitions and CSS transforms.
- Opponent hands render lightweight back-faces without complex DOM subtrees.
- Sound effects use Web Audio API audio buffers loaded once on initial interaction.
- Framer Motion animations run hardware-accelerated (`transform: translate3d(...)`, `opacity`).
