# 05 — Exam Cell App (`role: examcell`)

> Entry: `users/exam_cell/exam_cell.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
The exam cell plans and runs all examinations: builds the exam timetable, generates hall tickets, tracks evaluations, publishes results, and manages cheating cases flagged by AI. Admin's Academics & Examinations module is the institution-level view of the same data.

## 2. App Shell
- **Bottom nav**: Dashboard · Timetable · Evaluations · Results · Profile.
- **Feature modules**: HallTickets, CheatingCases, Notifications.
- **Timetable hub (X-02)**: the Timetable tab opens a hub of **8 sub-screens**, each registered in `FEATURE_MODULES` in `exam_cell.js` and opened through `switchTab` (so a sub-screen can hand control back to a tab):

| `FEATURE_MODULES` key | Title | Block id |
|------------------------|--------------------------|----------------|
| `TimetableCalendar` | Examination calendar | `CALENDAR` |
| `TimetableExams` | Exam schedules | `EXAMS` |
| `TimetableAllocation` | Course allocation | `ALLOCATION` |
| `TimetableSlots` | Date & time slots | `SLOTS` |
| `TimetableRooms` | Centres & rooms | `ROOMS` |
| `TimetableDuty` | Invigilator duty | `DUTY` |
| `TimetableStudents` | Student timetable | `STUDENTS` |
| `TimetableConflicts` | Clashes & publishing | `CONFLICTS` |

The eight block ids, labels, icons and colours are owned by the backend (`timetable.rules.ts` `BLOCKS`) and read from `GET /api/examcell/timetable/catalogue` — the app never invents them.

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (exam season progress), stats (exams scheduled, students registered, evaluations pending, results published), today's exam schedule, pending items (evaluations to collect, results to publish), alerts (room conflicts, unverified papers), quick-tool launcher, activity feed.

### 3.2 Timetable
Hub for the X-02 feature: season stats, the eight blocks listed in §2, and a publish banner that says whether this season may go out. Each block opens as its own sub-screen. The ten requirements it implements are mapped in §3.9.

**Entities**: `exam` (title, type, academicYear, status `DRAFT`/`PUBLISHED`) · `exam_slot` (exam, offering, date, `startTime`/`endTime` `HH:MM`, seats, status `SCHEDULED`/`COMPLETED`/`RESCHEDULED`) · `exam_room_allocation` (slot, room, invigilator) · `exam_conflict` (type, severity, description, resolvedAt).

### 3.3 Evaluations
Evaluation queue: exam → subject → paper counts with status (Pending / In Progress / Completed), per-paper evaluator assignment, progress %. Actions: assign evaluator, mark complete.

**Entity `evaluation`**: examId, subject, totalPapers, completed, inProgress, pending, evaluator.

### 3.4 Results
Result list per exam (published/unpublished), class-wise pass %, topper, grade distribution. Actions: **publish results** (→ student app), re-evaluation requests handling.

**Entity `result`**: examId, student, marks, grade, pass/fail, published flag.

### 3.5 Hall Tickets (module)
Hall ticket generation per exam: student, roll no, exam, date/time, room, seat number, QR. Statuses: Generated / Downloaded / Not Generated. Actions: generate batch, reprint, notify.

**Entity `hall_ticket`**: id, studentId, examId, room, seat, qrCode, generatedAt.

### 3.6 Cheating Cases (module)
Cases from AI detection (timing analysis, answer similarity) with risk levels (High/Medium/Low), evidence, status (Under Review / Confirmed / Dismissed). Actions: **Confirm / Dismiss**, escalate to admin, notify student.

**Entity `cheating_case`**: id, studentId, examId, issue, riskLevel, evidence, status.

### 3.7 Notifications
Inbox (timetable/result/hall-ticket/cheating types) + Broadcast tab (audience: All Students / By Class / Exam Registrants → timetable changes, hall ticket release, result announcements).

### 3.8 Profile
Exam controller profile, exam stats, preference toggles, account menu.

### 3.9 Timetable (X-02) — the ten requirements

| # | Requirement | Where it lives | Endpoint |
|---|-------------|----------------|----------|
| 1 | Examination calendar | `CALENDAR` — every paper on one 45-day date grid (`CALENDAR_SPAN_DAYS`) | `GET /timetable/blocks/CALENDAR` |
| 2 | Create / edit exam schedules | `EXAMS` — draft exams, type, academic year | `POST /timetable/exams` · `PATCH /timetable/exams/:id` |
| 3 | Course & subject allocation | `ALLOCATION` — eligible offerings, **scoped to the institution**, with what is missing | `GET /timetable/blocks/ALLOCATION` |
| 4 | Date & time-slot management | `SLOTS` — duration, reschedule, complete; window validated before write | `POST /timetable/exams/:id/slots` · `PATCH` / `DELETE /timetable/slots/:id` · `POST /timetable/slots/:id/complete` |
| 5 | Examination-centre / room allocation | `ROOMS` — seated against real `Venue` capacity (`Room` is a hostel room and is never used) | `POST /timetable/slots/:id/venues` |
| 6 | Invigilator assignment | `DUTY` — one invigilator per allocation | `PUT /timetable/allocations/:id/invigilator` |
| 7 | Faculty duty schedule | `DUTY` — load per faculty; heavy duty = ≥ 4 papers (`HEAVY_DUTY_COUNT`) | `GET /timetable/blocks/DUTY` |
| 8 | Student timetable | `STUDENTS` — one student’s season, unallocated papers shown as unallocated | `GET /timetable/blocks/STUDENTS` · `GET /timetable/students/:studentProfileId` |
| 9 | Clash / conflict detection | `CONFLICTS` — 8 conflict kinds with severity; detection engine re-reads the season on every write | `GET /timetable/blocks/CONFLICTS` · preflight guard inside every mutation |
| 10 | Timetable publishing | Publish banner + gate — refuses while any HIGH clash is unresolved | `POST /timetable/exams/:id/publish` |

**Conflict kinds** (`timetable.rules.ts`, severity + `blocking`): `STUDENT_DOUBLE_BOOKED` and `INVIGILATOR_DOUBLE_BOOKED` are **blocking** — the write is refused with **422**. `ROOM_DOUBLE_BOOKED`, `SUBJECT_DOUBLE_BOOKED`, `CAPACITY_SHORTFALL`, `TEACHER_DOUBLE_BOOKED`, `PAPER_UNALLOCATED` and `NO_INVIGILATOR` are recorded as `exam_conflict` rows so the operator can see and resolve them.

**Policy (confirmed):** hard clashes blocked with 422 · soft clashes recorded, never blocked · room capacity shortfall is `MEDIUM` and never blocks · publishing is refused while any HIGH clash is unresolved.

## 4. Backend API Surface

Legacy exam-cell surface:
```
GET  /api/examcell/dashboard
GET  /api/examcell/evaluations            (+ /{id}/assign, /{id}/complete)
GET  /api/examcell/results                (+ /{id}/publish, re-evaluation)
GET/POST /api/examcell/hall-tickets       (generate batch, reprint)
GET/POST /api/examcell/cheating-cases     (+ /{id}/confirm|dismiss)
GET  /api/examcell/notifications
POST /api/examcell/broadcasts
```

The old `GET/POST /api/examcell/timetable` (+ `/{id}/reschedule, notify`) handlers were **removed** in X-02 and replaced by the 13 timetable routes below (`timetable.routes.ts`, mounted **before** `examcellRoutes`):
```
GET    /api/examcell/timetable/catalogue                    blocks, stats, conflict totals
GET    /api/examcell/timetable/overview                     season overview + publish gate
GET    /api/examcell/timetable/blocks/:block                one of the 8 blocks (422 on unknown block)
GET    /api/examcell/timetable/students/:studentProfileId   one student's season
POST   /api/examcell/timetable/exams                        create (422 on hard clash / bad window)
PATCH  /api/examcell/timetable/exams/:id                    edit
POST   /api/examcell/timetable/exams/:id/publish            publish (refused while HIGH clash open)
POST   /api/examcell/timetable/exams/:id/slots              add slot (preflight before write)
PATCH  /api/examcell/timetable/slots/:id                    reschedule
DELETE /api/examcell/timetable/slots/:id                    remove
POST   /api/examcell/timetable/slots/:id/complete           mark completed
POST   /api/examcell/timetable/slots/:id/venues             allocate centre/room
PUT    /api/examcell/timetable/allocations/:id/invigilator  assign invigilator
```

## 5. Cross-App Dependencies
- Writes → **Student**: timetable visibility, hall tickets, published results.
- Writes → **Admin**: evaluation progress, cheating cases (institution view), result approval.
- Reads ← **Admin**: exam configuration, academic calendar.
- Reads ← **Teacher**: exam requests/grades.
- Cheating cases shared with Admin's AI cheating detection module.

## 6. Wiring Status

Backend: `backend/src/modules/examcell/` (schemas, service, routes) + `timetable.rules.ts` / `timetable.service.ts` / `timetable.routes.ts` for X-02
Frontend: `learnix/users/exam_cell/` (hub + 8 timetable sub-screens wired to live API)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/examcell/dashboard` | GET | ✅ wired |
| `/examcell/timetable/catalogue` | GET | ✅ wired |
| `/examcell/timetable/overview` | GET | ✅ wired |
| `/examcell/timetable/blocks/:block` | GET | ✅ wired ×8 blocks |
| `/examcell/timetable/students/:id` | GET | ✅ wired |
| `/examcell/timetable/exams` | POST | ✅ wired |
| `/examcell/timetable/exams/:id` | PATCH | ✅ wired |
| `/examcell/timetable/exams/:id/publish` | POST | ✅ wired |
| `/examcell/timetable/exams/:id/slots` | POST | ✅ wired |
| `/examcell/timetable/slots/:id` | PATCH | ✅ wired |
| `/examcell/timetable/slots/:id` | DELETE | ✅ wired |
| `/examcell/timetable/slots/:id/complete` | POST | ✅ wired |
| `/examcell/timetable/slots/:id/venues` | POST | ✅ wired |
| `/examcell/timetable/allocations/:id/invigilator` | PUT | ✅ wired |
| `/examcell/hall-tickets` | GET | ✅ wired |
| `/examcell/hall-tickets/generate` | POST | ✅ wired |
| `/examcell/evaluations` | GET | ✅ wired |
| `/examcell/evaluations/:id/assign` | POST | ✅ wired |
| `/examcell/evaluations/:id/complete` | POST | ✅ wired |
| `/examcell/results` | GET | ✅ wired |
| `/examcell/results` | POST | ✅ wired |
| `/examcell/results/publish` | POST | ✅ wired |
| `/examcell/re-evaluations/:id/decide` | POST | ✅ wired |
| `/examcell/cheating-cases` | GET | ✅ wired |
| `/examcell/cheating-cases/:id/decide` | POST | ✅ wired |
| `/examcell/notifications` | GET | ✅ wired |
| `/examcell/notifications/read-all` | POST | ✅ wired |
| `/examcell/broadcasts` | POST | ✅ wired |
| `/examcell/profile` | GET | ✅ wired |

**App wiring:**
- `exam_cell.js`: demo user `setDemoUser('examcell@learnix.dev')`
- Dashboard: live API (hero, stats, upcoming exams, cheating alerts, module hub)
- **Timetable hub**: live API (catalogue, season stats, 8 blocks, publish banner); passes `switchTab` so a block can return to a tab
- **Calendar**: live API (45-day grid, per-day papers)
- **Exam schedules**: live API (list, create, edit, publish)
- **Course allocation**: live API (included + missing courses, institution-scoped)
- **Date & time slots**: live API (duration, reschedule, complete, delete)
- **Centres & rooms**: live API (venue capacity, allocate, shortfall)
- **Invigilator duty**: live API (per-faculty load, assign, heavy duty)
- **Student timetable**: live API (per-student season, unallocated shown)
- **Clashes & publishing**: live API (8 conflict kinds, severities, publish gate)
- Evaluations: live API (progress, deadlines, mark complete)
- Results: live API (pending/published, publish, re-evaluation decide)
- Hall Tickets: live API (exam selector, generate batch, search)
- Cheating Cases: live API (risk filters, confirm/dismiss/escalate)
- Notifications: live API (inbox, mark all read, broadcast)
- Profile: live API (name, stats, preferences, menu)
