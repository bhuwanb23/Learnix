# Learnix Backend

Node + TypeScript + Express 5 + Prisma (SQLite dev → Postgres later) + JWT auth.
**Multi-college SaaS**: shared schema, `institutionId` on every tenant table.
Everything is specced in `docs/backend/` — read `00-decisions.md` first.

## Status

**Phase 0 (base) complete**: scaffold + identity/tenancy schema slice + auth
(login/refresh/logout/me) + seed + boot smoke-tested.

## Setup

```bash
cd backend
npm install
cp .env.example .env        # or use the checked-in .env for dev
npm run prisma:migrate      # creates prisma/dev.db
npm run prisma:seed
npm run dev                 # tsx watch → :4000
```

## Seeded logins (password: `Passw0rd!`)

| Email | Role |
|---|---|
| platform@learnix.dev | PLATFORM_ADMIN |
| admin@learnix.dev | ADMIN |
| teacher@learnix.dev | TEACHER |
| student@learnix.dev | STUDENT |

## Endpoints live now

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | no auth |
| POST | `/api/v1/auth/login` | email + password (+ optional institutionCode) |
| POST | `/api/v1/auth/refresh` | rotation + reuse detection (family revoke) |
| POST | `/api/v1/auth/logout` | revokes the given refresh token |
| GET | `/api/v1/auth/me` | bearer token → user + roles + profiles |

## Conventions (enforced by structure)

- Services query through the tenant-scoped client; the raw client never leaves `src/db/`.
- Errors: `{ error: { code, message, details? } }` with stable codes (`AUTH_UNAUTHENTICATED`, …).
- Money will be Int paise (`*Minor`). Status strings match `docs/backend/05-state-machines.md`.
- New domains are added **one user-role piece at a time** — schema slice → service → routes → smoke test → docs tick.
