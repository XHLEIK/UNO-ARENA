# UNO ARENA — Data Retention

- Completed rooms: 15-minute retention (`COMPLETED_RETENTION_MS`).
- Cleanup route + `cleanupExpiredRooms` batch deletion.
- Active IN_GAME rooms never deleted.
- Idempotent cleanup.
- Local games: no DB records.
