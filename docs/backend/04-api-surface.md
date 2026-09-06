# 04 — API Surface Map (v1)

> Complete endpoint map. Per-role entity/field detail lives in `docs/users/*` — those contracts don't move; they gain the `/api/v1` prefix and JWT headers from `03-auth-rbac.md`. New endpoints not in the original docs (auth, platform, master, files) are specified here in full.

---

## 1. Conventions

- Base `/api/v1` · `Authorization: Bearer <accessToken>` · JSON envelope `{ data }` / `{ error: { code, message, details? } }` · list pagination `?page&pageSize` → `{ data, page, pageSize, total }`.
- State-changing actions: `POST /{entity}/{id}/{action}` — mirrors every state machine in `05-state-machines.md`.
- Route file per role in `src/modules/{role}/` — module order below = build order in `06-phase-plan.md`.

## 2. Cross-cutting endpoints (new, not in per-role docs)

### Auth — `modules/auth` (public)
As specified in `03-auth-rbac.md` §4 (register-student, login, refresh, logout, logout-all, me, forgot/reset/change-password).

### Platform — `modules/platform` (`PLATFORM_ADMIN` only)
```
GET    /api/v1/platform/institutions
POST   /api/v1/platform/institutions                    { name, code, timezone, plan }
POST   /api/v1/platform/institutions/{id}/first-admin   { fullName, email, password }
GET    /api/v1/platform/institutions/{id}/stats          # counts (read-only oversight)
PUT    /api/v1/platform/institutions/{id}/status         # ACTIVE/SUSPENDED
```

### Master data — `modules/master` (any authenticated role; read-only)
```
GET /api/v1/master/institution          # own institution profile + academic year
GET /api/v1/master/departments?with=programs
GET /api/v1/master/programs?departmentId=
GET /api/v1/master/batches?programId=
GET /api/v1/master/sections?batchId=
GET /api/v1/master/courses?departmentId=&semester=
GET /api/v1/master/offerings?sectionId=&semester=    # the central join: +teacher, +course
GET /api/v1/master/academic-years
```
Master **writes** belong to ADMIN (`/api/v1/admin/...`); master reads are shared so every role module can populate filters without hitting admin routes.

### Files — `modules/files` (authenticated)
```
POST /api/v1/files                      # multipart upload → { fileId } (purpose-typed)
GET  /api/v1/files/{id}                 # stream if permitted (owner / same institution / purpose rule)
```

### Notifications — `modules/notifications` (authenticated)
```
GET  /api/v1/notifications?page=        # own inbox (all 12 apps read this)
POST /api/v1/notifications/read         # { ids[] } or { all: true }
POST /api/v1/broadcasts                 # staff only — { audience{ role?, departmentId?, batchId?, sectionId?, routeId?, blockId? }, title, body, channels }
GET  /api/v1/broadcasts                 # own sent history
```
Audience resolution + fan-out is one shared service — replaces 12 duplicated Broadcast tabs with a single implementation.

## 3. Role module map (details → docs/users)

| Module (route prefix) | Role gate | Endpoints | Entity detail |
|---|---|---|---|
| `student` | STUDENT | dashboard, classes, lecture-notes, assignments (+submit, result), events (+register), placement jobs/drives/apply, profile sub-resources | `docs/users/01-students.md` §4 |
| `teacher` | TEACHER, HOD | dashboard, classes, class dashboard, notes CRUD, quizzes + questions, syllabus (submit), roster, assignments CRUD, exams, grade submission, export grades, performance, schedule | `docs/users/02-teachers.md` §4 |
| `admin` | ADMIN | students (+approve, add), teachers (+add), leave-requests approve/reject, courses + syllabus templates approve, reports (+export), academics (exams/evaluations/cheating), timetable generate, attendance, assignments oversight, placements approve, events approve, library view, fees view, announcements approve/publish, settings (roles/permissions/config/academic-year) | `docs/users/03-admin.md` §4 |
| `placement` | PLACEMENT | dashboard, drives (+approve), applications (shortlist/reject/offer), students pool, jobs CRUD, companies CRUD | `docs/users/04-placement-cell.md` §4 |
| `examcell` | EXAMCELL | dashboard, timetable (+reschedule), evaluations (+assign, complete), results (+publish, re-evaluation), hall-tickets (generate batch), cheating-cases (confirm/dismiss) | `docs/users/05-exam-cell.md` §4 |
| `accounts` | ACCOUNTS | dashboard, collections (+record, receipt), dues (+remind, waive), payroll (+run, payslip), fee-structure (+revision), expenses (+approve), scholarships (+approve, disburse), reports (+export) | `docs/users/06-accounts-finance.md` §4 |
| `library` | LIBRARY | dashboard, catalog CRUD, circulation issue/return, fines (collect/extend/waive), requests, digital resources | `docs/users/07-library-staff.md` §4 |
| `hostel` | HOSTEL | dashboard, rooms/beds, allocations (transfer/vacate), residents (+rent paid), mess menu/attendance/survey, gate-passes, complaints, visitors | `docs/users/08-hostel.md` §4 |
| `transport` | TRANSPORT | dashboard, routes (+detail), fleet (+service), drivers, tracking, maintenance complete, fuel-log, fees (remind/collect), fee-structure revision | `docs/users/09-transport.md` §4 |
| `sports` | SPORTS | dashboard, events (+registrations approve), teams (+tryouts, add-player), tournaments/fixtures/standings, venues (+approve, book), equipment (+return) | `docs/users/10-sports-cultural.md` §4 |
| `hod` | HOD | dashboard, faculty (+evaluate, reassign), courses (+detail), syllabus approve/request-changes, students ?year, leave approve/reject (+substitute) | `docs/users/11-hod.md` §4 |
| `alumni` | ALUMNI | dashboard, directory (+invite, add-mentor), events (+rsvp confirm/decline), donations (+record → payment+receipt), campaigns (+share), mentorship (+approve/decline/remind), chapters | `docs/users/12-alumni-relations.md` §4 |

