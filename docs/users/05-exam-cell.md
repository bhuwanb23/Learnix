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

The **Hall Tickets hub (X-04)** opens the same way — the `HallTickets` feature module is a hub of **7 sub-screens**, and the block ids, labels and routes are owned by the backend (`hallticket.rules.ts` `BLOCKS`) and read from `GET /api/examcell/hall-tickets/catalogue` — the app never invents them:

| `FEATURE_MODULES` key | Title | Block id |
|------------------------|--------------------------|----------------|
| `HallTicketsEligibility` | Student Eligibility | `ELIGIBILITY` |
| `HallTicketsGeneration` | Generate Hall Tickets | `GENERATION` |
| `HallTicketsList` | Tickets & Printing | `TICKETS` |
| `HallTicketsSchedule` | Exam Subjects & Schedule | `SCHEDULE` |
| `HallTicketsCentre` | Examination Centre | `VENUE` |
| `HallTicketsRequests` | Corrections & Reissues | `REQUESTS` |
| `HallTicketsPublication` | Hall Ticket Publication | `PUBLICATION` |

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
X-04: one hall ticket **per student, per paper**, with the exam cell in control of who may see it. The tab opens a **hub** (publication hero + the seven blocks listed in §2); every block is its own sub-screen. Four screens are scoped to one exam through their own picker (`ELIGIBILITY`, `GENERATION`, `TICKETS`, `SCHEDULE`); three are institution-wide (`VENUE`, `REQUESTS`, `PUBLICATION`). The ten requirements it implements are mapped in §3.10.

**Entities**: `hall_ticket` (examSlot, studentProfile, `seatNo`, `qrPayload`, status `GENERATED`/`DOWNLOADED`, `generatedAt`; unique per slot+student and per slot+seat) · `hall_ticket_request` (kind `CORRECTION`/`REISSUE`, status `REQUESTED`/`APPROVED`/`REJECTED`/`COMPLETED`, `field`/`requestedValue` for corrections only, `reason`, `decidedByUserId`, `completedAt`) · `exam.hallTicketStatus` (`DRAFT`/`PUBLISHED`/`RECALLED`), `hallTicketPublishedAt`, `hallTicketPublishedByUserId`.

Student photo: `User.avatarFileId` is published on the ticket, and the tile renders initials (or a person icon) rather than inventing an image URL — no file-serving route exists yet, so nothing is shipped that would 404.

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

### 3.10 Hall Tickets (X-04) — the ten requirements

| # | Requirement | Where it lives | Endpoint |
|---|-------------|----------------|----------|
| 1 | Student eligibility | `ELIGIBILITY` — per-student warnings over 6 reasons; **warn-only**: `blocksGeneration: false`, reported alongside, never enforced | `GET /hall-tickets/blocks/ELIGIBILITY?examId=` |
| 2 | Hall-ticket generation | `GENERATION` — one student, one paper, next free seat; a paper added after the batch is issued singly | `POST /hall-tickets/slots/:slotId/students/:studentProfileId` |
| 3 | Student photo & details | `TICKETS` — avatar with an honest initials fallback, roll no., seat, QR payload, per-paper rows | `GET /hall-tickets/blocks/TICKETS?examId=` |
| 4 | Exam subjects & schedule | `SCHEDULE` — every paper with date, time, duration, centre and seat (per-exam, or the whole season with no `examId`) | `GET /hall-tickets/blocks/SCHEDULE?examId=` |
| 5 | Examination-centre info | `VENUE` — centre, room, capacity against seats allocated, invigilator (institution-wide) | `GET /hall-tickets/blocks/VENUE` |
| 6 | Download / print | `TICKETS` — marks the ticket `DOWNLOADED`; idempotent, a second print reports `alreadyDownloaded` | `POST /hall-tickets/:id/download` |
| 7 | Bulk generation | `GENERATION` — the preview and the run share ONE predicate: the run issues exactly what the preview promised, a second run issues nothing | `POST /hall-tickets/exams/:examId/generate` |
| 8 | Correction requests | `REQUESTS` — one `hall_ticket_request` row, `kind: CORRECTION`; only `seatNo`/`rollNo`/`fullName` are correctable, and a roll-no. correction rebuilds the QR | `POST /hall-tickets/requests` · `PATCH /hall-tickets/requests/:id` · `POST /hall-tickets/requests/:id/complete` |
| 9 | Reissue management | `REQUESTS` — the same table, `kind: REISSUE`; completion seats the student again (new seat + new QR) and a reissue never carries a field | the same three request routes |
| 10 | Publication status | `PUBLICATION` — per-exam publish / recall; publishing an exam with zero tickets is 422; recall hides tickets from students without deleting them | `PUT /hall-tickets/exams/:examId/publication` |

