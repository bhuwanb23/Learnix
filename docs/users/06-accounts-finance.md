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