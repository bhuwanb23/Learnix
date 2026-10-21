# 05 — State Machines & Cross-Module Write-Throughs

> Every status field in the schema is one of these machines. Values are exact strings (also live in `src/lib/enums.ts`). "Side effects" = what the backend must do beyond changing the row. All transitions are audit-logged.

---

## 1. Academic

### 1.1 Syllabus approval (02 §3.6 → 11 §3.5 → 03 §3.4)
`DRAFT → SUBMITTED → HOD_APPROVED → ADMIN_APPROVED` with bypass `SUBMITTED → CHANGES_REQUESTED → DRAFT`
- Teacher submits version → notification to HOD.
- HOD approve → **forwarded to Admin queue** (notification to ADMIN); request-changes requires `feedback` → back to teacher (notification).
- Admin approve → version becomes course's current syllabus; student syllabus tracker reads it.
- Side effects: notifications ×3, audit.

### 1.2 Assignment (02 §3.8 → 01 §3.3)
`DRAFT → PUBLISHED → CLOSED`
- Publish → visible to enrolled students + notification.
- Submission lifecycle: `PENDING → UNDER_REVIEW → GRADED | FLAGGED | RETURNED` (grading writes `gradeMarks`, `feedback`, rubric scores; publish results → student notification).

### 1.3 Quiz (02 §3.5)
`DRAFT → PUBLISHED → CLOSED`; attempt `IN_PROGRESS → SUBMITTED → AUTO_GRADED | FLAGGED` (MCQ/TF auto-grade instant).

## 2. Exams (05 · 03 §3.6)

### 2.1 Exam lifecycle
`SCHEDULED → ONGOING → COMPLETED → RESULTS_PUBLISHED`
- Publish results = one action per exam slot → all `results` rows published, students notified. Gate: all evaluations COMPLETED.

### 2.2 Evaluation
`PENDING → IN_PROGRESS → COMPLETED` (paper-level `PENDING → EVALUATING → DONE`); assign evaluator → notification.

Status is **derived, never set**: `recomputeCounts` recomputes total/marked/status from `evaluation_papers` in the same transaction as every write. A subject is `COMPLETED` exactly when every paper has both marks in bounds (`isMarked`, 0..40 + 0..60).

**Answer-script custody** (paper-level, one-way): `NOT_RECEIVED → RECEIVED → VERIFIED`. No skipping (`NOT_RECEIVED → VERIFIED` is 422) and no rewind (`VERIFIED → RECEIVED` is 422); every move carries `allowed` on refusal.

**Moderation** (evaluation-level): `NOT_REQUESTED → PENDING → APPROVED | FLAGGED`.
- Request only from `COMPLETED` (422 naming the statuses that would work).
- Decide only from `PENDING` (422 otherwise); re-requesting while `PENDING` is idempotent.
- `APPROVED` **locks** marks entry (further `enterMarks` is 422); `FLAGGED` **reopens** it.

**Publication gate** (05-state-machines §2.1): results may go out for a slot only when every paper is marked and no evaluation is `FLAGGED` — the gate returns the reasons, not just a boolean.

### 2.3 Cheating case
`UNDER_REVIEW → CONFIRMED | DISMISSED | ESCALATED` (escalate → admin institution view + notification).

### 2.4 Re-evaluation
`REQUESTED → APPROVED → COMPLETED | REJECTED` — window from `system_config.reEvalWindow`; approved re-eval overwrites marks with `results` versioning note.

### 2.5 Hall tickets
`NOT_GENERATED → GENERATED → DOWNLOADED` (batch generate per exam slot; QR payload = signed examSlot+student id).

### 2.6 Exam attendance (X-11)

**NOT A STATE MACHINE — and that is the point.** An examination roll is a set of independent facts
about a room, not a document that moves from one stage to the next. There is no `DRAFT` roll and no
`FINAL` roll: the invigilator marks a student `PRESENT` or `ABSENT`, and a student nobody has reached
yet is simply **not marked**.

```
unmarked  →  PRESENT | ABSENT
```

