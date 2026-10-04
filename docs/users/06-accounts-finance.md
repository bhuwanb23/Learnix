# 06 — Accounts & Finance App (`role: accounts`)

> Entry: `users/accounts_finance/accounts_finance.js` · Pattern: **tab-router** (5 tabs + 5 feature modules)

## 1. Role & Scope
Accounts & Finance runs all money flows: fee collection, dues & recovery, payroll, fee structure, expenses, scholarships, and finance reports. Admin's Fees & Finance module is the institution-level view. Alumni donations also land here as collections.

## 2. App Shell
- **Bottom nav**: Dashboard · Collections · Dues · Payroll · Profile.
- **Feature modules**: FeeStructure, Expenses, Scholarships, Reports, Notifications.

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (FY collections vs target progress), stats (collected/target/dues/defaulters), recent collections, pending dues, alerts (defaulter escalation, payroll due), quick-tool launcher, activity feed.

### 3.2 Collections — the money-IN desk

A collection is three linked things, and the screens treat all three as first-class:

1. a **payment** (money in), 2. a **receipt** (proof the family holds), 3. **allocations** (which bills it settled).

Money is stored as integer paise (ADR-04) and only becomes rupees at the API edge.

**Screens (hub + 3 sub-pages)**

| Screen | What it does |
|--------|--------------|
| **Collections** (hub) | Search by reference / receipt / roll no / name; filter by date range (today, 7d, 30d, all); sort by newest, oldest, largest, smallest. Headline cards show collected today / last 30 days / all time and **deliberately ignore the active filter** — the filtered total is reported separately in the list header so the two can't be confused. Reversals are called out on their own banner and excluded from every collection total. |
| **Collect Payment** | Search students (each result shows their *live* outstanding), enter the amount, then either **Oldest first** (server applies it, with a preview of the order) or **Choose bills** (point the money at specific dues, with Full / Half / Clear per row). A live plan shows exactly what will be cleared, what will be held as an advance, and blocks submission if the split exceeds the amount. Then method (incl. Cheque) and the receipt head. |
| **Collection Detail** | The receipt as the family holds it — reference, amount, status, receipt number and issue/void timestamps. Lists every allocation with the due's balance **after** this payment and a progress bar. Carries the reversal flow. |
| **Student Statement** | One account in one place: billed − paid = due, plus any advance held. Tabs over every bill (outstanding first, then settled) and every payment (live, then reversed). Reachable with no student preset — type a roll number. |

**Allocation is explicit, not guessed.** Omit `allocations` and the server settles the student's dues **oldest-first**, then books any remainder as an *advance*. Send `allocations` and the officer is saying exactly which bills the money pays. A due cannot hold a single `paymentId` — one payment clears several dues — which is why `PaymentAllocation` is a link table with `@@unique([paymentId, dueId])`.

**A due's status is derived from its balance**, never stored independently: `status = amountMinor - paidMinor === 0 ? CLEARED : paidMinor > 0 ? PARTIAL : UNPAID`. `status` alone cannot tell a half-paid bill from an unpaid one, which is why `FeeDue.paidMinor` exists.

**Reversal is real, and the rows survive.** A reversal un-applies each allocation, re-derives each due's status, stamps the payment with `reversedAt`/`reversalReason` and voids the receipt with `voidedAt`/`voidReason`. Nothing is deleted — an accountant needs to see that money came in and then went back out. A reversed payment keeps its row (visible, struck through) but stops counting toward collections, the dashboard and the ledger.

**What this desk refuses.** A payment raised in another module — a donation, a hostel rent receipt, a transport fee, a library fine — is reversed *there*. The detail screen detects the link row and says where to go instead of half-undoing it. A pure advance has no due to put money back on; reversing it is a refund, which is a different operation.

**Numbering.** `PAY-YYYY-NNNN` and `RCP-YYYY-NNNN` are derived per institution per year and **retried against the unique index** on `P2002`. The old scheme numbered from a global count, which duplicates under concurrency and collides with the alumni module's identical scheme.

