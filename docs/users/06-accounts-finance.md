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

Two desks that used to be one confusing screen. **The run desk** raises and pays a month; **the
salary desk** is what a month gets raised *from* — who is on the roster, what each person is paid, what
the deductions are, and which salaries have still not been paid. The run desk used to invent every
figure from a hard-coded 50/40/12 formula; it now prices each person from the salary version in force
that month, and the salary desk is where those versions are written.

| Sub-feature | Question | Screen |
| --- | --- | --- |
| Faculty / staff salary records | Who is on the roster, and does each of them have a salary on file? | `salary_records` |
| Basic salary and allowances | What does this person earn, and out of which components? | `salary_record` + `salary_components` |
| Deductions and taxes | What is withheld — PF, professional tax, TDS — and how was the TDS reached? | `salary_record` (tax block) |
| Attendance / leave-linked pay | How many days were rostered, present, on paid leave, on unpaid leave, and what does that cost? | `salary_attendance` |
| Loans and advances | What has this person borrowed, what has been recovered, and what is still due this month? | `salary_loans` |
| Payslip generation | Is there an actual document, how big is it, and can it be opened or shared? | `payslip_document` (+ `payslip`) |
| Payroll history and pending-salary alerts | Which months exist, what is still unpaid, and how old is it? | `payroll` (hub) + `payroll_alerts` |

Screens: `payroll.js` (run hub), `payrollMeta.js`, `payrollSalaryMeta.js`, and `pages/{payroll_detail,
payslip, salary_records, salary_record, salary_components, salary_attendance, salary_loans,
payroll_alerts, payslip_document}` — nine screens, all registered in `FEATURE_MODULES`. The hub carries
two extra desk buttons: **Salary records** and **Pending salaries**.

#### §3.4.1 The run desk (existing behaviour, now priced from salary records)

Hero card (run status, net payable, paid/pending split, owed-and-unpaid total, six-month net trend bars),
per-month run cards with payment progress, a collapsible roster, and a warning listing staff excluded
because they have no salary on file. With no run for the month the hub says **Not raised** and offers
**Run Payroll**.

Actions: **Run Payroll**, **Apply LOP** per employee (quick presets), **Approve** a draft run, **Pay** a
single employee, **Pay all**, and **view payslip**. The old `Mark Paid` button is gone — a run moves
DRAFT → APPROVED → PAID one entry at a time or in bulk, each payment recorded with a reference.

Status is server-owned: the UI renders Approve/Pay-all/Apply-LOP only when the API returns `canApprove` /
`canPay` / `canAdjust`, and staff not on the run are listed instead of silently dropped.

`runPayroll` and `adjustPayrollEntry` both price from the **salary version in force that month**
(`salaryInForce`), apply **loss of pay** from the saved attendance summary (`lopDaysFor`), **TDS** from
year-to-date taxable income, and **loan recovery** from active loans. `StaffProfile.monthlyGrossMinor`
is only a fallback so a seeded institution keeps running while every new raise goes through the versioned
record. Each entry keeps a pointer to the `salaryRecordId` that priced it, because a payslip is a
historical document and must still resolve to the rules that applied when it was raised.

#### §3.4.2 Faculty / staff salary records

`GET /payroll/salary-records?month=` is the roster: every active `StaffProfile` with their live name,
employee no, department and designation, plus `hasSalaryRecord`, the gross in force, the version's
effective window, and the components attached to it. Stats cover roster size, how many have a salary,
how many do not, and the total monthly gross.

Staff with **no salary record** are listed in the roster and in the pending-alerts desk, never skipped
without a word — a person silently absent from payroll is the failure this sub-feature exists to prevent.

A salary belongs to a **person**, so it is created at `/payroll/staff/:staffUserId/salary`, not guessed
from a body field. `saveSalaryRecord` opens a new versioned record rather than editing one in place: it
closes the outgoing record's window the day before the new one starts, so `effectiveFrom`/`effectiveTo`
are **inclusive** and there is never a day with two live salaries or a gap with none. It is also how a
promotion is recorded — the reason (`Annual increment`, `Promotion`, …) is stored on the record, not just
in a log line.

#### §3.4.3 Basic salary and allowances

A component is a **rule, never a pre-multiplied number**: `percentOf` (`BASIC` | `GROSS`) + `percent`,
or a flat `amountMinor`. "HRA = 40% of basic" survives a raise; "HRA = ₹20,000" does not, and a raise that
quietly leaves HRA at last year's figure is exactly the bug the old hard-coded formula had.

The catalogue is server-owned and published at `GET /payroll/components` — 11 codes (BASIC, HRA, DA,
TRANSPORT, MEDICAL, SPECIAL on the earning side; PF, PROF_TAX, TDS, LOAN, OTHER as deductions), each with
its kind, base, default percent, taxable flag, icon and a one-line hint. The app renders what the
server sends and mirrors the constants in `payrollSalaryMeta.js`; it never invents a code.

`PUT /payroll/salary-records/:id/components` is a **replacement** edit, not an append, and the detail
screen shows a **live preview** of the resulting gross, deductions and net before anything is saved.

Three invariants hold on every computation, because a payslip reader adds the printed columns:

- the earnings lines sum to **gross**, and gross minus deductions is exactly the **net**;
- every line is a **whole rupee**, so the printed sheet foots — a reader who adds them up and gets a
  different number stops trusting the whole sheet;
- a component set that declares **more than the gross** is clamped and the excess is reported in
  `warnings` rather than silently dropped.

`SPECIAL` is the balancing line: it absorbs the rounding residue so earnings foot to gross exactly
instead of the gross being an unrounded sum of rounded parts.

#### §3.4.4 Deductions and taxes

`PF` is a percentage **of basic**, not of gross — the commonest payroll error and one the component model
makes impossible to make silently. `PROF_TAX` is a flat monthly state levy (₹200 in most states).

**TDS is computed, never typed.** The New Regime FY 2024-25 table is a **constant in `payroll.tax.ts`,**
not a database row: a tax table a finance user can edit by accident is a tax table that will be wrong.
₹75,000 standard deduction, slabs 0/5/10/20/30% at ₹3L/₹7L/₹10L/₹12L, plus 4% cess. An institution
overrides the table per salary record rather than by editing the file mid-year.

Tax is a **year-to-date liability**, so the calculation needs the months already collected:

- taxable income is summed **up to and including the month being paid**, not only the months before it.
  Using prior months only means the very first payroll month an institution runs collects no tax at
  all, and the liability stays one month behind for the rest of the year;
- `remainingTaxMinor` is **never negative** — a refund is a separate exercise needing a PAN, a declaration
  and a form, so a desk that credited a negative deduction would be inventing money;
- the balance is spread over the months remaining in the calendar year, and **December sweeps whatever is
  left**, so the year never ends a rupee short;
- the slab lines sum to the slab total exactly in paise, so the printed tax table adds up.