**Three labels, and the third is the one that keeps the other two honest.** `PRESENT` and `ABSENT`
are the two recorded states. `UNMARKED` is not a state — it is the **absence of a record**, and it
is reported as its own figure beside the other two. Folding it into `ABSENT` is the exact
conflation the feature exists to prevent: a paper whose roll nobody has taken is not a paper full of
absentees, and a dashboard that says "0 absent" for an unmarked paper is lying by omission.

**Why a new table, and not the platform's attendance one.** `AttendanceSession` /
`AttendanceRecord` (`b5_attendance.prisma`) are a **teacher's per-lecture register**: keyed by
`offeringId`, recording `PRESENT | ABSENT | LATE`, and read by the teacher and student apps. A
lecture session has **no `examSlotId`** — there is no join key between the two — so a student can be
`ABSENT` for a lecture on the same afternoon as an examination, and neither record knows anything
about the other. An examination is a different fact: sat in a room, on a date, under an invigilator,
with a hall ticket.

**Three states that would be wrong, and why:**

| Candidate | Why not |
|---|---|
| `LATE` | A late student is **PRESENT**. A third state would make "who did not turn up" ambiguous, and every absence count would then need a rule about what to do with `LATE`. |
| `EXCUSED` | An excuse is a **decision about a consequence**, not a fact about a room. It needs an approver, a reason and a workflow — a feature of its own, not a third colour on a roll. |
| *derived from results* | A `Result` proves the student sat the paper, so "ticket issued but no result" could be called absent. It cannot: it conflates *absent*, *paper-not-yet-marked* and *enrolment-dropped*. The live data proves the risk — every `EvaluationPaper` row is `scriptStatus: 'NOT_RECEIVED'` — so inferring absence from missing marks would report an empty college as fully absent. |

**The write is a bulk upsert, and it is idempotent.** One request for the whole roll, because an
invigilator takes it on a phone in a room and does not submit one request per student. The unique key
is `(examSlotId, studentProfileId)`, so marking the same student twice **corrects** rather than
duplicates — a student walking in late is the ordinary case, not the exceptional one. Every mark
is validated **before anything is written**, because a half-written roll is worse than a rejected
one: the invigilator would have to take it again.

**A student who is not on the roll is refused.** The roll is the union of the students **enrolled**
on the offering and the students holding a **hall ticket** for it, minus any dropped enrolment. A
name from nowhere is refused with a 422 that names them, because a roll that can be padded is a
roll whose absence count cannot be reported on.

**The mark is audited.** `EXAM_ATTENDANCE_MARKED` records who took the roll, when, and how many were
present and absent — because an absence count is a claim about a room, and a claim about a room
needs a name against it.

## 3. Placement (04 → 03 §3.10 → 01 §3.5)

### 3.1 Drive
`DRAFT → PENDING_ADMIN → APPROVED → SCHEDULED → COMPLETED`
- Placement creates → admin approves → placement schedules (date/mode) → runs.

### 3.2 Application (student apply → placement review)
`APPLIED → SHORTLISTED → INTERVIEW → OFFERED | REJECTED | WITHDRAWN`
- Any status change → student notification; OFFERED creates `placement_offers` row (EXTENDED → ACCEPTED/DECLINED).
- Duplicate application = 409.

## 4. Finance (06 · 07 §3.4 · 08 §3.3 · 09 §3.7 · 12 §3.4)

### 4.1 Fee due
`UNPAID → PARTIAL → CLEARED` · `→ WAIVED` (reason mandatory, admin-audited)
- Payments append to due; crossing zero clears. Reminders = notification + email_log (SMS/push later).

### 4.2 Payment
`PENDING → CLEARED | PARTIAL | FAILED`
- **Recorded payment always creates a `receipts` row.** `category` determines which detail table is touched (fine/hostel rent/transport fee/donation).

### 4.3 Donation (Alumni → Accounts write-through)
`PLEDGED → RECEIVED`
- Record action creates unified `payments` (category DONATION) + `receipts` + link row; raises Accounts "recent collections" and campaign `raisedMinor`; notification to Accounts.

### 4.4 Payroll run
`DRAFT → RUN → PAID` (bulk; per-entry `PENDING → PAID`, payslip file generated).

