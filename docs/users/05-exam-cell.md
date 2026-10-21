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

The **Evaluations hub (X-05)** opens the same way — the `Evaluations` tab opens a hub of **9 sub-screens**, block ids, labels and routes owned by `evaluation.rules.ts` `BLOCKS` and read from `GET /api/examcell/evaluations/catalogue`:

| `FEATURE_MODULES` key | Title | Block id |
|------------------------|--------------------------|----------------|
| `EvaluationsProgress` | Evaluation Progress | `PROGRESS` |
| `EvaluationsScripts` | Answer Scripts | `SCRIPTS` |
| `EvaluationsAllocation` | Evaluator Allocation | `ALLOCATION` |
| `EvaluationsSubjects` | Subject-wise Evaluation | `SUBJECTS` |
| `EvaluationsMarks` | Marks Entry | `MARKS` |
| `EvaluationsDeadlines` | Deadlines | `DEADLINES` |
| `EvaluationsMissing` | Missing Marks | `MISSING` |
| `EvaluationsModeration` | Moderation | `MODERATION` |
| `EvaluationsRevaluation` | Revaluation Requests | `REVALUATION` |

## 3. Modules & Data Entities

### 3.1 Dashboard (X-11)

The examination office's morning screen: **seven sections**, every figure derived from live rows, every
word of vocabulary published by the server.

| # | Section | What it answers |
|---|---|---|
| 1 | **Exam overview** | Ongoing, upcoming and completed examinations — and the grading deadline |
| 2 | **Evaluation status** | Evaluated, pending, and under-review scripts |
| 3 | **Result progress** | Marks processing and publication status, and what blocks each slot |
| 4 | **Student statistics** | Registered, eligible, absent and appeared — the roll, counted |
| 5 | **Exam alerts** | Timetable conflicts, missing marks, unresolved cases, blocked results |
| 6 | **Quick actions** | Create Schedule, Generate Hall Tickets, Enter Marks, Publish Results |
| 7 | **Performance snapshot** | Pass rate, average marks, the grade spread, subject-wise trends |