TDS is applied from the computed amount **whether or not the salary record declares a `TDS` component**,
and warns when it does not. Gating tax on a component row means a desk that forgot to tick "TDS"
silently under-collects for a whole year.

#### §3.4.5 Attendance and leave-linked pay

`GET /payroll/staff/:staffUserId/attendance?month=&workingDays=` **derives** the month from the approved
leave rows that overlap it; `PUT` on the same path with `?month=` records the register by hand. A
typed-in summary **wins** over the derived leave totals — the desk has seen the register, the leave table
has not.

Two rules the desk would otherwise apply by hand, inconsistently:

- only **APPROVED** leave counts, and only `EARNED` / `CASUAL` / `MEDICAL` is **paid**. A pending request
  must not cost somebody money;
- absence of **2 days or fewer is not charged** (`graceUnpaidDays`). Nobody's payslip says "loss of pay:
  1 day" for one Friday — it reads as a punishment.

The result is clamped to the working days of the month, so a leave row that overruns cannot produce more
LOP days than the month has. Each summary stores `source` (`MANUAL` | `LEAVE_SYNC`) and the derivation
returns a human-readable `basis` sentence, which the payslip prints — the reader sees *why* they were
charged, not just the number.

When the caller supplies **only** leave, an unstated present count means "present on every day they were
not on leave", **not** "absent every other day". Defaulting `presentDays` to 0 here turned a three-day
approved leave into a sixteen-day deduction, which is how a one-click derivation quietly docks somebody
most of a month.

#### §3.4.6 Loans and advances

`StaffLoan` is a principal (`principalMinor`), a monthly `installmentMinor` (0 = manual recovery), and a
denormalised `recoveredMinor` that is **recomputed from the recovery rows, never incremented**.
`StaffLoanRecovery` is unique on `(loanId, month)`, so a month cannot be recovered from the same loan
twice — double-recovery is the failure mode that quietly makes an employee's deduction wrong for a year.

`loanRecoveryDue` is what the run desk prices: active loans only, never before `grantedMonth`, and only
what is still outstanding. A loan can be **cancelled** with a reason, which stops future recovery without
erasing the money already taken back.

#### §3.4.7 Payslip generation

`POST /payroll/entries/:entryId/payslip` renders a **real single-page PDF** and stores it as a real
`File` row, so the screen can say "payslip.pdf, 34 KB" and open it — which it cannot do with an id alone.
`GET` on the same path returns the document state, `PUT` attaches an externally uploaded payslip to an
entry. It is written by hand in `payroll.pdf.ts` with **no new dependency**; ₹ is written as `INR` because
WinAnsi cannot hold the rupee sign.

Generation is refused on an entry that is not priced, and the nested `payslips/<month>/` directory is
created on demand — otherwise payslip generation 500s on a **fresh install**, which is exactly the
environment that has generated the most.

`payslip.js` is the on-screen document: earnings lines, deduction lines, net, YTD, and the full month
history. The old "payslip" was an Alert whose body was a template string claiming the slip had been
emailed and was available in a portal that does not exist in this app.

#### §3.4.8 Payroll history and pending-salary alerts

`GET /payroll/alerts` is the chase list, and each row answers *how long has this been waiting*, because
that is what decides whether to transfer the money or chase someone:

| Kind | Severity | Meaning |
| --- | --- | --- |
| `PAYROLL_UNPAID` | MEDIUM | this month's approved run is still unpaid |
| `PAYROLL_OVERDUE` | HIGH | an older month is still unpaid past `overdueDays` (7) |
| `RUN_STALE_DRAFT` | LOW / HIGH | a draft has sat untouched past `staleDraftDays` (5) |
| `NO_SALARY_RECORD` | HIGH | rostered staff who cannot be paid because no salary is on file |
| `NO_RUN_RAISED` | HIGH | the month is over and nothing was raised |
| `LOAN_STALLED` | MEDIUM | a recovery has not been posted for `stalledLoanMonths` (3) |

`GET /payroll/ageing` bands every month's balance into the four bands a desk actually uses: `NEVER`
raised, `DUE` now, `OVERDUE`, and `CRITICAL`. **Never-paid is its own band, not a zero** — a month that was
never raised and a month paid today both have zero days of age and are not the same fact.

**Entities**

- **`staff_salary_records`**: staffUserId, monthlyGrossMinor, basicMinor, effectiveFrom, effectiveTo
  (null = open), reason, note, createdByUserId. One open record per person at a time; the service
  enforces the overlap, and the `(institutionId, staffUserId)` index is what keeps that check cheap
  instead of a table scan on every raise.
- **`staff_pay_components`**: salaryRecordId, kind, code, label, percentOf, percent, amountMinor,
  isTaxable, sequence, note. Unique on `(salaryRecordId, code)`.
- **`staff_loans`** / **`staff_loan_recoveries`**: principal, installment, recovered, grantedMonth,
  status (ACTIVE | CLOSED | CANCELLED); recoveries unique on `(loanId, month)`.
- **`staff_attendance_summaries`**: unique on `(institutionId, staffUserId, month)`; workingDays,
  presentDays, paidLeaveDays, unpaidLeaveDays, lopDays, source, note.
- **`payroll_entries`** gains `salaryRecordId` and a real `payslip File?` relation.
- **`payroll_run`**: id, institutionId, month, status (DRAFT/APPROVED/PAID), gross, deductions, net,
  approvedBy/At, paidBy/At.

**API**