### 4.5 Expense
`PENDING → APPROVED | REJECTED` (budget check → 422 if over, or flag).

### 4.6 Scholarship award
`APPROVED → DISBURSED` (disburse creates payment/write-off linked to award).

### 4.7 Transport fee
`UNPAID → PARTIAL → PAID` (collect → payment + receipt; remind → student notification).

## 5. Library (07)

### 5.1 Book issue
`ISSUED → RETURNED` · `ISSUED → OVERDUE` (computed past dueDate; daily job or on-read)
- Return computes fine (config: per-day rate) → `fines` row if overdue.

### 5.2 Fine
`PENDING → PAID | WAIVED` — PAID creates `fine_payments` link + unified payment + receipt (Accounts sees it).

### 5.3 Book request
`PENDING → APPROVED → PROCURED | REJECTED` (approve → procurement pipeline row).

## 6. Hostel (08)

### 6.1 Allocation
`ACTIVE → TRANSFERRED | VACATED` — transfer/vacate frees bed (bed status back to VACANT), updates room `occupiedCount`; allocate requires vacant bed (409 otherwise).

### 6.2 Gate pass

```
PENDING ──approve──> APPROVED ──gate exit──> (out) ──gate return──> returned
   │                    │
   ├──reject──> REJECTED
   │
   └──student withdraw──> CANCELLED      (only while PENDING)
```

The **stored** status is one of four. The **derived lifecycle** is eight, because a pass is a
sequence of events and the operationally useful facts are the gaps between them. It is a pure
function of the row and `now` — `deriveLifecycle(pass, now)` in
`hostel/hostel-gate-passes.rules.ts` — and **never stored**, so it cannot go stale:

| Derived | From | Means |
|---|---|---|
| `awaiting_approval` | `PENDING` | requested, undecided |
| `approved` | `APPROVED`, no exit, departure ahead | cleared, still in the hostel |
| `departure_overdue` | `APPROVED`, no exit, departure passed | left unrecorded |
| `out` | `APPROVED`, exit recorded, return ahead | out, on time |
| `return_overdue` | `APPROVED`, exit, no return, return passed | out, late |
| `returned` | `APPROVED`, both stamps | closed |
| `rejected` | `REJECTED` | closed |
| `cancelled` | `CANCELLED` | closed |

Rules worth stating because they are the ones that were wrong:

- **`APPROVED` is not `out`.** A pass is only `out` once `actualOutAt` exists. Deriving "out" from
  `expectedInAt` alone marked students absent from the moment they were approved — including for
  a pass planned for tomorrow — and this fed both the warden inbox and `GET /residents/:id/absence`.
- **`REJECTED` is not a terminal status for lateness** and carries no `verifiedAt`. Rejecting does
  not verify anyone.
- **A decision is not revisable** (409), and neither is a gate stamp: a second exit or return is
  refused rather than overwriting the record.
- **Overdue is computed on read.** This backend has no cron, no `setInterval` and no sweep, so
  "overdue" is a query, not a state. `GET /gate-passes/overdue` returns *both* overrun kinds and
  `lifecycle` distinguishes them.
- **The one-open-pass guard** (`PENDING`, or `APPROVED` with no `actualInAt`) returns 409 naming
  the blocking pass, and applies to emergencies too — emergency is a priority flag, never a bypass.
- Both sides derive lifecycle from the **same function**. The resident absence list imports the
  rules module rather than reimplementing the derivation, and `check-hostel-gate-passes.ts`
  asserts the two agree row by row.

### 6.3 Visitor

Two-sided: a **resident** authorises, a **warden** confirms and operates the gate.

```
authorise ──> PENDING ──warden approve──> APPROVED ──gate entry──> IN ──gate exit──> OUT
               │  │            │                                  │
               │  └──withdraw───┴──> REJECTED                     └─> visit_overdue
               └──resident withdraw──> CANCELLED            (departure_overdue)
```

The **stored** status is one of seven. The **derived lifecycle** is nine, and it is a pure function
of the row, `now` and the institution's policy — `deriveLifecycle(v, now)` in
`hostel/hostel-visitors.rules.ts` — never stored, so it cannot go stale:

| Derived | From | Means |
|---|---|---|
| `awaiting_approval` | `PENDING` | resident authorised, warden has not confirmed |
| `approved` | `APPROVED`, no entry, arrival ahead | cleared, not yet here |
| `in_campus` | `IN`, inside the window | on campus |
| `visit_overdue` | `IN`, past `expectedOutAt` | still here |
| `departure_overdue` | `APPROVED`, no entry, arrival passed | never arrived |
| `left` / `no_show` / `rejected` / `cancelled` | terminal | closed |

Rules worth stating because they are the ones that were wrong:

- **`APPROVED` is not `in_campus`.** A visitor is only on campus once an entry is recorded.
- **A closed row never outranks a live one**, whatever alerts it carries. A `hasAlerts ? 0 : …`
  ranking rule pushed a week of finished *frequent-visitor* rows above the visitor actually
  overstaying. A visit that has ended cannot be acted on.
- **A decision and a gate stamp are not revisable** (409 each), and a gate refuses a **barred**
  visitor with a 409 naming the bar — the alert is for the warden to see, so the row is still
  created rather than silently dropped.
- **Restricted is a LIST, not a flag**: barred, outside visiting hours, and repeat frequency are
  three rules and a visitor can trip several at once.
- **Every rule is configuration** (`hostel.visitorPolicy`), so a campus with a 7pm–8pm window, a
  campus that never closes, and a campus that logs walk-ins with no approval step are all the same
  code. A missing or malformed policy resolves to the defaults; a **partial** save overlays the
  currently stored policy, so editing one rule does not reset the others.
- **Nothing schedules.** "Overstaying", "never arrived" and "closed" are computed on read, so they
  are true the instant they become true.
- **Phone is the identity** for both the barred list and the repeat count, with a normalised-name
  fallback only when no phone was ever recorded — a name alone would bar the wrong person.

### 6.4 Complaint
`OPEN → ASSIGNED → RESOLVED`, with one edge back: **`RESOLVED → ASSIGNED|OPEN`** on a poor rating or a
warden reopening. Assigning raises a notification to the assignee; resolving raises one to the resident
("Was it fixed?").

The category set is `PLUMBING | ELECTRICAL | NETWORK | MAINTENANCE | FOOD | SECURITY`. **`FOOD` is a
mess complaint and it deliberately reuses this lifecycle** rather than getting a second queue: a
resident who found hair in the dal wants it fixed and tracked, not routed somewhere different, and two
complaint workflows would drift apart.

#### The notification lifecycle, which is NOT a state machine

A notification has no states. It is a **fact that was reported**, and the only thing that changes
about it is whether it has been read. There is no "archived", no "dismissed", no "snoozed" — a
notification either exists and is read, or exists and is not.

That is why the hostel owns its **categories** rather than sharing the accounts desk's. A category is
a vocabulary, and "a fee is due" and "the water is off in Block B" are different vocabularies. The
hostel's eight:

| Category | Composed? | Written by |
|---|---|---|
| `ANNOUNCEMENT` | yes | the warden |
| `MAINTENANCE` | yes | the warden |
| `EMERGENCY` | yes | the warden — bypasses mutes |
| `GATE_PASS` | no | the gate-pass lifecycle |
| `LATE_RETURN` | no | the gate-pass return window |
| `VISITOR` | no | the visitor lifecycle |
| `COMPLAINT` | no | the complaint lifecycle |
| `MESS` | no | the mess lifecycle |

**A RESIDENT'S INBOX MERGES DESKS.** The student reads one list containing their finance
notifications and their hostel ones, because those are the two desks a student has dealings with. The
accounts desk's own inbox does not gain the hostel's chips — a filter chip list is a claim about what
that desk is for.

**MUTING SUPPRESSES; IT DOES NOT FILTER.** A muted category writes no row. The alternative — write
it and hide it — makes the unread badge count rows the recipient cannot see, so the badge only goes up
and never clears. The `Broadcast` row is the record of what was sent.

**THE EMERGENCY EXCEPTION IS DECLARED, NOT SPECIAL-CASED.** `HOSTEL_EMERGENCY` carries
`bypassesMute`, so it reaches a resident who muted everything else. You cannot opt out of being told
to leave a building.

