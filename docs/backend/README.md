# Learnix Backend — Docs Index & Status

> The backend is **doc-driven**: these files are the source of truth for every schema table, endpoint, and state rule. Code follows docs — never the reverse. When reality changes, update docs in the same commit.

---

## 📖 The docs (read in this order)

| # | Doc | What it answers |
|---|-----|-----------------|
| 00 | [Decisions (ADRs)](00-decisions.md) | **What was decided and why** — DB, ORM, tenancy, auth, money, scope. Final unless user revisits. |
| 01 | [Architecture](01-architecture.md) | Stack, project layout, request lifecycle, conventions, testing policy |
| 02 | [Database schema](02-database-schema.md) | **All ~96 tables** in 12 domains, FK spine, Postgres switch checklist |
| 03 | [Auth & RBAC](03-auth-rbac.md) | Users/roles/profiles, JWT design, middleware, permission keys, seed users |
| 04 | [API surface](04-api-surface.md) | Complete endpoint map, action registry, per-role module table |
| 05 | [State machines](05-state-machines.md) | Every status flow + cross-module write-throughs + notification matrix |
| 06 | [Phase plan](06-phase-plan.md) | **The live progress tracker** — checkboxes updated as work completes |

Supporting docs: [`docs/users/*`](../users/README.md) — per-role frontend contracts (entities, fields, actions) that the API serves. `02-database-schema.md` and `04-api-surface.md` cite them.

## 🔒 Locked decisions (one line each)

SQLite→Postgres via Prisma · TypeScript strict · Express 5 (router per role) · Zod validation · shared-schema tenancy (`institutionId` everywhere + scoped client) · one `users` table + multi-role via `user_roles` + separate profile tables · JWT access 15m + rotating refresh · bcrypt cost 12 · platform super-admin provisions colleges · money in integer paise · full schema built in one pass, API in phases · actions as `POST /{entity}/{id}/{action}`.

## 📊 Live status

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold + full Prisma schema + seed | ⬜ Not started |
| 1 | Auth, tenancy, platform, master data | ⬜ Not started |
| 2 | Academic core (teacher/student/hod/admin + attendance + assignments) | ⬜ Not started |
| 3 | Exams & results | ⬜ Not started |
| 4 | Money (accounts, unified payments, write-throughs) | ⬜ Not started |
| 5 | Library, hostel, transport | ⬜ Not started |
| 6 | Placement, sports, alumni, events, comms | ⬜ Not started |
| 7 | Frontend integration (all 12 apps) | ⬜ Not started |
| 8 | Hardening + Postgres + deploy | ⬜ Not started |

**Next up:** Phase 0 — scaffold `backend/` and write the full `schema.prisma` from `02-database-schema.md`.

## 🔁 How to work on the backend (any future session)

1. Read `00-decisions.md` (rules) → `06-phase-plan.md` (where we are).
2. Do the next unchecked items of the current phase.
3. Tick the boxes + update the status table above **in the same commit**.
4. If a new table/endpoint was added, update `02`/`04`/`05` in the same commit.
5. Phase exit: `npm test` (incl. tenant isolation test) + `prisma validate` + boot smoke test.