The salary desk lives in `payroll.structure.routes.ts`, mounted **before** `accountsRoutes` and
`feeStructureRoutes`, and applies its **own** `auth` + `requireRole('ACCOUNTS','ADMIN')`. Mounting a
router as a sibling before the accounts router costs it the middleware it used to inherit, so without its
own line every handler 500s on `req.auth!` instead of returning 401.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/payroll/components` | the catalogue + kinds + bases + a default component set |
| GET | `/payroll/salary-records` | `?month=`; roster + stats + who has no salary |
| GET | `/payroll/staff/:staffUserId/salary` | person, version in force, components, preview, tax, loans |
| POST | `/payroll/staff/:staffUserId/salary` | opens a new versioned record; closes the outgoing window |
| PUT | `/payroll/salary-records/:salaryRecordId/components` | replacement edit |
| GET | `/payroll/staff/:staffUserId/attendance` | `?month=&workingDays=`; derives from approved leave |
| PUT | `/payroll/staff/:staffUserId/attendance` | `?month=` in the query; the body is the attendance |
| POST | `/payroll/staff/:staffUserId/loans` | grant a loan or advance |
| POST | `/payroll/loans/:loanId/recover` | post a month's recovery |
| POST | `/payroll/loans/:loanId/cancel` | stop future recovery, reason recorded |
| GET | `/payroll/entries/:entryId/payslip` | document state + the file |
| POST | `/payroll/entries/:entryId/payslip` | render and store the PDF |
| PUT | `/payroll/entries/:entryId/payslip` | attach an uploaded payslip |
| GET | `/payroll/alerts` | the six alert kinds, with days waiting |
| GET | `/payroll/ageing` | per-month balances in the four ageing bands |

Every literal path is registered **before** `/payroll/:id` in a dedicated router file, for the reason the
expenses router has one: registered second, `alerts` is read as a run id and a working screen 404s.

**Money and integrity rules**

- Integer paise everywhere (ADR-04); rupees only at the API and UI edge.
- A component is a rule; only its computed amount is money, and it is rounded to a whole rupee.
- TDS comes from the year-to-date position, including the month being paid, and is never negative.
- `recoveredMinor` is recomputed from recovery rows, never incremented.
- A payslip keeps pointing at the salary version that priced it, forever.
- Write schemas are `.strict()` — silently dropping a misnamed money field turns a typo into a silently
  wrong payslip rather than an error.
- Salary, loan and attendance writes all write an audit entry.

**Verification**

`backend/scripts/verify-payroll-salary.ts` (724 assertions) exercises the pure rules with no database
(component arithmetic and the three footing invariants, tax slabs, cess, year-to-date TDS, December
sweep, LOP grace and clamping, alert and ageing rules), then the service against a throwaway institution:
version windows and overlap refusal, replacement component edits, attendance derivation both ways,
loans, recovery double-post refusal, PDF generation and the audit trail.

`backend/scripts/verify-payroll-salary-http.ts` (148) covers what a service call cannot see: that no
literal path is shadowed by `/payroll/:id`, that this router returns **401 and not 500** without a
token, that `.strict()` rejects a misspelled money field, and that no money field arrives as a
fractional rupee.

`backend/scripts/audit-payroll-salary-ui.ts` (429) checks every field the seven new screens read against
real responses, every `navigate()` target against `FEATURE_MODULES`, the accountsApi paths against the
router, the six-level import depth of each sub-page, and the client/server constant lists.

**Bugs these suites caught** — each one a defect, not a test artefact:

1. **TDS lagged a month.** Computed on prior months only, so the first payroll month collected no tax
   at all and the liability stayed a month behind all year.
2. **TDS and loan recovery vanished** when a salary record declared no `TDS` / `LOAN` component — silently
   under-collecting tax. Now applied from the computed amount regardless, with a warning.
3. **Leave-only LOP derivation invented 16 absence days** off a 3-day approved leave, because
   `presentDays` defaulted to 0.
4. **The new router had no `auth`** — 500 instead of 401. The same latent bug existed in
   `feestructure.routes.ts`; both now apply their own.
5. **Payslip generation 500'd on a fresh install** — the nested `payslips/<month>/` directory was never
   created.
6. **Components declaring more than the gross were silently clamped** — now reported in `warnings`.

### 3.5 Fee Structure (module)

The pricing desk. A hub over six sub-screens, one per sub-feature:

| Sub-feature | Question | Screen |
| --- | --- | --- |
| Course & semester-wise setup | What does this program cost, and what does one semester of it cost? | hub + `structure_detail` + `component_editor` |
| Charge components | Tuition, examination, hostel, library, admission, transport, other — and which are optional? | `component_editor` |
| Instalment configuration | How is the fee meant to be split? | `installments` |
| Scholarship / concession rules | What is the written policy, and what does a student pay under it? | `concessions` |
| Late-payment penalties | Which rule governs this program's bills, and what would a family be charged? | `penalties` |
| Version history | What did this cost last year, which lines moved, and who said why? | `version_history` |
| Effective-date management | Which version priced a bill raised on a given day? | `structure_detail` (date switcher) + `…/resolve` |

Screens: `fee_structure.js` (hub), `pages/structure_detail`,
`pages/component_editor`, `pages/version_history`, `pages/concessions`,
`pages/installments`, `pages/penalties`.

#### §3.5.1 Charge components and semester-wise setup

A fee structure used to be **three integers** — `tuitionMinor`, `otherMinor`,
`totalMinor` — typed in by hand beside a breakdown printed next to them. That
could not answer what the hostel charge was, whether semester 3 cost more than
semester 1, or whether the printed breakdown added up to the total printed
above it. It usually did not.

A **`FeeComponent`** is now one real charge line: `kind` (one of TUITION,
EXAMINATION, HOSTEL, LIBRARY, ADMISSION, TRANSPORT, OTHER), a `label` the student
will recognise, an `amountMinor`, a `semester`, and two flags. The headline
totals are **rolled up from these rows on publish, inside the same transaction**
and are never typed beside them.

- `semester: 0` means "every semester of the year" — the normal case for an exam
  or library charge. `semester: n` books the charge to that semester alone,
  which is how a degree with a more expensive final year is expressed.
- `optional: true` (hostel, transport) is **excluded from the headline total**
  and reported separately. A "total fee" that silently includes a hostel bed
  nobody is taking is a number the office cannot defend to a day-scholar.
- `firstYearOnly: true` (an admission charge) is charged in the joining year
  only, without needing a second program.

**Per-semester bills are computed, not stored.** A semester's bill is its own
component rows plus an equal share of each `semester: 0` charge, so semester 1
does not quietly cost less than semester 2 for reasons no family can see. The
proration floors each share to a **whole rupee** and puts the leftover rupees on
the **last** semester, so the eight cells the screen prints add up to the annual
total to the rupee. Prorating in paise and rounding for display does not: eight
cells each rounding up by half a rupee come to ₹4 more than the total shown
directly above them. This was a real bug, caught by
`audit-fee-structure-ui.ts`.

Editing the charge lines is a **replacement, not a patch** — the screen says so
before Save. The version history records what the structure was on a given day,
and a patch list cannot distinguish "removed" from "never existed". The write
carries `expectedVersionId`, so an edit made while someone else published is
refused with a 409 instead of silently discarding their changes.

Validation is **collected, not thrown one at a time**: zero-priced lines,
negative amounts, duplicate (kind, semester, label), unlabelled lines, unknown
charge types, a semester the program does not have, and a structure with no
tuition line are all reported in one pass. Every write schema is `.strict()`, so a
misspelled money field is rejected rather than dropped — zod silently discards
unknown keys, and a fee line saved as ₹0 with a "Saved" toast is the failure this
prevents.

#### §3.5.2 Instalment configuration

The default plan every bill against the structure is **offered**. It is the menu,
not the meal: the actual plan for a family is still agreed per student on the
dues desk, and the screen says so, because a configuration that looks binding
gets treated as binding and families get told the wrong thing.

`defaultInstallments` splits the fee with the same integer-paise arithmetic the
dues desk uses (`splitAmount` semantics: the remainder paise ride on the earliest
instalments), so the bills add back to the fee exactly. The screen mirrors that
split locally so it moves as the officer picks, and the **server's** schedule
replaces it on save. `count` is 1–12 and `ONE_TIME` is a single bill rather than
a plan; a count above 1 with no frequency is refused rather than silently
accepted, because past 12 every instalment is a bill to age, remind and chase and
the collection cost exceeds the goodwill.

#### §3.5.3 Scholarship and concession rules

`Scholarship` records **who got money**. `FeeConcession` records the **written
policy** — "50% off tuition for the top 5% of each batch", "full waiver of the
exam fee for staff ward". Without a written rule every concession is a fresh
negotiation at the counter; an award that cannot name the rule it came from
cannot be defended at audit.

A rule is `basis` (PERCENT in basis points, or FLAT in paise), `appliesTo` (a
charge type or ALL), an optional `semester`, `enabled`, and a note saying who
qualifies and against what evidence.

Three rules the arithmetic obeys, enforced on the **write**, not just displayed:

- **Each rule is computed against the full eligible base**, not against what is
  left after the previous rule. A merit concession and a sibling waiver are
  independent entitlements; applying them in sequence made the second silently
  depend on the order the desk typed them.
- **The sum is capped at the bill.** A student pays nothing, never less than
  nothing.
- **A rule is scoped.** Waiving 50% of "everything" quietly waives the hostel
  bill of a student who was never living in the hostel.

An over-large FLAT rule is **refused at save time** with the eligible amount
named, rather than accepted and silently trimmed forever. The cap check runs with
the rule treated as ENABLED regardless of what was saved, so a closed fund can
still be **parked as switched off** — which is exactly what you want to do with a
scholarship whose money ran out.

A **disabled** rule is kept, not deleted: "the alumni bursary ran out in 2023" is
a fact the office should be able to answer.

The concessions screen is a **calculator**, not a list: pick a semester, tick the
rules a student actually holds, and it shows the bill before and after, per line
and in total. Without that, "50% merit" is a phrase and "₹60,000 off" is a
guess.

#### §3.5.4 Late-payment penalties

Charging interest on a late fee is a **policy decision**, not a universal rule.
The arithmetic and the rule row (`LateFeeRule`, already `feeStructureId`-aware)
stay in `dues.fines.ts`, and `getActiveLateFeeRule(institutionId,
feeStructureId)` resolves which rule governs a bill — a program-specific row
**overrides** the institution default, whether or not it is enabled, because
"this program charges no late fee" is a decision and not a gap to be filled with
the default. The lookup is two queries rather than one with an `OR`, because
SQLite sorts NULL first ascending and a single `orderBy: { feeStructureId: 'asc' }`
silently prefers the less specific rule.

`runLateFeeAssessment` resolves the rule **per bill** (once per distinct
structure, not once per row) and skips a bill whose structure has switched its
rule off, rather than dropping it back to the default. The audit records how many
fines came from an override, so a surprising total is explainable.

The fee-structure screen does **not** re-derive any of this. It reports which
rule governs, restates it in words ("1% a month after a 15-day grace, capped at
25% of the bill"), and shows what one month late and long-overdue would actually
cost — all computed by the server. A client with its own estimate eventually
disagrees with the fine the dues desk assesses, and the officer is shown two
numbers for the same bill.

#### §3.5.5 Version history

A **version is an immutable snapshot** of the components plus an effective
window. Editing never mutates a published structure: **copy-then-publish**.

- A `DRAFT` copies the current lines, bills nothing, can be discarded with no
  effect, and only publishing moves money.
- Publishing **supersedes** the outgoing version — its window closes the day
  BEFORE the new one opens, because `effectiveTo` is inclusive and leaving both
  open on one day would mean two live rates on that date.
- A discarded draft is **marked `DRAFT_DISCARDED`, not deleted** — "someone
  started a revision and abandoned it" is itself a fact worth keeping.

The snapshot is stored as **JSON, not references to live rows**, precisely
because `FeeComponent` rows are mutable: a snapshot pointing at live rows would
rewrite its own history every time a rate changed. Snapshots are normalised into
a fixed order so two versions with the same rates typed in a different order are
byte-identical — otherwise "nothing changed" is not assertable.

The timeline diffs each version against the one before it, line by line, as
ADDED / REMOVED / CHANGED / **UNCHANGED**. `UNCHANGED` is included deliberately:
"we revised the fee structure" and "we revised four lines of it" are different
conversations.

Year-on-year movement is reported as a **percentage against the prior version**,
or as `null` when there is no comparable version — which the screen renders as
"No earlier version to compare", never as a fabricated "+0%". A fee cut is shown
green, not red: the board may well have voted for it.

#### §3.5.6 Effective-date management

This is the sub-feature the whole module exists for. **A bill is priced by the
version in force on the day it was raised, not by today's rate.** A structure
revised in November must not retroactively reprice a bill raised in July.

`effectiveTo` is **inclusive**: a version effective 1 Apr → 30 Nov applies ON the
30th, and its successor starts 1 December. Comparisons are made on whole local
days, because a raw timestamp comparison retires a version at 00:00 on its final
day.

A **SUPERSEDED version still resolves** for the window it records. Restricting
resolution to `PUBLISHED` would make every historical bill unresolvable the
moment a revision is published — exactly the failure effective dates exist to
prevent.

`GET /fee-structures/:id/resolve?onDate=YYYY-MM-DD` answers the question
directly and returns `resolved: false` with an explanation when the date falls
outside every window, rather than substituting today's rate. The detail screen
exposes the same switch: point it at any date and the charge lines, the semester
split and the version all re-resolve to what applied then.

**Backdating is refused.** Publishing a version whose start is on or before the
day the live one began would reprice bills already issued and collected, so the
server rejects it and names the window it collides with.

Dates cross the wire as **`*Day` local `YYYY-MM-DD` strings** (`isoDay` on the
server, matching `isoDay` in the client), alongside the raw instants. This is not
cosmetic: `new Date('2026-07-01')` at local midnight in IST is 30 June 18:30 UTC,
so `toISOString().slice(0, 10)` reports a fee in force "from 1 July" as starting
30 June — and a version ending 30 November looks like it ended 29 November. The
UI renders a `*Day` string the family can read.

**Entities**

- **`fee_structure`** (shared with Admin): programId, academicYearId, tuitionMinor,
  otherMinor, totalMinor, status, effectiveFrom/To, publishedVersionId,
  defaultInstallments/Frequency/FirstDueDays. Unique on (programId,
  academicYearId). The three money columns are **denormalised roll-ups**, repaired
  on every publish and every seed run — never incremented.
- **`fee_component`**: feeStructureId, kind, label, amountMinor, semester,
  optional, firstYearOnly, sortOrder, note.
- **`fee_structure_version`**: feeStructureId, versionNo (unique per structure),
  status (DRAFT | PUBLISHED | SUPERSEDED | DRAFT_DISCARDED), effectiveFrom/To,
  componentsJson, tuitionMinor/otherMinor/totalMinor, changeNote, publishedAt,
  publishedByUserId.
- **`fee_concession`**: feeStructureId, name, kind, basis, valueBp, amountMinor,
  appliesTo, semester, enabled, note.

**API**

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/accounts/fee-structures` | filters `q`, `programId`, `academicYearId`, `status`, `sort`; returns items + stats + filter options |
| POST | `/accounts/fee-structures` | creates and publishes v1 in one transaction |
| GET | `/accounts/fee-structures/:id` | `?onDate=` re-resolves every figure to that date |
| PUT | `/accounts/fee-structures/:id/components` | replacement edit, `expectedVersionId` guard |
| GET | `/accounts/fee-structures/:id/versions` | items + a per-version diff timeline |
| POST | `/accounts/fee-structures/:id/versions` | opens a draft |
| POST | `/accounts/fee-structures/:id/versions/:versionId/publish` | supersedes, closes the outgoing window, moves the roll-ups |
| POST | `/accounts/fee-structures/:id/versions/:versionId/discard` | marks, never deletes |
| GET/POST | `/accounts/fee-structures/:id/concessions` | list / create |
| PUT/DELETE | `/accounts/fee-structures/:id/concessions/:concessionId` | update / remove |
| POST | `/accounts/fee-structures/:id/concessions/preview` | the calculator; `concessionIds`, `semester` |
| PUT | `/accounts/fee-structures/:id/installments` | default plan + the server's own schedule |
| GET | `/accounts/fee-structures/:id/resolve` | `?onDate=&semester=` → which version priced that day |
| GET/POST | `/accounts/fee-structure`, `…/:id/revision` | legacy alias, kept for the transport module and older clients |