**Tenant scoping.** `FeeDue` carries no `institutionId` — it reaches its tenant through `studentProfile.user`. Every read and write of a due goes through that path. (The previous `listDues(_institutionId)` took the tenant and threw it away, and `remindDue`/`waiveFee` fetched any due by bare id.)

**Entities**

`payments` (existing) gains `reversedAt`, `reversalReason`. `receipts` gains `voidedAt`, `voidReason`. `fee_dues` gains `paidMinor`, `lastPaymentAt`, and the `allocations` back-relation.

```prisma
model PaymentAllocation {   // NEW — which dues a payment settled
  paymentId   String
  dueId       String
  amountMinor Int
  payment     Payment @relation(...)
  due         FeeDue  @relation(...)
  @@unique([paymentId, dueId])
}
```

**Verification** — `backend/scripts/verify-collections.ts` (104 assertions, service level) and
`verify-collections-http.ts` (46 assertions, through the real router/auth/zod). Both restore the
dev DB. The HTTP one exists because a direct-call test cannot see the wiring bug this desk nearly
shipped: `/collections/statement` is a literal path that Express would match against
`/collections/:id` if the param were registered first.

### 3.3 Dues & Recovery
**Hub (`pages/dues/dues.js`).** The old screen listed every due in one undifferentiated block with two
unlabelled icon buttons per row, and its headline "Unpaid" card counted **billed amounts** rather than
what was still owed — so a part-paid bill read as fully outstanding. It offered no way to find a
family, no sense of how old the debt was, and no record of whether anyone had chased it. Now:

| Area | What it shows |
|---|---|
| **Headline** | Outstanding (sum of open **balances**), overdue total + count, money actually **recovered in 30 days** — counted from `PaymentAllocation`, so an advance is not mistaken for recovered fees. Plus flags for part-paid and already-chased bills. Deliberately **filter-independent**, so the summary does not jump as the officer narrows the list. |
| **Receivables aging** | Five standard buckets (not due · 1–7 · 8–15 · 16–30 · 30+ days) with count and rupee total each. Tappable — each is also a `bucket` filter. The buckets partition the overdue book exactly. |
| **Filters** | Status chips (Open · Nothing paid · Part-paid · Waived · Settled · Everything), free-text search over student name / roll no / fee title, six sorts (severity, longest overdue, largest/smallest balance, due date, recently chased). The list header reports the *filter's* own count and outstanding total. |
| **Rows** | Derived status pill, **balance** with progress bar and "₹X of ₹Y paid" when part-paid, an overdue phrase that reads the way a desk says it ("7 months overdue"), and a `chased N× · 3 days ago` tag when a reminder has been sent. |
| **Waived banner** | When any bill is waived, the waived count and value are named explicitly as excluded from outstanding, with a note that each can be reinstated. |

**Sub-page `DueDetail`** (`pages/dues/due_detail/due_detail.js`) — one bill end to end: amount,
progress bar, due date, aging, fee-structure breakdown; the student's whole position with a deep link
to their statement; every payment allocated against this bill (struck through if reversed, tapping one
opens its receipt); the student's other open dues; and a **recovery history** combining the reminder
log with the waiver stamp.

**Actions are gated server-side.** The detail response carries `canRemind` / `canCollect` / `canWaive`
/ `canReinstate`, so the screen renders an explanation instead of a button that would come back as a
409. Chasing a family for a bill they already paid is the worst thing this desk can do, so it refuses
rather than guesses.

| Action | Behaviour |
|---|---|
| **Send Reminder** | Increments `reminderCount`, stamps `lastRemindedAt`, notifies the student, audits. An optional note is appended to the message — enough to say "we agreed a 7-day grace" or to apologise for chasing a settled bill. Refused on a cleared or waived due. |
| **Waive Fee** | Sets `WAIVED` with `waivedAt` **and `waivedByUserId`** — a waiver with no actor is an unauditable one. Notifies the student with the reason. Refused on a cleared due or a due with no balance. |
| **Reinstate Fee** | **New.** Reverses a mistaken waiver: clears the waiver fields and **re-derives** the status from the balance, so a part-paid bill returns as `PARTIAL` — not `UNPAID`. Restores the aging clock and keeps the reminder history. Without this, the desk's only answer to a wrong write-off was a direct database edit with no audit trail. |

