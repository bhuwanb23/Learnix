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

SQLite→Postgres via Prisma · TypeScript strict · Express 5 (router per role) · Zod validation · shared-schema tenancy (`institutionId` everywhere + scoped client) · one `users` table + multi-role via `user_roles` + separate profile tables · JWT access 15m + rotating refresh · bcrypt cost 12 (dev 10) · platform super-admin provisions colleges · money in integer paise · actions as `POST /{entity}/{id}/{action}`.

> **ADR-13 (added):** schema is built **one user-role piece at a time** — not big-bang. Each role piece = schema slice → seed data → service → routes → smoke test → docs tick, all in one change. Domain A (identity/tenancy) and Domain L (audit/files/system) landed with the base; every other domain lands with its owning role.

## 📊 Live status — module-by-module wiring (one role at a time)

| Module | Role | Backend | Frontend | Status |
|---|---|---|---|---|
| Auth | all | ✅ `modules/auth` | ✅ login/refresh | Done |
| Alumni Relations | ALUMNI | ✅ `modules/alumni` | ✅ wired end-to-end | Done |
| HOD | HOD | ✅ `modules/hod` | ✅ wired end-to-end | Done |
| Sports & Cultural | SPORTS | ✅ `modules/sports` | ✅ wired end-to-end | Done |
| Transport | TRANSPORT | ✅ `modules/transport` | ✅ wired end-to-end | Done |
| Hostel | HOSTEL | ✅ `modules/hostel` | ✅ wired end-to-end | Done |
| **Library Staff** | **LIBRARY** | **✅ `modules/library`** | **✅ wired end-to-end** | **Done** |
| **Accounts & Finance** | **ACCOUNTS** | **✅ `modules/accounts`** | **✅ wired end-to-end** | **Done** |
| Student | STUDENT | ⬜ | ⬜ | Not started |
| Teacher | TEACHER | ⬜ | ⬜ | Not started |
| Admin | ADMIN | ⬜ | ⬜ | Not started |
| Placement Cell | PLACEMENT | ⬜ | ⬜ | Not started |
| Exam Cell | EXAMCELL | ⬜ | ⬜ | Not started |
| Accounts & Finance | ACCOUNTS | ⬜ | ⬜ | Not started |
| Platform + Master | PLATFORM_ADMIN | ⬜ | ⬜ | Not started |

**Next up:** student → teacher → admin → … (remaining modules per the one-role-at-a-time protocol)

## 🔁 How to work on the backend (any future session)

1. Read `00-decisions.md` (rules) → `06-phase-plan.md` (where we are).
2. Do the next unchecked items of the current phase.
3. Tick the boxes + update the status table above **in the same commit**.
4. If a new table/endpoint was added, update `02`/`04`/`05` in the same commit.
5. Phase exit: `npm test` (incl. tenant isolation test) + `prisma validate` + boot smoke test.