**NOTHING IS SCHEDULED.** The late-return sweep is on demand and idempotent — the alert is keyed on
the pass, so asking twice does not leave two copies in the inbox.

#### The reopen edge, and why it is not a downgrade

A rating at or below `reopenRatingThreshold` (default 3, **capped at 4**) does not merely record a bad
score — it puts the work back on the board:

```
RESOLVED --(rating <= threshold)--> ASSIGNED (if assigned) | OPEN (if not)
         --  clears resolvedAt, resolvedByUserId, resolutionNote
         --  increments reopenedCount
         --  writes a REOPENED event, after FEEDBACK_GIVEN
```

The stale resolution stamp is cleared deliberately. A reopened complaint that keeps its old
`resolvedAt` displays the date of the fix that did not hold, which is precisely the reading that makes
the queue untrustworthy.

#### Escalation is derived, not a state

There is **no `ESCALATED` status and no `escalatedAt` column.** Escalation is a predicate over
`createdAt`, the severity and the live policy — so it changes when a warden edits the thresholds,
without anything rewriting a row. `age > threshold` and not `RESOLVED`. The comparison is strict, so a
complaint exactly on the line has crossed. `hoursToEscalation` is the remaining hours, or `null` once
crossed — never negative, because a client would render "escalates in −14h".

Priority is `severityWeight + min(1, age / threshold) × 40`, so the age term **saturates** at the
threshold: an ancient LOW complaint cannot sit above every urgent HIGH one forever.

### 6.4a Meal attendance — no states, and that is the point

There is **no attendance state machine.** A roll is a *measurement*, and a measurement has no
lifecycle: a resident either ate a meal or they did not, and the record of it is one row.

This is stated explicitly because the absence looks like an oversight. It is not:

- **Nobody marks attendance as `PENDING`.** Mess staff call the roll at the counter. A roll that is
  called and a roll that has not been called are not two states of the same thing — the second one
  does not exist yet.
- **There is no student-side write.** A resident cannot tap in. If they could, the figure the kitchen
  provisions against would be a claim rather than a count, and *forgot to tap* would be
  indistinguishable from *did not eat*.
- **Nothing schedules.** No cron marks a roll open, expires it, or closes the day. "Today's roll has
  not been called" is derived on read, so it is true the instant it becomes true and cannot drift
  because a job was missed.

Marking **replaces** the meal rather than appending: everyone not in the submitted list is cleared.
That is what makes the endpoint safe to retry and makes a correction at the counter a correction, not
an accumulation.

### 6.4b Meal feedback — one rating per student per meal per day

Also not a state machine. A rating is a single upsert keyed on
`(institutionId, mealDate, meal, studentProfileId)`: re-rating **replaces** rather than filing a
second opinion, so a mis-tap is correctable and a retried request over a flaky connection is not a
duplicate.

The interesting part was a bug, not a design. `listMessFeedback` took `take: 15` and then averaged
*those fifteen rows*, so the reported rating moved depending on how many opinions happened to arrive
last — and the UI labelled it "Weekly Rating". The average is now a database aggregate over the whole
window, computed independently of the page size, and it always ships with its sample size.

### 6.5 Visitor (superseded)
The one-line `IN → OUT` check-in/out log this section used to describe is now the full
authorisation workflow in **6.3**. There is no separate "just log a visitor" path: the old
`POST /visitors/checkin` created an on-campus row with no authorisation and no planned window, and
was removed rather than kept as a shortcut.

### 6.6 Cheating case (05 §3.6)

```
REPORTED ──→ UNDER_REVIEW ──→ COMMITTEE_REVIEW ──┐
    │              │                  │            │
    └──────────────┴──────────────────┴──→ ESCALATED ──→ CONFIRMED | DISMISSED
                                                  ↑                  │
                                                  └──── UNDER_REVIEW ┘   (reopened, with a reason)
```

A case is the one lifecycle in the exam cell where being wrong is expensive: it can end a student's
degree. So the record is the point, and three rules follow from that.

