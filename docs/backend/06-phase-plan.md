# 06 — Phase Plan & Progress Tracker

> Execution order for building the backend. **Check the boxes here as work completes** — this file is the live tracker; update it every session. Each phase has: scope, exit criteria (definition of done), and the tests that must pass.

---

## Phase 0 — Project scaffold ✅ ready to start
- [ ] `backend/` package: deps (express5, prisma, zod, bcryptjs, jsonwebtoken, pino, dotenv), tsconfig strict, .env.example
- [ ] `src/server.ts` + `src/app.ts` with requestContext + errorHandler, `GET /health`
- [ ] `prisma/schema.prisma` — **full ~96-table schema, all domains A–L in one pass**
- [ ] `prisma migrate dev` clean on SQLite + `prisma generate`
- [ ] `prisma/seed.ts`: platform, demo institution, academic year, departments/programs/batches/sections, one user per role (`Passw0rd!`), courses + offerings + enrollments
- [ ] README with setup commands

**Exit criteria:** `npm run dev` boots; `/health` OK; seeded DB answers a tenant-scoped query per domain.

## Phase 1 — Auth & tenancy core
- [ ] `modules/auth`: register-student, login, refresh (rotation + family revoke), logout, logout-all, me, forgot/reset/change-password
- [ ] middlewares: auth, requireRole, tenantScope, validate, requestContext (some from Phase 0 skeleton)
- [ ] `src/db/tenant.ts` `withTenant` extension — raw client never exported
- [ ] `platform` module: institutions CRUD + first-admin provisioning
- [ ] `master` read-only module (departments/programs/batches/sections/courses/offerings/academic-years)
- [ ] Rate limit login; audit log helper

**Exit criteria:** login works for all seeded roles; **tenant isolation test passes** (college-B token gets 404/403 on college-A resources); refresh rotation + reuse detection tested; `me` returns roles[].

## Phase 2 — Academic core API
- [ ] `teacher`: classes (offerings), class dashboard, notes CRUD, quizzes + questions + attempts(auto-grade), syllabus versions (submit), roster, schedule
- [ ] `student`: dashboard, classes, lecture-notes, syllabus tracker, notifications wiring
- [ ] `hod`: faculty (workload), syllabus approve/request-changes, leave approve/reject (+substitute), students by year, dashboard
- [ ] `admin`: students CRUD + approve, teachers CRUD, courses + offerings CRUD, departments/programs master writes, leave queue, academic year
- [ ] Attendance: sessions + records (teacher finalize → threshold alerts)
- [ ] Assignments: CRUD, publish, submissions, grading (rubric), results to student
- [ ] Timetable: slots CRUD + conflict detection (room/teacher overlap)

**Exit criteria:** teacher creates → student sees; HOD approval loop works end-to-end (syllabus + leave); student assignments submit → teacher grade → student result; attendance % matches records; tenant tests still green.

## Phase 3 — Exams & results
- [ ] `examcell`: exam schedule + slots, conflict detection, hall tickets (batch generate, QR payload), evaluations (assign/paper progress), results publish (gated), re-evaluation window, cheating cases (confirm/dismiss/escalate)
- [ ] `admin` academics view: same data, institution-level + export report endpoints (CSV)
- [ ] Teacher exam-grade entry feeds evaluations
- [ ] Student: exam timetable, hall ticket, results views

**Exit criteria:** full exam lifecycle SCHEDULED→RESULTS_PUBLISHED with hall tickets + published results visible to students; conflict detection blocks double-booked rooms; cheating case audit trail complete.

## Phase 4 — Money
- [ ] `accounts`: fee structures, dues generation per semester, collections (record + receipt numbering), partial payments, reminders, waive (audited), payroll run + payslips, expenses + budgets, scholarships + disbursement, finance reports
- [ ] Unified payments: category detail rows (fine/rent/transport/donation links)
- [ ] `library` fines → payments; `hostel` rent; `transport` fees — write-throughs live in each module but create payments via shared `payments.service`
- [ ] `alumni` donations record → payments + receipts (write-through from Phase 6 moved earlier if convenient)

**Exit criteria:** every money-in lands in collections with a receipt; due math exact in integer paise; waive/di­sburse audited; finance reports reconcile (sum(payments) = sum(receipts)).

## Phase 5 — Library, Hostel, Transport
- [ ] `library`: catalog CRUD, issue/return (+overdue compute + fine creation), requests, digital resources
- [ ] `hostel`: blocks/rooms/beds, allocations (transfer/vacate + bed state), residents, mess menu/attendance/feedback, gate passes, complaints, visitors
- [ ] `transport`: routes/stops/enrollments, vehicles/documents, drivers, service/fuel logs, tracking (upsert positions), fees
- [ ] Student-facing slices: library issues, hostel allocation/gate pass/complaint status, transport route/delay

**Exit criteria:** issue→overdue→fine→payment chain works; bed occupancy never exceeds capacity (409); gate pass/complaint state machines notify residents; transport fee collect → accounts.

## Phase 6 — Placement, Sports, Alumni, Events, Communication
- [ ] `placement`: companies, jobs, drives (+admin approval), applications pipeline (shortlist/interview/offer), eligibility pool
- [ ] `admin` placements/events/library/fees institution views (oversight reads + approve actions)
- [ ] `sports`: events + registration approvals, teams/fixtures/standings, equipment issue/return, venues/bookings
- [ ] `alumni`: directory, campaigns, donations (record → payments), mentorship pairs/sessions, chapters, alumni events (RSVP)
- [ ] Communication: announcements approval flow, broadcast fan-out service (audience resolution), notification matrix from 05 §12
- [ ] Student: events browse/register, jobs browse/apply, my applications/registrations

**Exit criteria:** drive approval → student applies → shortlist → offer notification chain works; event approval → publish → student registration (QR) works; donation → accounts receipt works; broadcast reaches resolved audience.

## Phase 7 — Frontend integration (parallel per app)
- [ ] API client module for the app (fetch wrapper, token storage, refresh interceptor)
- [ ] Replace static constants app-by-app: students → teachers → admin → staff apps, using `docs/users/*` as the contract
- [ ] Wire real login (email/password) + role from `me`
- [ ] File upload (assignments/notes/resumes) via `/files`

**Exit criteria:** each app's screens render only API data; dead mock imports deleted; login works end-to-end in Expo.

## Phase 8 — Production hardening
- [ ] SQLite → PostgreSQL switch (checklist in `02-database-schema.md`)
- [ ] Refresh tokens in httpOnly cookies (web) / secure store (RN); token reuse alerts
- [ ] Push notifications (expo push tokens → `push_tokens`), email via provider
- [ ] Rate limiting global, helmet, CORS lock-down
- [ ] CI: lint + typecheck + tests + migrate on ephemeral DB
- [ ] Backups + audit retention policy

**Exit criteria:** deployed backend with Postgres; CI green; the 12 apps run against it.

---

## Standing rules
- Update this file's checkboxes **in the same change** as the work — the tracker is never stale.
- Every phase ends with: `npm test` (incl. tenant isolation) + `prisma validate` + boot smoke test.
- New tables/endpoints discovered mid-build get added to `02-database-schema.md` / `04-api-surface.md` **in the same commit**.