## 4. Action endpoint registry (state machines)

All `POST` under the owning module; full transition rules in `05-state-machines.md`.

| Action | Endpoint |
|---|---|
| Syllabus submit / approve / request changes / admin-approve | `teacher/syllabus/{id}/submit` · `hod/syllabus/{id}/approve` · `hod/syllabus/{id}/request-changes` · `admin/courses/syllabus/{id}/approve` |
| Leave approve / reject | `hod/leave/{id}/approve` · `admin/leave-requests/{id}/approve` (same table; HOD first, admin override) |
| Drive create→approve→schedule | `placement/drives` (POST=DRAFT/PENDING_ADMIN) · `admin/placements/{id}/approve` · `placement/drives/{id}/schedule` |
| Application shortlist / reject / offer | `placement/applications/{id}/shortlist` · `/reject` · `/offer` |
| Event approve / publish | `admin/events/{id}/approve` · `admin/events/{id}/publish` |
| Event registration approve / RSVP confirm/decline | `sports/registrations/{id}/approve` · `alumni/rsvps/{id}/confirm` · `/decline` (same `event_registrations` table) |
| Announcement submit / approve / publish | `admin/announcements` (POST) · `admin/announcements/{id}/approve` · `/publish` |
| Payment record / receipt | `accounts/collections/{id}/record` · `accounts/collections/{id}/receipt` · `alumni/donations/{id}/record` (write-through to accounts) |
| Fine collect / extend / waive | `library/fines/{id}/collect` · `/extend` · `/waive` |
| Fee due remind / waive | `accounts/dues/{id}/remind` · `/waive` |
| Gate pass approve / reject | `hostel/gate-passes/{id}/approve` · `/reject` |
| Complaint assign / resolve | `hostel/complaints/{id}/assign` · `/resolve` |
| Visitor check-in / out | `hostel/visitors/checkin` · `visitors/{id}/checkout` |
| Result publish / re-evaluation | `examcell/results/{examSlotId}/publish` · `examcell/re-evaluations/{id}/approve` |
| Hall ticket generate batch | `examcell/hall-tickets/generate` `{ examSlotId }` |
| Cheating case confirm / dismiss / escalate | `examcell/cheating-cases/{id}/confirm` · `/dismiss` · `/escalate` |
| Allocation allocate / transfer / vacate | `hostel/allocations` (POST) · `/{id}/transfer` · `/{id}/vacate` |
| Expense approve / reject | `accounts/expenses/{id}/approve` · `/reject` |
| Scholarship approve / disburse | `accounts/scholarships/{id}/approve` · `/disburse` |
| Transport fee remind / collect | `transport/fees/{id}/remind` · `/collect` |
| Venue book / approve / reject | `sports/venues/{id}/book` · `venues/bookings/{id}/approve` · `/reject` |
| Equipment issue / return | `sports/equipment/{id}/issue` · `/return` |
| Mentorship approve / decline / remind | `alumni/mentorship/{id}/approve` · `/decline` · `/remind` |
| Donation record | `alumni/donations/{id}/record` → creates `payments` + `receipts` (E domain write-through) |

## 5. Dashboard endpoints (one per role — computed reads)

`GET /api/v1/{role}/dashboard` returns the role's hero stats, pending-action lists, alerts, and activity feed as one document (the apps render one screen from one call). Aggregation SQL lives in each module's `dashboard.service.ts`; no client-side stitching.