**Status is derived, never trusted.** `status` is a denormalised column that older code paths could leave
contradicting `paidMinor`; a desk that renders "₹0 paid against ₹1.35L settled" is worse than no desk.
`deriveDueStatus()` recomputes it from the money on every read and `reconcileDues()` repairs the stored
column when it drifts. `WAIVED` is the one status that is a decision rather than a calculation, so it
survives the arithmetic.

**`daysOverdue` must be computed in whole local days.** Both ends are normalised with `startOfDay()`,
matching `syncDueOverdue`. Raw millisecond arithmetic disagrees in any timezone with a fractional
offset — in IST (+5:30) a dueDate seeded at `00:00 UTC` is `05:30` local, so the raw form floors to 413
where the normalised one gives 414. Reinstatement originally used the raw form and silently reset a
414-day-old bill to "413 days overdue"; `daysPastDue()` is the shared helper and `verify-dues.ts` guards
the regression.

**Tenant scoping.** `FeeDue` carries no `institutionId` — it reaches its tenant through
`studentProfile.user`. Every read and write goes through that path, so another school's bill is a 404
here, not a row.

**Entities.** `fee_dues` gains `lastRemindedAt`, `reminderCount`, `waivedAt`, `waivedByUserId`.

**Verification** — `backend/scripts/verify-dues.ts` (86 assertions, service level) and
`verify-dues-http.ts` (42 assertions, through the real `createApp()`). Both restore the dev DB and are
idempotent across repeated runs. The HTTP one exists because a direct service call cannot see whether
`/dues/:id` shadowed a literal route, and it confirms the status-code contract end to end (401/403 for
auth, 400 for zod, 404 cross-tenant, 409 for a cleared/waived due). It also asserts the cross-feature
invariant that the dashboard's `unpaidDues` equals the dues desk's `outstandingRupees`.

---

#### Recovery sub-features

The desk above answers *"what can I chase right now?"*. The sub-features below answer the four
questions that follow it, each on its own screen, because one flat bill list answers all of them badly.

**Hub is four views** (`pages/dues/dues.js`). `BILLS` · `STUDENTS` · `COURSES` · `PLANS`. Each view loads
only its own data. Cross-screen numbers are reconciled on purpose — the audit asserts that the bill
list, the student roll-up, the cohort roll-up and the dashboard all report the *same* outstanding total.

##### Student-wise outstanding balance

Sub-page `StudentDues` (`pages/dues/pages/student_dues/`). Built around money **owed**, where the
collections statement is built around money received. Server: `listStudentBalances`,
`getStudentDues` (`dues.insights.ts`).

| Area | What it shows |
|---|---|
| **Position** | Outstanding, overdue slice, late fines charged, paid-to-date against billed, and `oldestOverdueDays`. |
| **Overdue share** | `overdueSharePercent` with an explicit verdict — ≥60% late means offer a plan, ≥25% means remind, below that means leave it alone. This is the number that decides what happens next, so the screen says which. |
| **Aging by worst bill** | On the roll-up, each student is placed in the bucket of their *worst* bill, because a desk triages people, not rupees. |
| **Rows** | Every bill with its fine, an instalment badge, a chase count and the "₹X of ₹Y paid" progress bar. |
| **Deep links** | Full statement, collect a payment, and the cohort breakdown for this student's programme. |

##### Course / semester-wise dues

Sub-page `CourseDues` (`pages/dues/pages/course_dues/`). Grouped by **program × semester × academic
year** — the group that actually answers "which cohort is not paying", which is the question a HOD asks.
Server: `listCourseDues`.

Semester comes from `studentProfile.currentSemester`, not from the fee: fees are raised per program per
year and carry no semester of their own, so an institution with two running batches of the same program
sees them apart instead of merged into one meaningless total. Bills with no program land under
**"Unassigned"** rather than being dropped — an unassigned bill is a data problem the desk needs to see.

