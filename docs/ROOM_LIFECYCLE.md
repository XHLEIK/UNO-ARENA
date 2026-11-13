# UNO ARENA — Room Lifecycle

- States: LOBBY, IN_GAME, FINISHED.
- Creation, join, ready, start, leave, reconnect.
- Host migration on leave/disconnect.
- Cleanup excludes IN_GAME even if expired.
- Completed rooms retained 15 minutes then expired.