Literal sub-resource paths are registered **before** `/fee-structures/:id`, in a
dedicated router file for exactly the reason the expenses router is: registered
first, "versions" is read as a structure id and a working screen 404s.

**Verification**

`backend/scripts/verify-fee-structure.ts` (243 assertions) exercises the pure
rules with no database at all — component roll-ups, whole-rupee proration and the
footing invariant, instalment splits across many shapes, concession caps and
scoping, `isInForceOn` on window boundaries, snapshot normalisation and diffs —
then the service against a throwaway institution: creation, duplicate refusal,
optimistic-concurrency refusal, draft → publish → backdating refusal →
discard, resolution on both sides of a version boundary, the penalty override and
its fallback, tenancy, and the audit trail.

`backend/scripts/verify-fee-structure-http.ts` (108) covers what a service call
cannot see: that no literal path is shadowed by `/:id`, that `.strict()` rejects a
misspelled money field instead of dropping it, and that no money field arrives as
a fractional rupee.

`backend/scripts/audit-fee-structure-ui.ts` (338) checks every field the seven
screens read against real responses, every `navigate()` target against
`FEATURE_MODULES`, both import paths in each six-deep sub-page, and the
client/server constant lists. It is what caught the proration rounding bug, where
the semester grid printed ₹4 more than the total directly above it.