`WAIVED` **and** `SUPERSEDED` are counted separately from outstanding. Counting a plan's replaced parent
as outstanding made this view disagree with the bill list by exactly the original bill — the whole
amount of the plan. `recoveryPercent` (paid ÷ billed) is the headline; `collectionPercent` is also
sent, and where the two differ the gap is waived or planned money. `years[]` carries `hasDues` so a
year filter never produces a silent zero.

##### Late-payment fines

`LateFeeRule` (`late_fee_rules`) is per-institution. The mechanism is universal; **whether a fine is
charged, and how much, is the institution's decision** — so the rule is a policy statement, written in
plain English and previewed before it is saved.

| Field | Meaning |
|---|---|
| `graceDays` | No fine until the bill is this many days past due. |
| `mode` + `valueBp`/`flatMinor` | `PERCENT` (basis points of the unpaid bill) or `FLAT` (a fixed sum), per month late. |
| `capBp` | A fine can never exceed this share of its bill, however long the family takes. This is the protection that stops a small delay becoming a disproportionate bill. |
| `maxMonths` | Accrual stops after N months (0 = no limit). |

`computeLateFee` (`dues.fines.ts`) is pure and order-independent: grace → started months past grace
(30 days = 1 month) → rate applied to the **unpaid bill**, never to a figure that already includes a
fine. That base is the anti-ratchet: because the assessed amount is stored on the due
(`lateFeeMinor`) and the rule reads only the bill, re-running an assessment can never compound a fine.

Fines are **assessed, never automatic**. `assessLateFee` stamps `lateFeeAssessedAt` /
`lateFeeAssessedByUserId` and notifies the student; `waiveLateFee` removes it with a recorded reason
and leaves the **fee** owed. `runLateFeeAssessment` is a bulk run that touches only bills already
overdue *and* not yet fined, and writes one audit row for the run.

Sub-page `LateFeePolicy` (`pages/dues/pages/late_fee_policy/`) is where the rule is written. It shows
the server's **projection** — overdue count, already fined, would be fined, total that would be charged
and how many families it touches — before the policy is saved, so an officer turning on a fine knows
what it costs this month rather than discovering it on next month's collection report. It also previews
the plain-English sentence a parent will read back to the desk.

##### Bulk reminder notifications

Tick rows, or **"everyone matching this filter"** — both go through the same `POST /dues/remind-bulk/preview`
first. The preview returns `targets`, `students`, `totalRupees` and a `skipped[]` list with **a reason
per row** (`already cleared`, `less than 7 days late`, `reminded 3d ago, cooldown 7d`), so "remind
everyone" can never be an unverified tap.

Guards: `skipChased`, `minDaysOverdue`, `cooldownDays`. Sending groups by **family, not by bill** — a
student with four overdue bills gets one itemised message instead of four, which is both what a parent
wants to see and the only version they keep reading. The hub re-reads guards from the preview request
rather than the screen state, so what is confirmed is exactly what was shown.

##### Payment plans / instalments

A plan **replaces** one bill with N real bills. The parent becomes `SUPERSEDED` and stops being
collectable; the instalments are ordinary `FeeDue` rows that age, get chased and get fined on their own
dates. A plan the desk does not track is just a note in a drawer, so this is deliberate.

Sub-page `PaymentPlans` (`pages/dues/pages/payment_plan/`). Server: `dues.plans.ts`.

| Rule | Why |
|---|---|
| 2–12 instalments | One instalment is not a plan; past 12 it is a bookkeeping habit and every instalment is a bill the desk has to age. |
| Covers only the remaining balance | A plan must never re-charge money that has already landed. |
| `MONTHLY` / `FORTNIGHTLY` / `WEEKLY` | The only options the server accepts; the picker offers exactly these. |
| Cancellation refused once any instalment is paid | Restoring the parent after a payment landed would bring back the full original bill and lose the money paid. |

`splitAmount` puts the remainder paise on the **earliest** instalments, so the parts always sum to
exactly the balance. The agreement screen shows the resulting schedule and checks the sum against the
balance **before** agreeing, and refuses to submit when they disagree.