**EVERY STATE CHANGE WRITES AN EVENT, IN THE SAME TRANSACTION.** The `CheatingCaseEvent` row and the
change it records are written together. A case that can change without a record is a case nobody can
audit, and a decision that can be quietly overwritten is not a decision — so a CONFIRMED case offers
exactly one move: reopen it, with a reason.

**A DECIDED CASE IS DECIDED.** `CONFIRMED` and `DISMISSED` are terminal, and the only way out is an
explicit `REOPENED` event. Reopening clears the decision stamp and the penalty, because a reopened case
still showing the date of the decision that was overturned is a case file that lies.

**A DISMISSED CASE CARRIES NO PENALTY.** The student was cleared, and a consequence on a clearance is
a contradiction the schema would happily store. The server refuses it rather than storing a penalty
beside a dismissal.

**ESCALATION IS DERIVED, NEVER STORED.** There is no `escalatedAt` column and no ESCALATED status
that means "overdue" — `ESCALATED` is a referral, a place a case can go, and it can still come back
and be decided. What is derived is the OVERDUE flag: a case crosses its threshold when its age exceeds
the limit for its RISK (HIGH 24h, MEDIUM 72h, LOW 168h) and it is still open. The threshold is the
risk's, so a high-risk case sitting for a fortnight is a failure of the desk and not of the student.

**THE QUEUE ORDER IS A SUM, NOT A MAXIMUM.** `priority = severityWeight + min(1, age/threshold) × 40`.
The age term SATURATES at the case's own threshold, deliberately: without that, an ancient low-risk
case would outrank every urgent high-risk one forever, because its age term kept growing while the
severity term did not. A queue where one stale case outranks everything is a queue people stop reading.

## 7. Transport (09)

### 7.1 Service record
`SCHEDULED → IN_PROGRESS → COMPLETED` (complete logs cost; vehicle may return to ON_ROAD).

### 7.2 Vehicle status
`ON_ROAD ⇄ IDLE`, `→ SERVICE → ON_ROAD` (service completion restores route assignment).

## 8. Events, Sports & Cultural (03 §3.11 · 01 §3.4 · 10 · 12 §3.3)

### 8.1 Event
`DRAFT → PENDING_ADMIN → APPROVED → PUBLISHED → COMPLETED | CANCELLED`
- Sports/Alumni create (PENDING_ADMIN) → admin approves → organizer publishes → student/alumni apps list it.

### 8.2 Registration / RSVP (one table, three flows)
- Student event registration: `PENDING → APPROVED | REJECTED` → confirmed registrants get QR payload.
- Sports registration approvals: same table; per-student approve/reject from event detail.
- Alumni RSVP: `PENDING → CONFIRMED | DECLINED`.

## 9. Communication (03 §3.14 + all Broadcast tabs)

### 9.1 Announcement
`DRAFT → PENDING_ADMIN → PUBLISHED | REJECTED`
- Department/library/sports drafts → admin approves → published (fan-out notification to audience).

### 9.2 Broadcast
`Draft (client-side) → SENT` — resolves audienceJson → notification rows per recipient; channels gate email/push (in-app always).

## 10. Identity

### 10.1 User
`ACTIVE ⇄ SUSPENDED` (admin); student admissions: pending-approval students are `users.status = ACTIVE` only after admin approve (03 §3.2 PENDING_APPROVALS) — pre-approval rows carry `user_roles` STUDENT but `status = PENDING`.

## 11. Cross-module write-through map (the ERP glue)

| Trigger | Write-through |
|---|---|
| Donation recorded (12) | `payments` + `receipts` row → Accounts collections feed |
| Fine collected (07) | unified payment + receipt → Accounts |
| Hostel rent paid (08) | unified payment + receipt + `hostel_rent_dues` cleared |
| Transport fee collected (09) | unified payment + receipt + `transport_fee_dues` paid |
| Scholarship disbursed (06) | payment/write-off linked to award |
| Result published (05) | student notifications + visible in student app + admin reports |
| Syllabus approved by HOD (11) | admin approval queue + teacher notification |
| Drive approved by admin (03) | placement notification + drive SCHEDULED-capable |
| Event approved by admin (03) | publisher can publish to student/alumni apps |
| Announcement approved (03) | audience fan-out via broadcasts service |
| Broadcast sent (any staff) | notification fan-out to resolved audience |
| Student application status change (04) | student notification (+offer row if OFFERED) |
| Gate pass / complaint / mess update (08) | resident (student) notifications |
| Attendance below threshold (03 §3.8) | HOD + student alerts (computed check on finalize) |
| Workload > max (02/11) | HOD alert (computed on teaching reassignment) |

