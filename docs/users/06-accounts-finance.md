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