`getDuePlan` resolves a plan in either direction — an instalment knows its plan, a replaced parent knows
the plan that replaced it — so `/dues/:id/plan` works from both ends. `getDueDetail` embeds the plan so
the bill screen can never render a bill without the schedule that governs it.

##### Dues clearance status

`SUPERSEDED` is a status, not a filter fiction. It is neither settled nor owed: the money now lives in
the child instalments. It gets its own label ("Split into a plan") and its own status chip, and it is
**excluded from outstanding** by `deriveDueStatus` on every screen — bill list, student roll-up, cohort
roll-up and dashboard all agree.

**A balance can exceed the amount billed.** That is correct, not a bug: `balance = amount + lateFee −
paid`, and the fine is part of what is owed. Every assertion and audit that previously read
`balance <= amount` now reads `balance <= amount + lateFee`, and progress bars run against the *claimed*
figure so a part-paid bill with a fine cannot show a bar past its own end.

**Entities.** `fee_dues` gains `lateFeeMinor`, `lateFeeRuleId`, `lateFeeAssessedAt`,
`lateFeeAssessedByUserId`, `installmentPlanId`, `installmentSequence`, `supersededByPlanId`. New tables
`late_fee_rules` and `installment_plans`.

**Verification** — `backend/scripts/verify-dues-recovery.ts` (92 assertions, service level) covers the
split arithmetic, every `computeLateFee` branch, assessment/waiver/bulk-run, all the plan rules
including cancellation, the bulk preview and family grouping, the student and course views, and the
collections integration (paying bill + fine clears the due; overpaying is refused).
`backend/scripts/audit-dues-ui.ts` (54 assertions, through the real `createApp()`) asserts that every
field the six new screens destructure is actually returned by the endpoint they call, that the three
roll-ups plus the dashboard agree on outstanding, and that the tenancy boundary holds.

Both restore the dev DB, are idempotent, and leave no fixtures behind.

### 3.4 Payroll
A payroll **hub** for the current month: hero card (run status, net payable, paid/pending split, YTD),
owed-and-unpaid total, six-month net trend bars, per-month run cards with payment progress, a collapsible
roster, and a warning listing staff who are excluded because they have no salary on file. When no run
exists for the month the hub says **Not raised** and offers **Run Payroll**.

Actions: **Run Payroll** (derives every staff member's salary from `computeSalary` — 50% basic, 40% HRA of
basic, 12% PF of basic, ₹200 professional tax, pro-rated by loss-of-pay days; every printed line is a
whole rupee so payslips foot exactly), **Apply LOP** per employee (quick presets), **Approve** a draft run,
**Pay** a single employee, **Pay all** the run in one sheet, and **view payslip** (earnings/deduction lines,
net, YTD, full month history). The old `Mark Paid` button is gone — a run moves DRAFT → APPROVED → PAID
one entry at a time or in bulk, each payment recorded with a reference.

Status is server-owned: the UI renders Approve/Pay-all/Apply-LOP only when the API returns
`canApprove` / `canPay` / `canAdjust`, and staff not on the run are listed instead of silently dropped.

**Entity `payroll_run`**: id, institutionId, month, status (DRAFT/APPROVED/PAID), gross, deductions, net,
approvedBy/At, paidBy/At. **Entity `payroll_entry`**: id, runId, staffUserId, snapshot of
employeeNo/designation/department/bankAccountLast4, earningsJson, deductionsJson, lopDays, gross,
deductions, net, status, paidByUserId, paidAt, paymentRef.

### 3.5 Fee Structure (module)
Per-program fee breakdown (tuition, other charges, total). Actions: **Edit Structure**, **Request Revision** (→ admin approval).

**Entity `fee_structure`**: program, tuition, other, total (shared with Admin).

### 3.6 Expenses (module)
Departmental expense tracking (category, vendor, amount, date, approval status). Actions: **Add Expense**, **Approve/Reject** (within budget), monthly expense summary.

