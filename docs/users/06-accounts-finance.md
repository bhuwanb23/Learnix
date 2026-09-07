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

### 3.2 Collections
Collection list (student, program, amount, date, method UPI/Net Banking/Card/Cash, status Cleared/Partial), payment gateway handoff. Actions: **Record Collection** (clears due → receipt), **Partial**, view receipts.

**Entity `collection`**
| Field | Type |
|-------|------|
| id | C1 |
| studentId, program | FK |
| amount | number |
| date, method | string |
| status | Cleared / Partial |

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
- `GET /api/v1/accounts/collections` — F-02 payment list with student/receipt info
- `POST /api/v1/accounts/collections` — F-02 record payment (any category, receipt auto-generated)
- `GET /api/v1/accounts/ledger` — F-05 unified ledger (all payments by category)
- `GET /api/v1/accounts/fee-structure` — F-03 fee structures per program
- `POST /api/v1/accounts/fee-structure/:id/revision` — F-03 request revision
- `GET /api/v1/accounts/dues` — F-04 fee dues with student info and overdue days
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

**App:** all 10 screens wired via `accountsApi` (`services/api.js`), demo identity `setDemoUser('accounts@learnix.dev')` in `accounts_finance.js`. Every static array removed; loading/error/retry/pull-to-refresh states throughout. Collections has record payment (category + method picker); dues has remind + waive; payroll has run + mark paid; expenses has approve/reject; scholarships has disburse; reports shows live aggregates; notifications has inbox + broadcast (3 audiences); profile shows live officer data.