**It replaces a flat dashboard, and the old one was wrong in four ways.** The previous
`GET /examcell/dashboard` returned `{ hero, stats, upcomingExams, recentCheating, alerts }` — a banner,
four counters and a list of **prose strings**. It counted **three of the six** exam statuses
(`DRAFT` and `PUBLISHED` were invisible, so "0 ongoing" could mean "none running" or "the dashboard
does not count that"); it counted only `UNDER_REVIEW` misconduct cases when the open set is
`REPORTED | UNDER_REVIEW | COMMITTEE_REVIEW | ESCALATED`; its alerts could not be filtered, counted
or linked to; and it had no "absent" and no "appeared", because **the exam domain had no attendance
record at all**. The old path is **gone** — a caller holding it gets a 404, not a quietly different
shape.

**Absence is RECORDED, never inferred.** The platform's one attendance table
(`AttendanceSession` / `AttendanceRecord`) is a **teacher's per-lecture register**, keyed by course
offering, with no join key to an exam slot — a student can be `ABSENT` for a lecture on the same
afternoon as an examination, and neither record knows about the other. So X-11 adds
`ExamAttendance` (see below) and a **mark-roll**, and the dashboard reports three figures where the
old one had none: **appeared**, **absent**, and **unmarked**. The third is the one that keeps the
other two honest — a paper whose roll nobody has taken is not a paper full of absentees, and the
screen says "not marked yet" rather than "0 appeared".

**A zero is CLEAR, not alarming.** A screen that paints "0 conflicts" in the alarm colour teaches
its reader to ignore the alarm colour, and that is how real problems get missed. Every count on
this screen is painted by one rule (`alertTone`), and the alert kinds are always listed with their
counts — including the zeroes — because a section that hides the clear kinds cannot answer "is
anything wrong?".

**The vocabulary is the SERVER's.** The seven section names, the four quick actions, the six alert
kinds, every icon, every colour and every threshold arrive from
`GET /examcell/dashboard/catalogue`. The client holds a **mirror** for the frame before the
catalogue lands, and nothing else — a client-side list that acted as the source would be a second
list to forget to update. The mirror is asserted against the server by `audit-examcell-dashboard-ui.ts`.

**The quick actions each carry the LIVE count** of what they would act on, and every one of their
four destinations is a registered `FEATURE_MODULES` key — a route that is not registered fails
**silently**, dropping the officer back on the dashboard with no error anywhere.

**The endpoints:**

```
GET /api/v1/examcell/dashboard/catalogue    the seven sections, the four actions, the six alert kinds
GET /api/v1/examcell/dashboard/overview      all seven sections in one call (?examId= to scope one exam)
GET /api/v1/examcell/dashboard/blocks/:block one section on its own — the SAME function the overview calls
```

**The mark-roll** (`ExamAttendance`) — the feature the dashboard's absent/appeared figures depend on:

```
GET  /api/v1/examcell/attendance/summary       the per-paper roll state, institution-wide
GET  /api/v1/examcell/attendance/slots/:slotId the roll for one paper — PRESENT, ABSENT or UNMARKED
POST /api/v1/examcell/attendance/slots/:slotId mark the roll (bulk; idempotent; audited)
```

**Entities**: `exam_attendance` (examSlot, studentProfile, state `PRESENT`|`ABSENT`, markedByUserId?,
markedAt) — one row per student per paper, so an invigilator marking the roll twice **corrects**
rather than duplicates, and a student walking in late is the ordinary case rather than the
exceptional one.

### 3.2 Timetable
Hub for the X-02 feature: season stats, the eight blocks listed in §2, and a publish banner that says whether this season may go out. Each block opens as its own sub-screen. The ten requirements it implements are mapped in §3.9.

**Entities**: `exam` (title, type, academicYear, status `DRAFT`/`PUBLISHED`) · `exam_slot` (exam, offering, date, `startTime`/`endTime` `HH:MM`, seats, status `SCHEDULED`/`COMPLETED`/`RESCHEDULED`) · `exam_room_allocation` (slot, room, invigilator) · `exam_conflict` (type, severity, description, resolvedAt).

### 3.3 Evaluations
X-05: the exam controller's marking desk. The hub (`Evaluations` tab) shows the hero — **% of papers marked, days to the grading deadline, count unmarked** — plus alerts and the nine blocks listed in §2; each block is its own sub-screen. Four blocks (`SCRIPTS`, `ALLOCATION`, `SUBJECTS`, `MARKS`) are scoped to one exam through their own picker; five are institution-wide. The eleven requirements it implements are mapped in §3.11.

Everything derives from rows, never from the denormalised counters: a subject is `COMPLETED` exactly when every one of its papers carries both marks in bounds, and `MISSING`/the hub percent/the publication gate all share that one definition (`isMarked`).

**Entities**: `evaluation` (examSlot, subjectOffering, totalPapers, completedPapers, inProgressPapers, evaluatorUserId?, status `PENDING`/`IN_PROGRESS`/`COMPLETED`, moderationStatus `NOT_REQUESTED`/`PENDING`/`APPROVED`/`FLAGGED`, moderatedByUserId?, moderatedAt?, moderationNote?) · `evaluation_paper` (evaluation, studentProfile, evaluatorUserId?, marksEntered?, internalMarks? 0..40, externalMarks? 0..60, scriptStatus `NOT_RECEIVED`/`RECEIVED`/`VERIFIED`, status `PENDING`/`EVALUATING`/`DONE`) · `grading_deadline` (exam, dueAt, remindedAt?).

### 3.4 Results
Result list per exam (published/unpublished), class-wise pass %, topper, grade distribution. Actions: **publish results** (→ student app), re-evaluation requests handling.

**Entity `result`**: examId, student, marks, grade, pass/fail, published flag.

### 3.5 Hall Tickets (module)
X-04: one hall ticket **per student, per paper**, with the exam cell in control of who may see it. The tab opens a **hub** (publication hero + the seven blocks listed in §2); every block is its own sub-screen. Four screens are scoped to one exam through their own picker (`ELIGIBILITY`, `GENERATION`, `TICKETS`, `SCHEDULE`); three are institution-wide (`VENUE`, `REQUESTS`, `PUBLICATION`). The ten requirements it implements are mapped in §3.10.

**Entities**: `hall_ticket` (examSlot, studentProfile, `seatNo`, `qrPayload`, status `GENERATED`/`DOWNLOADED`, `generatedAt`; unique per slot+student and per slot+seat) · `hall_ticket_request` (kind `CORRECTION`/`REISSUE`, status `REQUESTED`/`APPROVED`/`REJECTED`/`COMPLETED`, `field`/`requestedValue` for corrections only, `reason`, `decidedByUserId`, `completedAt`) · `exam.hallTicketStatus` (`DRAFT`/`PUBLISHED`/`RECALLED`), `hallTicketPublishedAt`, `hallTicketPublishedByUserId`.

Student photo: `User.avatarFileId` is published on the ticket, and the tile renders initials (or a person icon) rather than inventing an image URL — no file-serving route exists yet, so nothing is shipped that would 404.

### 3.6 Cheating Cases (module)
A case file, not an alert. It is the one place in the exam cell where a mistake is expensive: a case can
end a student's degree, and a student who was cleared must be able to see that they were cleared, when,
by whom, and on what grounds.

**The lifecycle.**

```
REPORTED ──→ UNDER_REVIEW ──→ COMMITTEE_REVIEW ──┐
    │              │                  │            │
    └──────────────┴──────────────────┴──→ ESCALATED ──→ CONFIRMED | DISMISSED
                                                  ↑                  │
                                                  └──── UNDER_REVIEW ┘   (reopened, with a reason)
```

Every state change writes a `CheatingCaseEvent` **in the same transaction as the change**. A case
that can change without a record is a case nobody can audit, and a decision that can be quietly
overwritten is not a decision — so a CONFIRMED case offers exactly one move: reopen it, with a reason.

**Risk and classification are different facts.** `riskLevel` is how SEVERE the allegation looks and is
what the queue is triaged on. `classification` is what the misconduct actually IS, and it is what a
penalty attaches to. A HIGH-risk case can be DISMISSED (the student was copying the person next to
them) and a LOW-risk case can be CONFIRMED (a phone in a bag, quietly). Collapsing them is why
"confirmed" and "high risk" get used interchangeably on a screen.

**Escalation is DERIVED, never stored.** There is no `escalatedAt` column and no ESCALATED status
that means "overdue". A case escalates when its age exceeds the threshold for its risk (HIGH 24h,
MEDIUM 72h, LOW 168h) and it is still open. The threshold is the risk's, so a high-risk case sitting
for a fortnight is a failure of the desk and not of the student — and the queue says so.

**The eight categories.**

| Category | Composed? | Source |
|---|---|---|
| `ANNOUNCEMENT` | yes | the warden, to everybody |
| `MAINTENANCE` | yes | the warden, usually to one block |
| `EMERGENCY` | yes | the warden — **bypasses a resident's mutes** |
| `GATE_PASS` | no | the gate-pass lifecycle |
| `LATE_RETURN` | no | the gate-pass return window |
| `VISITOR` | no | the visitor lifecycle |
| `COMPLAINT` | no | the complaint lifecycle |
| `MESS` | no | the mess lifecycle |

**Composing is a privilege, not a description.** Only the three composed categories may be sent. The
other five are facts the system reports, and a warden who could publish a `GATE_PASS` approval could
forge one — so the server refuses, not just the picker.

**An emergency ignores a mute.** A mute is a preference about noise, not about safety, and you cannot
opt out of being told to leave a building. The bypass is a flag on the type, so a new emergency type
inherits it by being declared correctly.

**A DISMISSED case carries no penalty.** The student was cleared, and a consequence on a clearance is
a contradiction the file would happily store.

**The student is told, and the fact of telling them is recorded.** A case that was decided and never
communicated is a case the student cannot appeal.

**Room, invigilator and classification are snapshotted.** They come from the slot's room allocation
and are COPIED onto the case, because a case is a historical document: the room roster for an exam in
March is not the roster today.

**Entities.**
`cheating_case`: id, examSlotId, studentProfileId, issue, description, riskLevel, classification,
source, status, roomId, invigilatorUserId, reportedByUserId, studentStatement, statementAt,
committeeUserIds, reviewNote, reviewedAt, decisionNote, penalty, penaltyDetail, decidedAt,
decidedByUserId, notifiedStudentAt, evidenceJson, createdAt, updatedAt.
`cheating_case_event`: cheatingCaseId, type, actorUserId, note, detailJson, createdAt.
`cheating_case_evidence`: cheatingCaseId, fileId, kind, note, uploadedByUserId, createdAt.

**Screens.** The hub (queue + block cards + counts) and five blocks: the queue, report, committee
review, the case file, and the historical record. The block list is published by
`GET /examcell/cheating-cases/catalogue`, so a block added on the server draws itself.

**The admin's view reads the same table.** The admin's cheating screen was a mock — five hardcoded
alerts naming students who do not exist — and it now reads the same endpoint, so the two desks cannot
disagree about the same case. The decision still belongs to the exam cell.

### 3.7 Notifications (X-09)

The exam office sends **nine kinds of message**, and the vocabulary is the SERVER's: `GET
/examcell/notifications/catalogue` returns every category with its label, icon and colour, and the
screen draws from that. A client-side copy is a second thing to forget to update, and the symptom
is a chip that says "Results" in the list and "Result publication" in the composer.

| Category | Audience | What it is | Raised by |
|---|---|---|---|
| `EXAM_SCHEDULE` | student | an exam is on the timetable | `addSlot` → `announceExamScheduled` |
| `TIMETABLE_CHANGE` | student | a paper moved, or a room changed | `rescheduleSlot` → `announceTimetableChange` |
| `HALL_TICKET` | student | your hall ticket is ready to collect | hall-ticket publication → `announceHallTickets` |
| `EXAM_REMINDER` | student | your exam is tomorrow | `POST /notifications/reminders/sweep` → `sweepExamReminders` |
| `EVALUATION_DEADLINE` | officer | papers are waiting and the deadline is close | `remindDeadline` → `announceEvaluationDeadline` |
| `RESULT_PUBLICATION` | student | your result is out | `publishSlot` → `announceResultPublished` |
| `REVALUATION` | student | your revaluation was decided | `decideReevaluation` → `announceRevaluationDecided` |
| `CHEATING_CASE` | student | a case concerning you has moved | `decideCase` → `raise` (`EXAM_CHEATING`) |
| `IMPORTANT_NOTICE` | both | a notice the office has marked as important | `POST /broadcasts` → `composeExamCellBroadcast` |

**Two inboxes, and they are different.** The exam cell's own inbox is **OFFICER-ONLY**: a student's
result publication is not in the controller's work queue, and the controller's evaluation deadline
is not in a student's inbox. A student reads the **shared student inbox**, which merges the finance,
hostel and exam-cell vocabularies (`mergeRegistries` in `student.routes.ts`) — so a student sees
their hall ticket, their timetable change, their result and their revaluation in the inbox they
already open.

**The inbox selects by TYPE, not by source module.** `sourceModule: 'examcell'` is also set on a row
the student owns (a cheating decision, a result publication), so selecting by source module would
pull a student's result into the desk's queue.

**A mute SUPPRESSES the row; it does not hide it.** A reader who muted a category gets **no row at
all**, because the unread badge counts rows the recipient cannot see — and a badge that only goes up
and never clears is worse than no badge. The exception is `IMPORTANT_NOTICE`, which **ignores the
mute**: a notice the office marked as needing attention must not be able to be silenced. The bypass
is a flag on the type, so a new important type inherits the behaviour by being declared correctly.

**The reminder sweep is ON DEMAND and IDEMPOTENT.** Nothing in this platform is scheduled, so "who
is due a reminder" is answered by asking. The alert is keyed on the exam and the day
(`dedupeKey = exam.reminder:<examId>:<day>`), so pressing the button twice leaves one row per
student, not two. The lead window is 24 hours (`REMINDER_LEAD_HOURS`).

**One writer.** Every notification in this module goes through `raise`, and the type is checked
against the registry on the way out — an unregistered type is **refused at the writer** (400),
because an unregistered type is a row that will be labelled with a fallback and filed nowhere. The
cheating desk no longer open-codes its own `prisma.notification.create`.

**Only the office composes.** `IMPORTANT_NOTICE` is the single composable category. The other eight
are facts the system reports, and a controller who could publish a `RESULT_PUBLISHED` could forge a
result. The composer says so on the screen, not only in the code.

**Audiences.** `ALL_STUDENTS` · `SEM_STUDENTS` (semester ≥ 3) · `FINAL_YEAR` (semester ≥ 7) ·
`ALL_OFFICERS` · `EVERYONE`. Every branch is **tenant-scoped** — the old composer resolved
`ALL_STUDENTS` with no institution filter, so one college's exam notice went to every college's
students.

### 3.8 Profile (X-10)

A profile is not a card. It answers **seven questions**, each on its own endpoint, because they
change at completely different rates.

| # | Question | Endpoint | What it answers |
|---|---|---|---|
| 1 | Who is this? | `GET /examcell/profile` | name, email, phone, joined, last sign-in |
| 2 | Where do they work? | the same | the **institution** and the **department** (read from the rows, never hardcoded) |
| 3 | What is theirs? | the same | exams **they created**, invigilator duties **they hold**, evaluations **they own**, and the named list of their exams |
| 4 | What may they do? | `GET /examcell/profile/permissions` | the permissions their roles grant, read from the RBAC map |
| 5 | What do they want? | `GET /examcell/profile/notification-preferences` · `PATCH` the same | which of the nine categories they have muted |
| 6 | Is the account safe? | the auth surface | password, live sessions, sign-out-everywhere |
| 7 | What have they done? | `GET /examcell/profile/activity` | live sessions and recent actions from the audit log |

**Every figure is DERIVED.** The exam count comes from `Exam.createdByUserId`, the duty count from
`ExamRoomAllocation.invigilatorUserId`, the evaluation count from `Evaluation.evaluatorUserId` —
and the institution's own totals are reported **beside** them, not instead of them. The old profile
reported the institution's hall tickets and results as though they were the officer's work, which
is a different claim dressed as the same one.

**The permissions are the RBAC map's.** `RolePermission` and `PermissionGroup` are administered live
and audited, so "what may this officer do" is **read** from that map rather than restated. The
category is `EXAMS` (the desk), not `EXAMCELL` (the role).

**The mute is written THROUGH.** A toggle held in local `useState` is forgotten the moment the
screen unmounts — and a mute that silently forgets itself is worse than no mute at all, because the
person believes they turned it off. `IMPORTANT_NOTICE` is **not mutable**, and the screen says
"Always on" rather than offering a switch that does nothing.

**The activity endpoint SAYS the session limitation.** Sessions are identified by start time only —
no device information is stored — and the response carries that note so the screen does not have to
hardcode the limitation.

**Logout actually logs out.** The old profile's Logout row showed an alert saying "Returning to
login" and then did nothing at all: the token stayed and the officer stayed signed in. A logout
that does not log out is worse than no logout.

**Screens.** The profile hub plus four blocks: access & permissions, sign-in history, change
password, and help & support. The help screen is navigable — every part of the module it names
links to the screen that does the work. All four are registered in `exam_cell.js`'s
`FEATURE_MODULES`, and a key that is not registered fails **silently**, so the UI audit asserts
every one of them is present.

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

### 3.11 Evaluations (X-05) — the eleven requirements

| # | Requirement | Where it lives | Endpoint |
|---|-------------|----------------|----------|
| 1 | Answer-script custody | `SCRIPTS` — per-paper `NOT_RECEIVED → RECEIVED → VERIFIED`, one step at a time; bulk receive for a subject | `POST /evaluations/papers/:paperId/script` · `POST /evaluations/:id/scripts/receive` |
| 2 | Evaluator allocation | `ALLOCATION` — eligible evaluators are TEACHER/HOD **of this institution** with their live load; allocation moves `PENDING → IN_PROGRESS` and stamps every paper | `POST /evaluations/:id/allocate` |
| 3 | Subject-wise evaluation | `SUBJECTS` — every subject with marked/missing counts and moderation state | `GET /evaluations/blocks/SUBJECTS?examId=` |
| 4 | Internal marks entry | `MARKS` — per paper, 0..40; out-of-bounds is 422 with the bound | `POST /evaluations/papers/:paperId/marks` |
| 5 | External marks entry | `MARKS` — per paper, 0..60; a paper counts as marked only when BOTH halves are in | the same route |
| 6 | Grading deadlines | `DEADLINES` — one `grading_deadline` per exam (a second set MOVES it, never competes); remind stamps `remindedAt`; overdue = past due with papers unmarked | `POST /evaluations/exams/:examId/deadline` · `…/deadline/remind` |
| 7 | Missing marks report | `MISSING` — the unmarked list with which half is absent; it IS the publication block list | `GET /evaluations/blocks/MISSING` |
| 8 | Moderation workflow | `MODERATION` — request only on `COMPLETED`; decide `APPROVED` (locks marks) or `FLAGGED` (reopens them); only `PENDING` can be decided | `POST /evaluations/:id/moderation/request` · `…/moderation/decide` |
| 9 | Progress overview | `PROGRESS` + the hub hero — percent derived from rows, worst subject first; alerts name the problem | `GET /evaluations/blocks/PROGRESS` · `GET /evaluations/overview` |
| 10 | Publication gate | `publicationGate` — reasons results may not go out: unmarked papers, `FLAGGED` moderation | `GET /evaluations/slots/:id/publication-gate` |
| 11 | Revaluation requests | `REVALUATION` — the student's `re_evaluation_requests` queue with counts; decisions go through the EXISTING `/re-evaluations/:id/decide` route, never a second one | `GET /evaluations/blocks/REVALUATION` |

The hub reads everything it renders in two round trips: `GET /evaluations/catalogue` (blocks, statuses, marks policy, exams for the picker) and `GET /evaluations/overview` (hero, counters, alerts, revaluation badge); each sub-screen then fetches only its own block through `GET /evaluations/blocks/:block`.

**Policy (confirmed):** marks are internal + external against a **40/60 split**, and `isMarked` (both halves present and in bounds) is the ONE definition used by PROGRESS, MISSING, the hub percent and the publication gate · evaluation status is **derived from the papers**, never set by hand — `complete` as an endpoint does not exist · custody is **one-way** (no skipping to VERIFIED, no rewind) · APPROVED moderation **locks** entry, FLAGGED reopens it · counts are recomputed from rows in the same transaction as every write · every query is anchored at `examSlot.exam.institutionId`, so a rival's id is 404 at the wire.

## 4. Backend API Surface

Legacy exam-cell surface:
```
GET  /api/examcell/dashboard
GET  /api/examcell/results                (+ /{id}/publish, re-evaluation)
GET  /api/examcell/cheating-cases/catalogue   blocks + vocabularies + counts
GET  /api/examcell/cheating-cases             ?status=&riskLevel=&classification=&q=&overdueOnly=
GET  /api/examcell/cheating-cases/history     the decided record
GET  /api/examcell/cheating-cases/:id         the case file
GET  /api/examcell/cheating-cases/:id/timeline
GET  /api/examcell/cheating-cases/report-context/:slotId
GET  /api/examcell/cheating-cases/reportable-slots
POST /api/examcell/cheating-cases             report a case
POST /api/examcell/cheating-cases/:id/classify
POST /api/examcell/cheating-cases/:id/statement
POST /api/examcell/cheating-cases/:id/committee-review
POST /api/examcell/cheating-cases/:id/evidence
POST /api/examcell/cheating-cases/:id/decide   (+ penalty, and the student is told)
POST /api/examcell/cheating-cases/:id/reopen
POST /api/examcell/cheating-cases/:id/notes
GET  /api/examcell/notifications
POST /api/examcell/broadcasts
```

The X-09 notification and X-10 profile routes live on `examcell.routes.ts` and replace the old flat
inbox. The old `GET /api/examcell/notifications` was a 50-row dump of every message the platform had
ever sent the officer, with no categories, no filters and no pagination; `markAllRead` marked the
officer's finance mail read as well; `createBroadcast` wrote rows with a type registered **nowhere**,
and fell back to "all students" when its audience matched nobody; and `getProfile` answered a name
and three counts, two of which were the institution's totals presented as the officer's work. All
four were **removed**, not re-pointed:
```
GET    /api/examcell/notifications/catalogue                the nine categories, the composable list, the audiences
GET    /api/examcell/notifications                          ?category=&unread=&important=&page=&pageSize=
PATCH  /api/examcell/notifications/:id/read                 read or un-read ONE message
POST   /api/examcell/notifications/read-all                 scoped to the exam cell's own types
POST   /api/examcell/notifications/reminders/sweep          on demand; idempotent on (exam, day)
GET    /api/examcell/broadcasts                             what was sent, and to how many
POST   /api/examcell/broadcasts                             compose an IMPORTANT notice (403 for a non-officer)
GET    /api/examcell/profile                                who they are, where they work, what is theirs
GET    /api/examcell/profile/permissions                    read from the RBAC map
GET    /api/examcell/profile/notification-preferences       which of the nine they have muted
PATCH  /api/examcell/profile/notification-preferences       mute or unmute (IMPORTANT_NOTICE is refused)
GET    /api/examcell/profile/activity                       live sessions and recent actions
```

The student reads a **different** inbox — the shared one, which merges the finance, hostel and
exam-cell vocabularies (`mergeRegistries` in `student.routes.ts`). The exam cell's own inbox is
officer-only.

The old `GET /api/examcell/evaluations` (+ `/{id}/assign`, `/{id}/complete`) handlers were **removed** in X-05 — assign accepted any TEACHER id with no institution check, and complete force-marked every paper graded without reading one. They are replaced by the 12 evaluation routes below (`evaluation.routes.ts`, mounted **before** `examcellRoutes` with its own auth; literals first, then `papers/:paperId/...`, then `:id/...`):
```
GET    /api/examcell/evaluations/catalogue                  blocks, statuses, marks policy, exams for the picker
GET    /api/examcell/evaluations/overview                   hero %, counters, alerts, revaluation badge
GET    /api/examcell/evaluations/blocks/:block              one of the 9 blocks (422 on unknown block / missing examId)
GET    /api/examcell/evaluations/slots/:id/publication-gate may results go out? reasons if not
POST   /api/examcell/evaluations/papers/:paperId/script     custody step NOT_RECEIVED→RECEIVED→VERIFIED (422 otherwise)
POST   /api/examcell/evaluations/papers/:paperId/marks      internal+external against 40/60 (422 out of bounds)
POST   /api/examcell/evaluations/exams/:examId/deadline     set or MOVE the grading deadline (one row per exam)
POST   /api/examcell/evaluations/exams/:examId/deadline/remind  stamp remindedAt
POST   /api/examcell/evaluations/:id/scripts/receive        bulk receive a subject's scripts
POST   /api/examcell/evaluations/:id/allocate               evaluator must be THIS institution's staff
POST   /api/examcell/evaluations/:id/moderation/request     only on COMPLETED (422 otherwise)
POST   /api/examcell/evaluations/:id/moderation/decide      APPROVED (locks marks) | FLAGGED (reopens)
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

Backend: `backend/src/modules/examcell/` (schemas, service, routes) + `timetable.rules.ts` / `timetable.service.ts` / `timetable.routes.ts` for X-02 + `hallticket.rules.ts` / `hallticket.service.ts` / `hallticket.routes.ts` for X-04 + `evaluation.rules.ts` / `evaluation.service.ts` / `evaluation.routes.ts` for X-05 + `cheating.rules.ts` / `cheating.internal.ts` / `cheating.catalogue.ts` / `cheating.read.ts` / `cheating.report.ts` / `cheating.write.ts` / `cheating.legacy.ts` / `cheating.routes.ts` for X-08 + `examcell-notifications.rules.ts` / `examcell-notifications.service.ts` / `examcell-notifications.emitters.ts` / `examcell-notifications.inbox.ts` for X-09 + `examcell-profile.service.ts` for X-10 + `examcell-dashboard.rules.ts` / `examcell-dashboard.sections.ts` / `examcell-dashboard.actions.ts` / `examcell-dashboard.service.ts` / `examcell-dashboard.routes.ts` and `attendance.rules.ts` / `attendance.service.ts` / `attendance.routes.ts` for X-11
Frontend: `learnix/users/exam_cell/` (hub + 8 timetable sub-screens + hall-ticket hub & 7 sub-screens + evaluation hub & 9 sub-screens + result hub & 11 sub-screens + cheating hub & 4 sub-screens + notification centre + profile hub & 4 sub-screens + the seven-section dashboard + the mark-roll, all wired to live API)
Verification: `verify-evaluations.ts` (169) · `verify-evaluations-http.ts` (53) · `audit-evaluations-ui.ts` (223) · `prove-evaluations-teeth.sh` (13) · `check-evaluations-jsx.ts` / `-locals.js` / `-named-imports.js` (12 each) · `check-examcell-cheating.ts` (81) · `verify-examcell-cheating-http.ts` (72) · `audit-cheating-ui.ts` (112) · `prove-cheating-teeth.sh` (10) · `check-cheating-jsx.ts` (13) · `check-examcell-notifications.ts` (188) · `check-examcell-profile.ts` (39) · `verify-examcell-notifications-http.ts` (64) · `verify-examcell-profile-http.ts` (45) · `audit-examcell-profile-ui.ts` (176) · `check-examcell-profile-jsx.ts` (10)

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
| `/examcell/evaluations/catalogue` | GET | ✅ wired |
| `/examcell/evaluations/overview` | GET | ✅ wired |
| `/examcell/evaluations/blocks/:block` | GET | ✅ wired ×9 blocks |
| `/examcell/evaluations/slots/:id/publication-gate` | GET | ✅ wired |
| `/examcell/evaluations/papers/:paperId/script` | POST | ✅ wired |
| `/examcell/evaluations/papers/:paperId/marks` | POST | ✅ wired |
| `/examcell/evaluations/exams/:examId/deadline` | POST | ✅ wired |
| `/examcell/evaluations/exams/:examId/deadline/remind` | POST | ✅ wired |
| `/examcell/evaluations/:id/scripts/receive` | POST | ✅ wired |
| `/examcell/evaluations/:id/allocate` | POST | ✅ wired |
| `/examcell/evaluations/:id/moderation/request` | POST | ✅ wired |
| `/examcell/evaluations/:id/moderation/decide` | POST | ✅ wired |
| `/examcell/results` | GET | ✅ wired |
| `/examcell/results` | POST | ✅ wired |
| `/examcell/results/publish` | POST | ✅ wired |
| `/examcell/re-evaluations/:id/decide` | POST | ✅ wired |
| `/examcell/cheating-cases` | GET | ✅ wired |
| `/examcell/cheating-cases/catalogue` | GET | ✅ wired |
| `/examcell/cheating-cases/history` | GET | ✅ wired |
| `/examcell/cheating-cases/:id` | GET | ✅ wired |
| `/examcell/cheating-cases/:id/timeline` | GET | ✅ wired |
| `/examcell/cheating-cases/report-context/:slotId` | GET | ✅ wired |
| `/examcell/cheating-cases/reportable-slots` | GET | ✅ wired |
| `/examcell/cheating-cases` | POST | ✅ wired |
| `/examcell/cheating-cases/:id/classify` | POST | ✅ wired |
| `/examcell/cheating-cases/:id/statement` | POST | ✅ wired |
| `/examcell/cheating-cases/:id/committee-review` | POST | ✅ wired |
| `/examcell/cheating-cases/:id/evidence` | POST | ✅ wired |
| `/examcell/cheating-cases/:id/decide` | POST | ✅ wired |
| `/examcell/cheating-cases/:id/reopen` | POST | ✅ wired |
| `/examcell/cheating-cases/:id/notes` | POST | ✅ wired |
| `/examcell/notifications` | GET | ✅ wired — 9 categories, filters, paging |
| `/examcell/notifications/catalogue` | GET | ✅ wired |
| `/examcell/notifications/read-all` | POST | ✅ wired |
| `/examcell/notifications/:id/read` | PATCH | ✅ wired |
| `/examcell/notifications/reminders/sweep` | POST | ✅ wired — on demand, idempotent |
| `/examcell/broadcasts` | GET | ✅ wired — the sent notices |
| `/examcell/broadcasts` | POST | ✅ wired — compose an IMPORTANT notice |
| `/examcell/profile` | GET | ✅ wired — 7 questions, derived figures |
| `/examcell/profile/permissions` | GET | ✅ wired |
| `/examcell/profile/notification-preferences` | GET · PATCH | ✅ wired |
| `/examcell/profile/activity` | GET | ✅ wired |

**X-11 — the seven-section dashboard and the mark-roll:**

| Endpoint | Method | Status |
|----------|--------|--------|
| `/examcell/dashboard/catalogue` | GET | ✅ wired |
| `/examcell/dashboard/overview` | GET | ✅ wired — all seven sections |
| `/examcell/dashboard/blocks/:block` | GET | ✅ wired |
| `/examcell/dashboard` | GET | **gone** — 404, superseded by the three above |
| `/examcell/attendance/summary` | GET | ✅ wired |
| `/examcell/attendance/slots/:slotId` | GET · POST | ✅ wired — the roll, and marking it |

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
- Evaluations hub: live API (catalogue, hero %, alerts, nine block cards with live badges)
- **Progress / Scripts / Allocation / Subjects / Marks / Deadlines / Missing / Moderation / Revaluation**: live API — custody buttons only offer the move the server would accept, marks entry validates 40/60 against the published policy, moderation decides only from `PENDING`, revaluation decides through the existing `/re-evaluations/:id/decide`
- Results: live API (pending/published, publish, re-evaluation decide)
- **Hall Tickets hub**: live API (catalogue, overview, publication hero); block cards route through `goToRoute`
- **Eligibility / Generation / Tickets / Schedule**: live API — each owns its exam picker; warnings are shown, never enforced; the run issues exactly what the preview promised; printing marks downloaded
- **Centre / Requests / Publication**: live API — institution-wide centre, approve/reject/complete requests, publish or recall
- Cheating Cases: live API (risk filters, confirm/dismiss/escalate)
- **Notifications**: live API — the nine categories from the server's catalogue, category/unread/important filters, paging, mark one read, mark all read, the notice composer, and the on-demand reminder sweep
- **Profile**: live API — identity, institution and department, the derived responsibilities, the RBAC permission list, the nine category mutes written through, the live sessions, the recent actions, and a logout that actually logs out
- **Profile sub-screens**: access & permissions · sign-in history · change password · help & support — all four registered in `FEATURE_MODULES` and all four live