### 3.6 Expenses (module)

The spend desk. One module answering five questions, because "expenses" is
five questions wearing one name and a flat claim list answers none of them
properly:

| View | Question | Screen |
| --- | --- | --- |
| Claims | What needs approving, and what can I raise? | hub + `expense_detail` + `expense_entry` |
| Departments | Which department is over, and what did they buy? | `department_spend` |
| Vendors | Who do we pay, how, and how concentrated is it? | `vendors` |
| Budgets | Are we within plan, and can I change the plan? | `budgets` |
| Trends | Is spend climbing, and against what pace? | `trends` |

Screens: `expenses.js` (hub), `pages/expense_entry`, `pages/expense_detail`,
`pages/budgets`, `pages/vendors`, `pages/department_spend`, `pages/trends`.

#### §3.6.1 Expense entry and categorization

Five categories, each carrying its own hint so the desk picks on purpose rather
than by guesswork: **Labs & equipment**, **Events & hosting**, **Maintenance**,
**Utilities**, **Miscellaneous**. Miscellaneous is allowed but asks for a note —
an uncategorised ₹4L invoice is what makes a trend chart useless a year later.

Amounts are **typed in rupees and stored in integer paise** (ADR-04); the
conversion happens once, at the edge, with `Math.round(x * 100)` so a thumb on
the decimal pad cannot produce 123456 paise.

Optional but visible: a claim may be raised with no receipt, and the screen says
so plainly rather than silently accepting it, because blocking entry would push
people back to a paper register. It is flagged on the list and on the claim
instead.

A claim carries title, subcategory, vendor, note, department, budget line,
payment method, payment reference, tax and date. The date is settable so a claim
raised after the fact lands in the month the money actually went out.

**Vendor names are normalised on the way in** (whitespace collapsed). "Syslab
Instruments", "Syslab  Instruments" and "syslab instruments" are one company
typed three ways by three departments; without normalisation the vendor roll-up
is a lie dressed as a report.

#### §3.6.2 Department-wise expenditure

Spend ranked by **approved** amount, with pending called out separately — a claim
awaiting approval is not spend, and folding it in would make this screen
disagree with the budgets screen, which reads the same expenses.

Each department shows its category split, its vendor count and its own budget
comparison. **A department spending against no budget line at all is promoted
above the ranking** — that is the finding, and it is what the screen is for.

#### §3.6.3 Budget allocation and utilization

Budget lines are per `(fiscalYear, category, department)`. The fiscal year runs
**April → March**, so a claim dated 15 March belongs to the previous one; getting
that wrong silently moves spend between budget years exactly when the accounts
are being closed.

Allocation is editable from the same screen it is judged on, because the moment
you find you are 40% over the lab line is the moment you want to change it.
Lowering a plan does **not** un-approve anything already counted against it — the
line simply goes over, and the screen says so.

Two things a read-only budget screen cannot show, both of which turn out to
matter more than the bars:

- **Unbudgeted spend** — approved spend sitting on no line is counted per line
  and totalled. Without it a department can spend without limit by filing claims
  under a category nobody budgeted.
- **Overspend has its own wording** — a line at 140% and one at 100% both draw a
  full bar, so "₹14.2L over" appears above the bar while the percentage beside
  it says 140%. The bar width is capped at 100 (`barPercent`); the label is exact
  (`percent`). `overspent` is the authoritative signal, never the percentage.

`POST /budgets/reconcile` recomputes every line's spent figure from the approved
claims attached to it — a repair tool, not a recalculation of the plan.

#### §3.6.4 Vendor / payment records

Roll-up per vendor: approved and pending totals, claim counts, average claim,
last payment date, category split, and **how each vendor was paid** (method mix
with counts). Vendors holding a large share of total spend are stated in words —
concentration risk is worth knowing before the next tender, not after.

Approved claims with no bank reference are flagged: those are the ones worth a
phone call. Tapping a vendor loads the actual claims behind the total, because a
₹8.4L total made of one invoice and a total made of forty are different risks.

#### §3.6.5 Approval status

`PENDING → APPROVED | REJECTED`, with `reopen` returning a rejected claim to the
queue. Approval is the only thing that moves money against a budget, so:

- **Rejection requires a reason.** The server refuses a rejection without one, so
  the claimer is never told nothing.
- **Reopening keeps the history.** Nothing is deleted; the audit trail shows the
  whole sequence.
