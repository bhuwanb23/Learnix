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

### 2.3 Cheating case
`UNDER_REVIEW → CONFIRMED | DISMISSED | ESCALATED` (escalate → admin institution view + notification).

### 2.4 Re-evaluation
`REQUESTED → APPROVED → COMPLETED | REJECTED` — window from `system_config.reEvalWindow`; approved re-eval overwrites marks with `results` versioning note.

### 2.5 Hall tickets
`NOT_GENERATED → GENERATED → DOWNLOADED` (batch generate per exam slot; QR payload = signed examSlot+student id).

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
`OPEN → ASSIGNED → RESOLVED` (assign to staff user → notification).

### 6.5 Visitor (superseded)
The one-line `IN → OUT` check-in/out log this section used to describe is now the full
authorisation workflow in **6.3**. There is no separate "just log a visitor" path: the old
`POST /visitors/checkin` created an on-campus row with no authorisation and no planned window, and
was removed rather than kept as a shortcut.

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
| Route delay / service alert | Affected route students |
| Mentorship approved/declined / event invite / donation receipt | Student / Alumni |

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
