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
Due list (student, rollNo, program, semester, due amount, days overdue with severity), reminders. Actions: **Send Reminder** (SMS/email/push), **Waive Fee** (with reason + admin audit), mark collected (links to Collections).

**Entity `fee_due`**: id, studentId, amount, daysOverdue, status (Unpaid/Partial/Cleared/Waived).

### 3.4 Payroll
Teacher/staff payroll list (name, role, month, salary, deductions, net, status Paid/Pending). Actions: **Run Payroll** (bulk pay), **Mark Paid**, view payslip.

**Entity `payroll_entry`**: id, staffId, month, gross, deductions, net, status, paidAt.

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
- `GET /api/v1/accounts/dues` — F-04 fee dues, tenant-scoped, with `paidRupees`/`balanceRupees` and stats counting **balances** (not billed amounts), plus `partialCount` and `overdueRupees`
- `POST /api/v1/accounts/dues/:id/remind` — F-04 send reminder notification
- `POST /api/v1/accounts/dues/:id/waive` — F-04 waive fee (audited)
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

**App:** all 10 screens wired via `accountsApi` (`services/api.js`), demo identity `setDemoUser('accounts@learnix.dev')` in `accounts_finance.js`. Every static array removed; loading/error/retry/pull-to-refresh states throughout. Collections is a hub with three sub-pages (`CollectPayment`, `CollectionDetail`, `StudentStatement`) registered in `FEATURE_MODULES`, with `routeParams` plumbing added to `accounts_finance.js` so sub-pages know which record they are showing; dues has remind + waive; payroll has run + mark paid; expenses has approve/reject; scholarships has disburse; reports shows live aggregates; notifications has inbox + broadcast (3 audiences); profile shows live officer data.