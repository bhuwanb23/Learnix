# 00 — Locked Decisions (Architecture Decision Records)

> These decisions are **final** unless the user explicitly revisits them. Every future backend doc and line of code must comply with this file. Status: ✅ decided, 🔜 deferred, ⚠️ risk noted.

---

## ADR-01 · Database: SQLite (dev) → PostgreSQL (prod)

- **Decision:** Develop against **SQLite**, migrate to **PostgreSQL** before production.
- **Why:** Zero local setup for fast iteration; Prisma keeps the schema DSL database-agnostic, so the switch is a provider change + one migration, not a rewrite.
- **Rules to keep the migration painless:**
  - No SQLite-only column types beyond what Prisma abstracts (`String`, `Int`, `Float`, `Boolean`, `DateTime`, `Json`, `Bytes`).
  - **No DB-level enums** (SQLite doesn't support them) — all enums are **TypeScript string unions mirrored as Prisma `String` columns with a CHECK-style constraint enforced in the service layer + a shared `src/lib/enums.ts`**. Never free-text a status.
  - Money = **integer paise** (`Int`), never floats. Currency display divides by 100 at the API edge.
  - Relations and indexes declared in Prisma schema only; no raw SQL migrations.
- ⚠️ **SQLite limits we accept in dev:** no concurrent-write parallelism (fine for one dev), no native UUID (Prisma `cuid()` handles it), no `RETURNING` (use Prisma queries).

## ADR-02 · ORM: Prisma

- **Decision:** Prisma for schema, migrations (`prisma migrate dev`), client generation, and seeding (`prisma db seed`).
- **Why:** Schema-first with type generation into TypeScript; the whole DB is one reviewable `schema.prisma` file.
- **Rules:**
  - `schema.prisma` is split by **domain comment banners** (one section per domain below) but stays a single file so `prisma format` works cleanly.
  - Every model gets explicit `@map`/`@@map` snake_case table/column names? — **No.** Use Prisma's default camelCase; naming consistency is enforced by convention, not mapping boilerplate for 90+ tables.
  - Tenant + audit columns (`institutionId`, `createdAt`, `updatedAt`) on every tenant-owned model — see ADR-05.
  - Soft delete (`deletedAt DateTime?`) only on models where the docs require retention (students, teachers, users, files, payments). Everything else hard-deletes.

## ADR-03 · Language: TypeScript (strict)

- **Decision:** All backend code in **TypeScript, `strict: true`**.
- **Why:** ~90-table schema + 150+ endpoints need compile-time safety; Prisma generates types directly into the codebase.
- **Rules:** No `any` without an inline justification comment. Zod for request validation (runtime) — Prisma types are compile-time only and don't validate input.

## ADR-04 · HTTP framework: Express 5

- **Decision:** Express with **one router file per role** (`routes/students.routes.ts`, `routes/teacher.routes.ts`, …) mounted under versioned prefixes (`/api/v1/...`).
- **Why:** Mirrors the frontend's per-role app structure (`learnix/users/*`) and the per-role API surfaces already documented in `docs/users/*`.
- **Rules:** Controllers stay thin (validate → call service → respond); business logic lives in `services/`; no SQL in route files.

## ADR-05 · Tenancy: shared schema + `institutionId` on every tenant table

- **Decision:** One database. Every tenant-owned table carries `institutionId`. Platform/shared tables (institutions, platform_admins, subscription plans) do not.
- **Enforcement (defense in depth):**
  1. **Prisma client extension** (`withTenant`) that injects `institutionId` into every `find*/create/update/count/aggregate` on tenant models — services must use the tenant-scoped client, never the raw one.
  2. Every tenant model's Prisma schema includes an explicit **named index `@@index([institutionId, ...])`** and relations keyed by the tenant.
  3. An integration test asserts any tenant-model query without a tenant scope throws.
- **Platform super-admin** operates *with* an institution context (must select a college to act on) — no cross-tenant data mixing in one request.
- ⚠️ **Risk noted:** tenant-scoping is the #1 source of SaaS data leaks. The `withTenant` extension is mandatory in code review; the raw Prisma client is not exported from `src/db/`.

## ADR-06 · Identity: one `users` table, multi-role via `user_roles`

- **Decision:** Single `users` table (auth identity: email, passwordHash, institutionId, status). Roles are **rows in `user_roles`** (many-to-many), not a column on users. Domain profiles are separate tables keyed by `userId`:
  - `student_profiles` (rollNo, program, batch, section…)
  - `staff_profiles` (employeeNo, designation, departmentId, workload…) — covers teacher / HOD / admin / every staff role
  - `alumni_profiles` (batch, company, chapter…)
- **Why multi-role:** a real HOD is *also* a teacher; staff can be alumni. One person = one login, N roles; the app can offer role switching later.
- **Consequence for the frontend:** login returns `roles: [...]`; the frontend's single-role screens keep working by using `roles[0]` until a switcher is built.
- **Role vocabulary (exact strings, one per frontend app) + platform role:**
  `PLATFORM_ADMIN` (sees colleges, not the 12 apps) · `STUDENT` · `TEACHER` · `ADMIN` (college super user) · `PLACEMENT` · `EXAMCELL` · `ACCOUNTS` · `LIBRARY` · `HOSTEL` · `TRANSPORT` · `SPORTS` · `HOD` · `ALUMNI`.

## ADR-07 · Auth: full email + password, JWT access + refresh

- **Decision:** bcrypt password hashing (cost 12), **short-lived access JWT (15 min)** + **long-lived refresh token (30 d, stored hashed in `refresh_tokens`, rotation on use)**.
- **Flows:** login (email+password → tokens + roles) · refresh (rotate) · logout (revoke) · forgot/reset password (reset token, one-time). Email/OTP delivery is stubbed in v1 (token returned in dev mode) — wire a mailer in a later phase.
- **Authorization:** JWT carries `userId`, `institutionId`, `roles[]`. Middleware `requireRole('TEACHER'|'HOD'|...)` checks roles; fine-grained per-action permissions (admin Settings → Roles & Permissions module) are enforced via a `role_permissions` map table filled by seed and editable by college admin.
- ⚠️ The current frontend has no password fields (role-picker demo). Phase 1 backend ships the real auth API; the frontend login gets email/password inputs wired in Phase 2.

## ADR-08 · Multi-college SaaS from day one

- **Decision:** The schema supports N institutions. A `PLATFORM_ADMIN` provisions an institution, sets its plan, and creates its first `ADMIN` user. All 12 frontend apps are college-scoped; nothing in the app UI is platform-level in v1.
- **Seeding:** seeds create the platform, one demo college ("Learnix Institute of Technology"), its full academic tree, and one demo login per role (password `Passw0rd!` in dev only).

## ADR-09 · Scope strategy: full schema now, API in phases

- **Decision:** `schema.prisma` covers **all 12 roles end-to-end in one pass** (this is the "base DB schema" the user asked for). API implementation is phased — see `06-phase-plan.md`.
- **Why:** Schema is the hard-to-reverse part; changing table shapes after endpoints exist is expensive. Endpoints are cheap to add incrementally.

## ADR-10 · Money, files, audit, IDs

- **Money:** integer paise in `Int` columns; every financial row records `amountMinor`, currency fixed `INR` for v1.
- **IDs:** Prisma `cuid()` primary keys everywhere; human codes (`rollNo`, `courseCode`, `regNo`) are unique *per institution* (composite unique `@@unique([institutionId, rollNo])`), not globally.
- **Files:** one polymorphic `files` table (uploader, purpose, mimeType, size, storageKey) — assignment attachments, submissions, notes, resumes, receipts all reference it. Local-disk storage in dev; S3-compatible later (storageKey only).
- **Audit:** `audit_logs` (actorUserId, institutionId, action, entityType, entityId, before/after JSON) written by a service helper on every state-changing mutation. Required for the financial and approval flows the docs demand.
- **Time:** all `DateTime` UTC; the college's tz (`institution.timezone`) applied at display time.

## ADR-11 · API conventions (all phases)

- Base: `/api/v1`. Auth: `Authorization: Bearer <access>`.
- **Resources per role exactly as the per-role docs in `docs/users/*` specify** (`/api/student/...`, `/api/teacher/...`, `/api/admin/...`, …) — the frontend contract doesn't move.
- Actions that change state use `POST /{entity}/{id}/{action}` (`approve`, `reject`, `publish`, `record`, `assign`…) — matches every state machine in `05-state-machines.md`.
- Responses: `{ data: ... }` success envelope; `{ error: { code, message, details? } }` failure. Pagination: `?page=&pageSize=` → `{ data, page, pageSize, total }`.
- Validation: Zod schemas per endpoint; errors → 422 with field details.

## ADR-12 · What is explicitly OUT of scope for the base schema

Deferred (tables/cols added later, schema reserved via JSON `metadata` fields where sensible): real-time GPS websocket infra (schema has `bus_positions` rows only), AI features (cheating detection, study buddy — schema has `cheating_cases` + `ai_interactions` ready), fee payment-gateway integration (payments table has `gatewayRef` reserved), push notification delivery (notifications table exists; fan-out later), attendance biometrics.