The hub reads everything it renders in one round trip: `GET /hall-tickets/catalogue` (blocks, statuses, policies, exams for the picker) and `GET /hall-tickets/overview` (hero + totals); each sub-screen then fetches only its own block through `GET /hall-tickets/blocks/:block`.

**Policy (confirmed):** eligibility warnings **never block** generation — they are shown alongside the result · corrections and reissues share ONE `hall_ticket_request` table, two kinds · publication is **per exam**, there is no institution-wide switch · an exam with no generated ticket cannot be published (422) · one open request per ticket (a second is 409) · completing a reissue takes a NEW seat and a rebuilt QR · recall gates the student side: `student.service.ts` hands the `hallTicket` to the student only while the exam is `PUBLISHED`, and re-publishing restores the same seat.

## 4. Backend API Surface

Legacy exam-cell surface:
```
GET  /api/examcell/dashboard
GET  /api/examcell/evaluations            (+ /{id}/assign, /{id}/complete)
GET  /api/examcell/results                (+ /{id}/publish, re-evaluation)
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

The old `GET/POST /api/examcell/hall-tickets` (+ `/generate`) handlers were **removed** in X-04 and replaced by the 10 hall-ticket routes below (`hallticket.routes.ts`, mounted **before** `examcellRoutes` with its own auth; every literal is registered before any parameterised path, and `/:id/download` last):
```
GET    /api/examcell/hall-tickets/catalogue                      blocks, statuses, policies, exams for the picker
GET    /api/examcell/hall-tickets/overview                       hub overview + hero publication state
GET    /api/examcell/hall-tickets/blocks/:block                  one of the 7 blocks (422 on unknown block)
POST   /api/examcell/hall-tickets/exams/:examId/generate         bulk generation (201; issues what the preview promised)
PUT    /api/examcell/hall-tickets/exams/:examId/publication      publish | recall (422 when there are no tickets)
POST   /api/examcell/hall-tickets/slots/:slotId/students/:studentProfileId  one ticket, one student, one paper (201)
POST   /api/examcell/hall-tickets/requests                       raise a correction or a reissue (201)
PATCH  /api/examcell/hall-tickets/requests/:id                   approve | reject
POST   /api/examcell/hall-tickets/requests/:id/complete          seat + QR on an approved request
POST   /api/examcell/hall-tickets/:id/download                   mark printed (idempotent; registered last)
```

## 5. Cross-App Dependencies
- Writes → **Student**: timetable visibility, hall tickets, published results.
- Writes → **Admin**: evaluation progress, cheating cases (institution view), result approval.
- Reads ← **Admin**: exam configuration, academic calendar.
- Reads ← **Teacher**: exam requests/grades.
- Cheating cases shared with Admin's AI cheating detection module.

## 6. Wiring Status

Backend: `backend/src/modules/examcell/` (schemas, service, routes) + `timetable.rules.ts` / `timetable.service.ts` / `timetable.routes.ts` for X-02 + `hallticket.rules.ts` / `hallticket.service.ts` / `hallticket.routes.ts` for X-04
Frontend: `learnix/users/exam_cell/` (hub + 8 timetable sub-screens + hall-ticket hub & 7 sub-screens, all wired to live API)

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
| `/examcell/hall-tickets/catalogue` | GET | ✅ wired |
| `/examcell/hall-tickets/overview` | GET | ✅ wired |
| `/examcell/hall-tickets/blocks/:block` | GET | ✅ wired ×7 blocks |
| `/examcell/hall-tickets/exams/:examId/generate` | POST | ✅ wired |
| `/examcell/hall-tickets/exams/:examId/publication` | PUT | ✅ wired |
| `/examcell/hall-tickets/slots/:slotId/students/:id` | POST | ✅ wired |
| `/examcell/hall-tickets/requests` | POST | ✅ wired |
| `/examcell/hall-tickets/requests/:id` | PATCH | ✅ wired |
| `/examcell/hall-tickets/requests/:id/complete` | POST | ✅ wired |
| `/examcell/hall-tickets/:id/download` | POST | ✅ wired |
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
- **Hall Tickets hub**: live API (catalogue, overview, publication hero); block cards route through `goToRoute`
- **Eligibility / Generation / Tickets / Schedule**: live API — each owns its exam picker; warnings are shown, never enforced; the run issues exactly what the preview promised; printing marks downloaded
- **Centre / Requests / Publication**: live API — institution-wide centre, approve/reject/complete requests, publish or recall
- Cheating Cases: live API (risk filters, confirm/dismiss/escalate)
- Notifications: live API (inbox, mark all read, broadcast)
- Profile: live API (name, stats, preferences, menu)