- **A claim with no receipt is flagged in the list**, before anyone opens it,
  because that is the most common reason a claim is sent back.
- **The decision lives on the claim, not on the row.** A one-tap Approve sitting
  next to a one-tap Reject on a list row is a mis-tap away from signing off ₹4L.

#### §3.6.6 Monthly expense trends

Approved / pending / rejected per month over a 3–36 month window, with each
month's top category and the fiscal-year budget spread into a **monthly pace**.

- **Month-on-month is stated in words** ("up 12% on last month"), and is `null`
  — rendered as "no prior month to compare" — when there is no comparable prior
  month. A fabricated "+0%" reads as reassurance the data does not support.
- **The budget pace is a monthly figure**, not this month's allowance. A budget is
  annual, and comparing a month to it directly is how a department convinces
  itself it is fine at 20% spent in month one.
- **Bars scale to the largest month in the window**, not to the budget, so the
  shape of the series is honest and the budget is drawn as a reference line.
- Months with no approved spend are shown empty rather than omitted — a gap in
  the data is a fact about the institute.

#### §3.6.7 Expense receipts / document uploads

Real multipart upload to disk behind the existing `File.storageKey` abstraction,
so swapping to object storage later is a change to the upload route, not to the
service, the schema or the app.

- Accepted: **JPEG, PNG, WebP, HEIC, PDF**, up to **8 MB**, one file per request.
- The stored filename is a **random UUID plus a sanitised extension** — never the
  client's filename, which is attacker-controlled and could contain path
  separators.
- Kinds: **receipt**, **invoice**, **quotation**. `hasReceipt` is true only when
  a **RECEIPT** specifically is attached — an invoice is not a receipt.
- The same stored file cannot be attached to two claims; that is the
  duplicate-payment case an audit looks for.
- A document row carries the file's `originalName`, `mimeType`, `sizeBytes` and
  `url`, so a receipt is **openable**, not merely referenced. A receipt you cannot
  open is not a receipt.
- The `File` row is written first and rolled back if the attach fails, so a
  failed upload never leaves an orphaned row or a document pointing at nothing.
- Detaching removes the document, never the claim.

**Authorization**: upload and detach sit behind the accounts router, so an
anonymous upload never reaches the handler.

#### API

Literal paths are registered **before** `/expenses/:id` in a dedicated
`expenses.routes.ts`. Register the param route first and `budgets` is read as an
expense id and 404s a perfectly good screen — the exact bug the dues desk had to
be taught twice.

```
GET    /expenses                     list, filter, shape (+ stats over the whole set)
POST   /expenses                     raise a claim
GET    /expenses/budgets             lines + totals + off-budget spend
POST   /expenses/budgets             create or update a line
POST   /expenses/budgets/reconcile   recompute spent from approved claims
GET    /expenses/trends              monthly trend + pace + change
GET    /expenses/departments         department roll-up + unbudgeted list
GET    /expenses/vendors             vendor roll-up + concentration
POST   /expenses/:id/documents       upload a receipt / invoice / quotation
DELETE /expenses/:id/documents/:docId  detach
GET    /expenses/:id                 one claim + budget impact + history
POST   /expenses/:id/approve
POST   /expenses/:id/reject          reason required
POST   /expenses/:id/reopen
```

Filters: `status`, `category`, `departmentId`, `vendor`, `q`, `month`, `fiscalYear`,
`missingReceipt`, `take`, `skip`.

Write schemas are `.strict()` — silently dropping a misnamed money field turns a
typo (`amountRupees`) into a silently wrong claim rather than an error.

Headline totals are computed over the **whole filtered set, not the page**, so
"₹4.2L across 38 claims" is never actually "₹90K across 8 claims".

#### Money and integrity rules

- Integer paise everywhere (ADR-04); rupees only at the API and UI edge.
- `amountMinor` includes tax; `taxMinor` is carved out of it so the invoice total
  and the net are both reportable.
- `spentMinor` is **recomputed from approved claims, never incremented**.
- `approvedByName` is snapshotted so a historic claim still says who signed it.
- Every entry, decision, budget change and document change writes an audit entry.

### 3.7 Scholarships (module)

The scholarship desk is a **scheme → application → award → disbursement** pipeline, not a
list of awards. A scheme is a fund with rules; students apply to it; an application moves
through a state machine; approving it *computes an amount*; disbursing it *reduces the
student's real dues*.

#### 3.7.1 Schemes
A scheme carries the money and the terms: name, type (`MERIT` / `NEED_BASED` / `EXCELLENCE` /
`SPECIAL`), academic year, status (`DRAFT` / `OPEN` / `CLOSED`), an optional **budget ceiling**,
an optional **capacity** (max awards), an open/close window, the **amount mode**
(`PERCENT_OF_DUE` or `FIXED`), its eligibility rules, and its required documents.

`GET /scholarships/catalogue` returns everything the app needs to build a scheme form —
types, operators, documents, suggested documents per type, statuses, bands, transitions —
so the client never hard-codes a form.

> Editing a scheme does **not** silently close it. A scheme only stops accepting applications
> when it is explicitly set to `CLOSED`, and a `DRAFT` scheme refuses applications.

#### 3.7.2 Scholarship applications
`POST /scholarships/applications` records an application against an `OPEN` scheme, refusing
a closed scheme, a window that has not opened, and a window that has closed. The student
declares an annual family income and a gender alongside a free-text statement.

#### 3.7.3 Eligibility verification
Every scheme holds a **per-scheme rule set**, evaluated live against real server data on
every read, approval and preview — never cached, never a stored verdict:

| Operator | Requirement | Source |
|---|---|---|
| `MIN_PERCENT` | aggregate ≥ N% | **server** — published `Result` marks |
| `MAX_FAMILY_INCOME` | declared annual income ≤ ₹N | **declared** by the student, verified by the officer |
| `MIN_SEMESTER` | current semester ≥ N | **server** — `StudentProfile.currentSemester` |
| `MAX_SEMESTER` | current semester ≤ N | **server** — caps a scheme to, say, first- and second-years |
| `GENDER` | `FEMALE` / `MALE` / `ANY` | **declared** by the student, checked against the ID |
| `ACTIVE_STUDENT` | not dropped / alumnus | **server** — profile status |

The result is **rule-by-rule**, reporting what the rule demands, what the student actually has,
and whether it passed — so an officer sees *which* rule failed, not just "not eligible".

Two rules are **declared** rather than server-verified on purpose. The schema has no
`familyIncome` or `gender` field anywhere, so inventing one would make every need-based rule
pass vacuously against `null`. The server marks those two rules `declared: true` and the app
says plainly that a human checked them against the uploaded documents.

A student with **no published results fails `MIN_PERCENT`** rather than passing it vacuously.