## 12. Notification matrix (who gets told what)

| Event | Recipient |
|---|---|
| Syllabus submitted / changes requested / admin approved | HOD ↔ Teacher |
| Leave decided (HOD/Admin) | Teacher (+substitute assignment) |
| Assignment published / graded / returned | Student |
| Exam scheduled / rescheduled / hall ticket ready / results out | Student (by offering/section) |
| Application shortlisted / offered / rejected | Student |
| Fee due reminder / payment receipt / fine | Student (+Accounts cc on waive) |
| Drive approved | Placement cell |
| Announcement published | Audience (role/dept/batch/section) |
| Gate pass requested | Wardens **of that student's institution only** |
| Visitor authorised | The resident, and the wardens of that institution |
| Visitor confirmed / admitted / departed / refused | The resident |
| Visitor barred / unbarred | Wardens of that institution |
| Gate pass decided / checked out / checked back in / withdrawn | The student |
| Complaint resolved / allocation change | Student |
| Mess rating survey sent | Every resident of that institution (optionally scoped to one meal) |
| Mess expense raised by the hostel | The **accounts desk** — never the hostel, which cannot approve its own spend |
| Route delay / service alert | Affected route students |
| Mentorship approved/declined / event invite / donation receipt | Student / Alumni |
| Exam scheduled / published / timetable changed / hall ticket ready / exam reminder | Student (the enrolment union of the slot's offering) |
| Result published | The students with a **result** on that slot — not everybody who sat it |
| Revaluation decided | The student who **asked** — never the cohort |
| Evaluation deadline reminded | The **exam office** of that institution |
| Cheating case decided | The student the case concerns |
| Important examination notice | The chosen audience — students, the exam office, or both |

> **The exam cell has two inboxes.** Its own is **officer-only**; a student's exam notice goes to the
> shared student inbox, which merges the finance, hostel and exam-cell vocabularies. The inbox
> selects by **type**, not by `sourceModule` — `sourceModule: 'examcell'` is also set on rows the
> student owns, so selecting by source module would pull a student's result into the controller's
> work queue.
>
> **A mute SUPPRESSES the row; it does not hide it.** A muted category writes **no row at all**,
> because the unread badge counts rows the recipient cannot see. The exception is
> `IMPORTANT_NOTICE`, which **ignores the mute** — a notice the office marked as needing attention
> must not be able to be silenced.
>
> **The reminder sweep is on demand and idempotent.** Nothing in this platform is scheduled, so
> "who is due a reminder" is answered by asking. The alert is keyed on the exam and the day
> (`dedupeKey`), so asking twice leaves one row per student. Asserted in
> `check-examcell-profile.ts` and over the wire in `verify-examcell-profile-http.ts`.
>
> **One writer.** Every exam-cell notification goes through `raise`, and an unregistered type is
> **refused at the writer** (400) — an unregistered type is a row that will be labelled with a
> fallback and filed nowhere. The cheating desk no longer open-codes its own
> `prisma.notification.create`.

> **Gate-pass paging is institution-scoped.** `UserRole` has no `institutionId` — tenancy lives
> on the user — so the warden lookup filters *through the relation* (`role: 'HOSTEL', user:
> { institutionId }`). A role-only lookup pages every hostel warden in the deployment, which
> discloses one student's destination to unrelated institutions. Asserted in
> `check-hostel-gate-passes.ts`, which builds two institutions; a single-institution HTTP run
> cannot see it.
>
> **Visitor notifications carry a deep link** (`dataJson` = `{ module, screen, passId/visitorId }`),
> because a notification with no target is an inbox entry a recipient has to search for. Matched on
> the id inside that payload when a suite cleans up after itself.
