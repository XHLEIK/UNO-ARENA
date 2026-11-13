# Contributing

Thanks for taking a look at UNO ARENA. This is a personal, non-commercial
project, and contributions are welcome on that basis.

## Ground rules

- By contributing, you agree that your contribution is licensed under the
  project's [PolyForm Noncommercial License 1.0.0](LICENSE).
- Do not add Mattel logos, card artwork, packaging, fonts, or other proprietary
  assets. Card faces and UI art must remain original work.
- Do not add secrets, `.env` files, API keys, or private credentials.
- Keep the game engine pure and deterministic. No network, database, timer, or
  React imports inside `src/lib/game-engine/`.
- Keep online rule decisions server-authoritative. The browser must never be
  trusted to validate a move.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase is optional for local development; without credentials, rooms use the
in-memory store.

## Before opening a pull request

```bash
npm test
npm run build
npm run lint
```

`npm run lint` currently has pre-existing warnings and errors. Do not add new
ones, and do not suppress existing findings to make a change pass.

## Pull requests

- Keep changes focused on one problem.
- Explain the user-visible behavior and the technical approach.
- Include or update tests for engine, rule, or persistence changes.
- Update the README or relevant `docs/` file when behavior changes.

## Security

Report vulnerabilities privately through the process in
[SECURITY.md](SECURITY.md). Do not open a public issue for a security problem.