#### 3.7.4 Required-document tracking
Seven document types — `Income proof`, `Marks statement`, `Category certificate`,
`Achievement certificate`, `Bank passbook`, `Student ID`, `No-dues certificate` — with a
suggested set per scheme type. Each required document is scored per application as
**missing / uploaded / verified / rejected**. Documents are uploaded through
`POST .../documents/:code/upload` (multer, 8 MB cap, JPEG/PNG/WebP/HEIC/PDF only) or recorded
by reference, then **verified or rejected** by the officer with a reason. An application
cannot be approved until every required document is verified.

#### 3.7.5 Approval workflow
```
APPLIED ──▶ UNDER_REVIEW ──▶ APPROVED ──▶ DISBURSED
   │             │              │
   └──▶ REJECTED ┘              └──▶ (terminal)
   └──▶ WITHDRAWN ◀──┘
```
`REJECTED`, `WITHDRAWN` and `DISBURSED` are **terminal** — nothing skips a state, and a
disbursed award cannot silently fall back to "approved" because the money has already moved.
Every transition is written to an application event log (actor, from, to, note) and audited.

**Approval is gated, not decorative.** `POST .../approve` refuses unless eligibility passes,
every required document is verified, the student actually owes something, and the computed
award is non-nil. The server returns the allowed action list with reasons attached
(`BLOCKED:eligibility is not yet satisfied; required documents are not all verified`), and the
screen greys out exactly those buttons — a disabled button with no explanation is the fastest
way a desk is talked into a wrong approval.

#### 3.7.6 Scholarship amount tracking
Each scheme reports **fund / promised / released / headroom / utilisation %**, where every
figure means exactly one thing:

- **committed** — granted on applications still `APPROVED` or `UNDER_REVIEW` (money promised,
  not yet moved)
- **disbursed** — money actually released
- **awarded** — `committed + disbursed`, i.e. each rupee counted once
- **headroom** — `budget − awarded`, floored at 0
- **utilisation %** — `awarded / budget`, capped at 100 for the bar

The tracking screen and the scheme list read the *same* totals helper, so the two can never
disagree about what "committed" means for one scheme.

#### 3.7.7 Disbursement status
The award amount is **computed, never typed in**:

1. the scheme's mode gives a requested amount — `FIXED`, or `PERCENT_OF_DUE × outstanding`
2. it is capped by **budget headroom** (less what is already committed and disbursed)
3. it is capped at the **outstanding balance** — a scholarship never clears more than is owed
4. every cap that bit is returned in `warnings`, so the officer sees why an award is smaller
   than requested

Disbursement **allocates against `fee_dues` oldest-first** through a `scholarship_allocations`
table, and the student's balance genuinely falls. Releasing part of an award leaves it in
`PARTIAL`; a full release marks it `DISBURSED`. `POST .../reverse` un-allocates, re-opens the
dues and returns the application to `APPROVED`.

> A disbursement is **not a payment**. The old implementation wrote a `Payment` row with the
> finance officer as `payerUserId` and category `MISC`, which booked the institution's own
> outgoing money as **income** in collections and the ledger, and never touched the student's
> dues at all — a "disbursed" scholarship left the family owing the full amount. The
> disbursement now creates **zero** `Payment` rows and reduces the real balance.

Four bands: `NOT_STARTED` / `PENDING` (approved, unpaid) / `PARTIAL` / `SETTLED`.

#### 3.7.8 Student-wise scholarship history
`GET /scholarships/students/:studentProfileId/history` gives one student across every scheme
and year: awarded, received, awaiting release, and what they **still owe**, plus each
application's allocations (which dues the money actually landed on) and its rejection reason.

