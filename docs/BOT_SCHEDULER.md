# UNO ARENA — Bot Scheduler

- Local: `setTimeout`-based scheduler with version checks.
- Online: synchronous drain in room mutations (`runBotTurns`).
- Cancels stale decisions when version changes.
- Fallback actions prevent freezes.
- Guard limit prevents infinite loops.