**Entity `expense`**: id, category, vendor, amount, date, status (Pending/Approved/Rejected), budgetRef.

### 3.7 Scholarships (module)
Scholarship schemes (name, type Merit/Need-based, coverage %, applicants, awarded). Actions: **Approve Applicant**, **Disburse** (creates collection write-off or payment).

**Entity `scholarship`**: id, name, type, coverage, applicants, awarded; `scholarship_award`: studentId, amount, status (Approved/Disbursed).

### 3.8 Reports (module)
Finance reports: fee collection summary, dues aging, payroll summary, expense vs budget, scholarship disbursement. Export to CSV/PDF.

### 3.9 Notifications
Inbox (collection/due/payroll/scholarship types) + Broadcast tab (audience: Defaulters / All Students / Staff → fee reminders, payment confirmations, payroll notices).

### 3.10 Profile
Finance officer profile, FY stats, preference toggles, account menu.

## 4. Backend API Surface
```
GET  /api/accounts/dashboard
GET  /api/accounts/collections            (POST /{id}/record, /{id}/receipt)
GET  /api/accounts/dues                   (POST /{id}/remind, /{id}/waive)
GET/POST /api/accounts/payroll            (POST /run, /{id}/payslip)
GET/PUT /api/accounts/fee-structure       (POST /{id}/revision)
GET/POST /api/accounts/expenses           (+ /{id}/approve|reject)
GET/POST /api/accounts/scholarships       (+ /{id}/approve, /{id}/disburse)
GET  /api/accounts/reports                (+ /export)
GET  /api/accounts/notifications
POST /api/accounts/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Student**: fee dues, receipts, payment status (fee payment module).
- Writes → **Admin**: collection stats, expense approvals, fee structure revisions.
- Reads ← **Admin**: student master, fee structure.
- Receives → **Alumni**: donation records (Alumni Relations records → Accounts receipt).
- Receives → **Hostel**: rent collections, mess fees.

## 6. Wiring Status — LIVE (backend + app wired end to end)

Backend implemented in `backend/src/modules/accounts/` (routes + service + zod schemas) and mounted
at `/api/v1/accounts` (role gate: `ACCOUNTS` or `ADMIN`).

**Endpoints live:**
- `GET /api/v1/accounts/dashboard` — F-01 hero stats, collections, defaulters, budget, alerts
- `GET /api/v1/accounts/collections` — F-02 collection list. Filters `q, category, method, status, range, sort, take, skip`. Returns `stats` (today/30d/all-time **net** of reversals, plus the *filtered* total and a separate reversed count) and `collections[]` with allocated vs unallocated rupees
- `POST /api/v1/accounts/collections` — F-02 record a collection. Body: `rollNo` or `studentProfileId`, `category`, `amountMinor`, `method`, optional `allocations[{dueId, amountMinor}]`, optional `note`. Allocates onto `fee_dues` (oldest-first when no `allocations`), issues a receipt, notifies the payer, audits
- `GET /api/v1/accounts/collections/students/search?q=&limit=` — F-02 student picker; each result carries live `outstandingRupees`, `openDues`, `oldestOverdueDays`
- `GET /api/v1/accounts/collections/statement?rollNo=` or `?studentProfileId=` — F-02 full statement: `position` (billed/paid/outstanding/unallocated advance), `dues[]`, `payments[]`
- `GET /api/v1/accounts/collections/:id` — F-02 detail: allocations with the due's balance after the payment, external module links, `canReverse` + `reverseBlockReason`
- `POST /api/v1/accounts/collections/:id/reverse` — F-02 reverse a collection (body: `reason`, min 5 chars). Un-applies allocations, re-opens dues, voids the receipt, stamps the payment, notifies, audits
- `GET /api/v1/accounts/ledger` — F-05 unified ledger (all payments by category)
- `GET /api/v1/accounts/fee-structure` — F-03 fee structures per program
- `POST /api/v1/accounts/fee-structure/:id/revision` — F-03 request revision
- `GET /api/v1/accounts/dues?q=&status=&bucket=&sort=&take=&skip=` — F-04 fee dues, tenant-scoped. `status`: `ALL|OPEN|UNPAID|PARTIAL|CLEARED|WAIVED`; `bucket`: `ALL|NOT_DUE|D1_7|D8_15|D16_30|D30_PLUS|CLEARED`; `sort`: `SEVERITY|OVERDUE_DESC|AMOUNT_DESC|AMOUNT_ASC|DUE_DATE_ASC|RECENTLY_REMINDED`. Rows carry `paidRupees`/`balanceRupees`/`collectible`/aging bucket/chase history; `stats` counts **balances** (not billed amounts) and adds `overdueRupees`, `defaulterCount`, `chasedCount`, `waivedRupees`, `recoveredMonthRupees`; `aging[]` is the receivables breakdown
- `GET /api/v1/accounts/dues/:id` — F-04 detail: the due, the student, the fee-structure breakdown, allocations (each tappable to its receipt), reminder history from the audit trail, the student's other open dues, their whole `position`, and `canRemind`/`canCollect`/`canWaive`/`canReinstate`
- `POST /api/v1/accounts/dues/:id/remind` — F-04 send a reminder (body: optional `note`, max 300). Increments `reminderCount`, stamps `lastRemindedAt`, notifies, audits. Refused on a cleared or waived due
- `POST /api/v1/accounts/dues/:id/waive` — F-04 waive fee (body: `reason`, min 3). Records `waivedAt` + `waivedByUserId`, notifies, audits
- `POST /api/v1/accounts/dues/:id/reinstate` — F-04 reverse a mistaken waiver (body: `reason`, min 3). Clears the waiver fields, re-derives status from the balance, restores the aging clock, notifies, audits
- `GET /api/v1/accounts/payroll` — F-06 payroll runs with entries
- `POST /api/v1/accounts/payroll/run` — F-06 create payroll run for month
- `POST /api/v1/accounts/payroll/:id/mark-paid` — F-06 mark payroll as paid
- `GET /api/v1/accounts/expenses` — F-07 expenses + budgets
- `POST /api/v1/accounts/expenses` — F-07 add expense
- `POST /api/v1/accounts/expenses/:id/approve` — F-07 approve (updates budget spentMinor)
- `POST /api/v1/accounts/expenses/:id/reject` — F-07 reject
- `GET /api/v1/accounts/scholarships` — F-08 scholarships with awards
- `POST /api/v1/accounts/scholarships/:id/approve` — F-08 approve award
- `POST /api/v1/accounts/scholarships/:id/disburse` — F-08 disburse (creates payment write-through)
- `GET /api/v1/accounts/reports` — F-09 summary by category, dues by status, expenses by category
- `GET /api/v1/accounts/notifications` — F-10 inbox
- `POST /api/v1/accounts/notifications/read-all` — F-10 mark all read
- `POST /api/v1/accounts/broadcasts` — F-10 broadcast (ALL_STUDENTS / DEFAULTERS / ALL_STAFF)
- `GET /api/v1/accounts/profile` — F-10 finance officer profile + FY stats

**App:** all 10 screens wired via `accountsApi` (`services/api.js`), demo identity `setDemoUser('accounts@learnix.dev')` in `accounts_finance.js`. Every static array removed; loading/error/retry/pull-to-refresh states throughout. Collections is a hub with three sub-pages (`CollectPayment`, `CollectionDetail`, `StudentStatement`) registered in `FEATURE_MODULES`, with `routeParams` plumbing added to `accounts_finance.js` so sub-pages know which record they are showing. Dues is a hub with a `DueDetail` sub-page (bill + student + allocations + reminders, server-gated Collect / Remind / Waive / Reinstate, and an action sheet for every mutating call); `collect_payment` accepts `dueId` so a due can be paid directly, switching to manual mode pre-pointed at that due instead of silently paying oldest-first; payroll is a hub with two sub-pages (`PayrollRunDetail`, `Payslip`) registered in `FEATURE_MODULES`; expenses has approve/reject; scholarships has disburse; reports shows live aggregates; notifications has inbox + broadcast (3 audiences); profile shows live officer data.