**Entities:** `scholarship` (scheme), `scholarship_application`, `scholarship_application_document`,
`scholarship_application_event`, `scholarship_allocation`.
`ScholarshipAward` is **removed** — the award is now the granted amount on the application,
so there is one row per student per scheme and no second source of truth for the money.

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
GET/POST /api/accounts/payroll            (POST /run, /:id/approve|pay-all, /entries/:entryId/pay)
GET      /api/accounts/payroll/components  the salary component catalogue
GET/POST /api/accounts/payroll/salary-records (PUT /:id/components)
GET/POST /api/accounts/payroll/staff/:staffUserId/salary|attendance|loans
POST     /api/accounts/payroll/loans/:loanId/recover|cancel
GET/POST/PUT /api/accounts/payroll/entries/:entryId/payslip
GET      /api/accounts/payroll/alerts      pending-salary alerts
GET      /api/accounts/payroll/ageing     per-month balances by age band
GET/PUT /api/accounts/fee-structure       (POST /{id}/revision)
GET/POST /api/accounts/expenses           (+ /{id}/approve|reject)
GET      /api/accounts/scholarships/catalogue  types, operators, documents, transitions
GET/POST /api/accounts/scholarships
GET/PUT  /api/accounts/scholarships/:id       (+ /:id/preview/:studentProfileId)
GET/POST /api/accounts/scholarships/applications
GET      /api/accounts/scholarships/applications/:id
POST     /api/accounts/scholarships/applications/:id/review|approve|reject|withdraw
POST     /api/accounts/scholarships/applications/:id/disburse|reverse
POST     /api/accounts/scholarships/applications/:id/documents/:code
POST     /api/accounts/scholarships/applications/:id/documents/:code/upload
GET      /api/accounts/scholarships/tracking   fund / promised / released per scheme
GET      /api/accounts/scholarships/students/:studentProfileId/history
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
- `POST /api/v1/accounts/payroll/:id/approve` — F-06 approve a DRAFT run
- `POST /api/v1/accounts/payroll/:id/pay-all` — F-06 pay every PENDING entry, each with a reference
- `POST /api/v1/accounts/payroll/entries/:entryId/pay` — F-06 pay one entry
- `GET /api/v1/accounts/payroll/components` — F-06 salary component catalogue (11 codes), kinds, bases, a default set
- `GET /api/v1/accounts/payroll/salary-records?month=` — F-06 salary desk roster + stats + who has no salary on file
- `GET /api/v1/accounts/payroll/staff/:staffUserId/salary?month=` — F-06 the person, the version in force, its components, a live preview, the YTD tax breakdown and their loans
- `POST /api/v1/accounts/payroll/staff/:staffUserId/salary` — F-06 open a new versioned salary record, closing the outgoing window the day before (inclusive bounds, no overlap, no gap)
- `PUT /api/v1/accounts/payroll/salary-records/:salaryRecordId/components` — F-06 replacement component edit
- `GET /api/v1/accounts/payroll/staff/:staffUserId/attendance?month=&workingDays=` — F-06 derive the month from approved leave rows (paid vs unpaid types, 2-day grace, clamped to working days)
- `PUT /api/v1/accounts/payroll/staff/:staffUserId/attendance?month=` — F-06 record the register by hand
- `POST /api/v1/accounts/payroll/staff/:staffUserId/loans` — F-06 grant a loan or advance
- `POST /api/v1/accounts/payroll/loans/:loanId/recover` — F-06 post a month's recovery (one per `(loanId, month)`)
- `POST /api/v1/accounts/payroll/loans/:loanId/cancel` — F-06 stop future recovery, reason recorded
- `GET|POST|PUT /api/v1/accounts/payroll/entries/:entryId/payslip` — F-06 read / render-and-store the PDF / attach an uploaded one
- `GET /api/v1/accounts/payroll/alerts` — F-06 six alert kinds (`PAYROLL_UNPAID`, `PAYROLL_OVERDUE`, `RUN_STALE_DRAFT`, `NO_SALARY_RECORD`, `NO_RUN_RAISED`, `LOAN_STALLED`) with days waiting
- `GET /api/v1/accounts/payroll/ageing` — F-06 per-month balances in the four ageing bands (`NEVER`, `DUE`, `OVERDUE`, `CRITICAL`)
- `GET /api/v1/accounts/expenses` — F-07 expenses + budgets
- `POST /api/v1/accounts/expenses` — F-07 add expense
- `POST /api/v1/accounts/expenses/:id/approve` — F-07 approve (updates budget spentMinor)
- `POST /api/v1/accounts/expenses/:id/reject` — F-07 reject
- `GET /api/v1/accounts/scholarships/catalogue` — F-08 everything a scheme form needs: 4 types, 6 operators, 7 documents, suggested documents per type, 6 statuses, 4 disbursement bands, the transition map, 2 amount modes
- `GET /api/v1/accounts/scholarships?status=&type=&q=` — F-08 schemes with per-status counts, the fund figures (budget / committed / disbursed / awarded / headroom / utilisation %), capacity, window and rule count. Tenant-scoped
- `POST /api/v1/accounts/scholarships` — F-08 create a scheme (name, type, year, amount mode, budget, capacity, window, rules, required documents). Refused when the budget would be exceeded by the first award
- `GET /api/v1/accounts/scholarships/:id` — F-08 the scheme: the fund figures, its rules, its required documents and every application on it
- `PUT /api/v1/accounts/scholarships/:id` — F-08 edit a scheme. Editing the amount does **not** reset the status to `DRAFT` — only an explicit status change closes it
- `GET /api/v1/accounts/scholarships/:id/preview/:studentProfileId` — F-08 what this student would get: rule-by-rule eligibility, the outstanding balance, the computed award with its `basis`, `cappedBy` and `warnings`
- `GET /api/v1/accounts/scholarships/applications?status=&schemeId=&studentProfileId=&q=` — F-08 the desk, with `stats` by status and requested / granted / disbursed / awaiting totals
- `POST /api/v1/accounts/scholarships/applications` — F-08 record an application. Refused on a non-`OPEN` scheme, before the window opens, after it closes, or for a student who already holds a live application on the same scheme
- `GET /api/v1/accounts/scholarships/applications/:id` — F-08 one application in full: the student, the scheme, rule-by-rule eligibility, the document checklist, the amount derivation, the workflow history, the allocations, and `actions[]` (with `BLOCKED:` reasons for what the server would refuse)
- `POST /api/v1/accounts/scholarships/applications/:id/review` — F-08 move `APPLIED` → `UNDER_REVIEW`
- `POST /api/v1/accounts/scholarships/applications/:id/approve` — F-08 approve. Gated on eligibility, every required document verified, a real outstanding balance and a non-nil award; computes and stores the granted amount, caps it by budget headroom then by the balance, notifies and audits
- `POST /api/v1/accounts/scholarships/applications/:id/reject` — F-08 reject with a reason (terminal)
- `POST /api/v1/accounts/scholarships/applications/:id/withdraw` — F-08 withdraw (terminal)
- `POST /api/v1/accounts/scholarships/applications/:id/disburse` — F-08 release the award, optionally partially, allocating onto `fee_dues` **oldest-first**. Creates **no** `Payment` row; the student's balance genuinely falls
- `POST /api/v1/accounts/scholarships/applications/:id/reverse` — F-08 reverse a disbursement with a reason: un-allocates, re-opens the dues, returns the application to `APPROVED`
- `POST /api/v1/accounts/scholarships/applications/:id/documents/:code` — F-08 record a document by reference, or mark it verified / rejected with a reason
- `POST /api/v1/accounts/scholarships/applications/:id/documents/:code/upload` — F-08 upload the file itself (multer, 8 MB, JPEG/PNG/WebP/HEIC/PDF)
- `GET /api/v1/accounts/scholarships/tracking` — F-08 the fund across every scheme: budget, committed, released, awarded, headroom, utilisation %, release %, award count, and institution totals
- `GET /api/v1/accounts/scholarships/students/:studentProfileId/history` — F-08 one student's whole scholarship record: awarded / received / awaiting / still owed, plus every application with its allocations and rejection reason
- `GET /api/v1/accounts/reports` — F-09 summary by category, dues by status, expenses by category
- `GET /api/v1/accounts/notifications` — F-10 inbox
- `POST /api/v1/accounts/notifications/read-all` — F-10 mark all read
- `POST /api/v1/accounts/broadcasts` — F-10 broadcast (ALL_STUDENTS / DEFAULTERS / ALL_STAFF)
- `GET /api/v1/accounts/profile` — F-10 finance officer profile + FY stats

**App:** all 17 screens wired via `accountsApi` (`services/api.js`), demo identity `setDemoUser('accounts@learnix.dev')` in `accounts_finance.js`. Every static array removed; loading/error/retry/pull-to-refresh states throughout. Collections is a hub with three sub-pages (`CollectPayment`, `CollectionDetail`, `StudentStatement`) registered in `FEATURE_MODULES`, with `routeParams` plumbing added to `accounts_finance.js` so sub-pages know which record they are showing. Dues is a hub with a `DueDetail` sub-page (bill + student + allocations + reminders, server-gated Collect / Remind / Waive / Reinstate, and an action sheet for every mutating call); `collect_payment` accepts `dueId` so a due can be paid directly, switching to manual mode pre-pointed at that due instead of silently paying oldest-first; payroll is a hub with nine screens registered in `FEATURE_MODULES` (`PayrollRunDetail`, `Payslip`, `PayrollSalaryRecords`, `PayrollSalaryRecord`, `PayrollComponents`, `PayrollAttendance`, `PayrollLoans`, `PayrollAlerts`, `PayslipDocument`), the hub carrying **Salary records** and **Pending salaries** desk buttons, and `runPayroll` pricing each person from the salary version in force that month with attendance LOP, YTD TDS and loan recovery rather than a hard-coded 50/40/12 formula; expenses has approve/reject; scholarships is a hub with seven screens registered in `FEATURE_MODULES` (`ScholarshipApplications`, `ScholarshipApplication`, `ScholarshipDetail`, `ScholarshipDocuments`, `ScholarshipTracking`, `ScholarshipStudentHistory`, `ScholarshipApply`) over live APIs, the hardcoded `scholarshipsData.js` fixture deleted, every server action gated behind `actions[]`, and a disbursement that credits real `fee_dues` rather than booking a payment; reports shows live aggregates; notifications has inbox + broadcast (3 audiences); profile shows live officer data.