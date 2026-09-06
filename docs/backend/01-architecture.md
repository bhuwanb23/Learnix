# 01 — Backend Architecture & Conventions

> How the backend is organized. Every phase must follow this layout — no one-off structures.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js ≥ 20 (repo has v24) | ESM modules |
| Language | TypeScript `strict` | ADR-03 |
| HTTP | Express 5 | One router file per role (ADR-04) |
| ORM | Prisma | SQLite dev → Postgres prod (ADR-01/02) |
| Validation | Zod | Every request body/query/param |
| Auth | bcrypt + jsonwebtoken | Access 15 min / refresh 30 d (ADR-07) |
| Logging | pino (+ pino-pretty dev) | Request logs with `requestId` |
| Config | dotenv + typed config module | Fail-fast on missing env |
| Testing | vitest + supertest | Auth + tenant isolation + state machines are mandatory tests |
| Lint/format | eslint + prettier | Runs in CI later |

## 2. Project layout

```
backend/
├── package.json
├── tsconfig.json
├── .env / .env.example
├── prisma/
│   ├── schema.prisma          # full schema, one banner per domain
│   └── seed.ts                # platform + demo college + role users
└── src/
    ├── server.ts              # bootstrap: express app + graceful shutdown
    ├── app.ts                 # express assembly (middlewares + routers)
    ├── config/
    │   └── env.ts             # typed env (PORT, JWT_SECRET, DATABASE_URL…)
    ├── db/
    │   ├── prisma.ts          # raw PrismaClient (never exported to services)
    │   └── tenant.ts          # withTenant(institutionId) scoped client — THE way to query
    ├── lib/
    │   ├── enums.ts           # ALL status enums (single source, mirrors schema strings)
    │   ├── errors.ts          # AppError + typed error classes
    │   ├── audit.ts           # writeAudit(actor, action, entity, before, after)
    │   └── pagination.ts      # parsePage(query) helper
    ├── middlewares/
    │   ├── auth.ts            # verify JWT → req.auth {userId, institutionId, roles[]}
    │   ├── requireRole.ts     # role gate: requireRole('TEACHER','HOD')
    │   ├── validate.ts        # zod validate(body|query|params, schema)
    │   ├── errorHandler.ts    # AppError → JSON envelope; unknown → 500 (logged)
    │   └── requestContext.ts  # requestId + pino child logger
    ├── modules/               # one folder per role = frontend parity
    │   ├── auth/              # auth.routes.ts, auth.service.ts, auth.schemas.ts
    │   ├── platform/          # PLATFORM_ADMIN only: institutions, first admin
    │   ├── master/            # shared master data reads (departments, courses…)
    │   ├── student/ teacher/ admin/ hod/
    │   ├── placement/ examcell/ accounts/ library/
    │   ├── hostel/ transport/ sports/ alumni/
    │   └── notifications/     # shared inbox/broadcast service used by all
    └── types/
        └── express.d.ts       # declare req.auth typing
```

**Rules**
- `modules/{role}/{role}.routes.ts` mounts at `/api/v1/{role}` exactly as `docs/users/*` API surfaces specify. No version drift per module.
- Route file order: `router.use(auth)` → `requireRole(...)` → `validate(schema)` → handler. Handlers ≤ ~15 lines.
- Services receive the **tenant-scoped client** from `req.tenantDb` (attached by `requestContext`) — they never import `prisma.ts` directly. This is the tenancy enforcement from ADR-05.
- Cross-module reads (e.g. teacher service reading enrollments) go through the owning module's **service function**, not ad-hoc Prisma queries, so business rules stay in one place.

## 3. Request lifecycle

1. `requestContext` → requestId, logger.
2. `auth` → verify access JWT → `req.auth = { userId, institutionId, roles }`.
3. `requireRole` → 403 if none of the required roles present.
4. `withTenant(req.auth.institutionId)` → `req.tenantDb`.
5. `validate` → parsed DTO.
6. Service → Prisma via `req.tenantDb` (+ `audit.writeAudit` on mutations).
7. `errorHandler` → envelope `{ error: { code, message, details? } }`.

## 4. Response & error conventions (ADR-11)

- Success: `200 { data }` · list: `200 { data, page, pageSize, total }` · create: `201 { data }`.
- Errors: `400 validation` · `401 unauthenticated` · `403 forbidden` · `404 not_found` · `409 conflict` (e.g. timetable clash, double approval) · `422 unprocessable` (business rule) · `500 internal`.
- Error codes are stable strings (`AUTH_INVALID_CREDENTIALS`, `TENANT_MISMATCH`, `EXAM_ROOM_CONFLICT`…) — the frontend will branch on them.

## 5. Database conventions

- Every tenant model: `institutionId String` + `@@index([institutionId])` (+ composite uniques per-institution: `@@unique([institutionId, code])`).
- Every model: `createdAt`, `updatedAt`; soft delete only where ADR-02 lists it.
- Status fields: `String` typed by `enums.ts` union + Zod enum at the edge. Values exactly match the state machines in `05-state-machines.md`.
- Money: `Int` paise (`*Minor` suffix: `amountMinor`, `targetMinor`).
- Attachments/exports: `fileId` FKs to shared `files` table.
- Actor stamps on approvals/payments: `actionedByUserId`.

## 6. Configuration (.env)

```
DATABASE_URL="file:./dev.db"
PORT=4000
NODE_ENV=development
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:8081
```

## 7. Commands

```
npm run dev            # tsx watch src/server.ts
npm run build          # tsc
npm run prisma:migrate # prisma migrate dev
npm run prisma:seed    # tsx prisma/seed.ts
npm test               # vitest
```

## 8. Testing policy (per phase)

- **Mandatory:** auth flows, tenant isolation (user of college A cannot read college B), every state machine transition (happy + invalid), money arithmetic.
- Each module folder carries `*.test.ts` colocated with services.
