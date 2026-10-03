# 07 — Library Staff App (`role: library`)

> Entry: `users/library_staff/library_staff.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
Library staff manage the full library lifecycle: catalog, circulation (issue/return), fines & overdues, book requests, and the digital library. Admin's Library module is the institution-level view.

## 2. App Shell
- **Bottom nav**: Dashboard · Catalog · Circulation · Fines · Profile.
- **Feature modules**: Requests, DigitalLibrary, Notifications.

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (library utilization), stats (total books, issued, overdue, fines pending), today's due returns, popular titles, alerts (overdue escalation, low copies), quick-tool launcher, activity feed.

### 3.2 Catalog
Book search + category filters, book list (title, author, category, copies, available with availability bar). Actions: **Add Book**, **Edit**, mark copies.

**Entity `book`**
| Field | Type |
|-------|------|
| id | B1 |
| title, author, category | string |
| copies, available | number |
| location (rack) | string |

### 3.3 Circulation
Issue/return desk: issued books (student, book, due date, status Issued/Overdue). Actions: **Issue Book** (student + book → creates issue), **Receive Return** (clears issue, computes fine if overdue → forwards to Accounts).

**Entity `book_issue`**: id, studentId, bookId, issueDate, dueDate, returnDate?, status (Issued/Returned/Overdue), fineAmount.

### 3.4 Fines & Overdues
Overdue list with days overdue + fine amount, searchable by student / roll number / book and sortable by amount or days. Actions: **Collect Fine** (marks paid, receipt → Accounts), **Extend Due Date** (renewal), **Waive Fine** (reason required), plus **bulk settle** for every fine a student owes.

Fine rate is **₹5/day**, charged at return. The rate breakdown (days × rate) is shown on the fine detail so the amount is auditable on screen.

> **Waiver reasons are mandatory.** A waiver is an audited accounting decision, so the librarian must enter a real reason — it is stored on the record and surfaced in the audit log. Presets are suggestions, not a substitute.
>
> **Extend Due Date** applies to a book that is still out. It moves the due date, clears the overdue flag, and writes off the pending fine — the fine is only raised at return, so an extended loan that comes back on time is charged nothing.
>
> **Receipt numbering is FINE-scoped.** Collections are numbered `PAY-FINE-<year>-<seq>` / `RCP-FINE-<year>-<seq>` from the count of FINE payments only, so they can never collide with the tuition (`PAY-TUI-*`) or transport (`PAY-TF-*`) sequences. Bulk settlement issues one payment **and** one receipt per fine — `Payment ↔ Receipt` is strictly 1:1.

**Entity `fine`**: id, issueId, amount, status (Pending/Paid/Waived).

### 3.5 Requests (module)
Book purchase requests from students (student, book, reason, status). Actions: **Approve** (creates procurement), **Reject**, notify requester.

**Entity `book_request`**: id, studentId, book, reason, status (Pending/Approved/Rejected/Procured).

### 3.6 Digital Library (module)
E-resources catalog (title, type PDF/E-book/Journal, subject, publisher, license, external link, access count). Actions: **Add Resource**, **Edit**, **Grant Access** (per program *or* batch), **Revoke**, **Archive**, usage stats.

**Entity `digital_resource`**: id, title, type, subject, publisher, license, externalUrl, description, status (ACTIVE | ARCHIVED), accesses. `digital_resource_accesses` is the per-open log; `accessCount` is the denormalized sum, re-aggregated inside `recordAccess()` so the two cannot drift.

> A resource with **no grants is open access** (every student may read it). Grants narrow that to specific programs or batches. `deleteDigitalResource` archives rather than deletes so access history survives.

### 3.7 Notifications
Inbox (due/overdue/request/resource types) + Broadcast tab (audience: All Students / Borrowers / Overdue Members → due-date reminders, new arrivals, extended hours).

### 3.8 Profile
Librarian profile, library stats, preference toggles, account menu.

## 4. Backend API Surface
```
GET  /api/library/dashboard
GET/POST /api/library/catalog             (+ /{id}, add/edit)
POST /api/library/circulation/issue       { studentId, bookId }
POST /api/library/circulation/return      { issueId }
GET  /api/library/fines                   (POST /{id}/collect, /{id}/extend, /{id}/waive)
GET/POST /api/library/requests            (+ /{id}/approve|reject)
GET/POST /api/library/digital             (+ /{id}, grant access)
GET  /api/library/notifications
POST /api/library/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Student**: issue/return status, due-date notifications, fine status.
- Writes → **Accounts**: fine collections, procurement requests.
- Reads ← **Admin**: student master, library stats (institution view).
- Books/requests shared with Admin's Library module.

## 6. Wiring Status — LIVE (backend + app wired end to end)

Backend implemented in `backend/src/modules/library/` (routes + service + zod schemas) and mounted
at `/api/v1/library` (role gate: `LIBRARY` or `ADMIN`).

**Endpoints live:**
- `GET /api/v1/library/dashboard` — L-01 hero stats, due returns, popular books, alerts
- `GET /api/v1/library/catalog` — L-02 book list with search/category filter
- `GET /api/v1/library/catalog/:id` — book detail with recent issues
- `POST /api/v1/library/catalog` — add book (title, author, isbn, category, copies, rack)
- `PUT /api/v1/library/catalog/:id` — update book
- `POST /api/v1/library/circulation/issue` — issue book (rollNo, bookId, dueDays)
- `POST /api/v1/library/circulation/return` — return book (creates fine if overdue)
- `GET /api/v1/library/circulation/loans` — active loans with search + status filter (`ACTIVE|ISSUED|OVERDUE|DUE_SOON|DUE_TODAY`)
- `GET /api/v1/library/circulation/loans/:id` — loan detail, timeline, projected fine, renew eligibility
- `POST /api/v1/library/circulation/loans/:id/renew` — renew a loan (max 2, blocked when overdue)
- `GET /api/v1/library/circulation/history` — returned-loan archive with on-time/late and fine totals
- `GET /api/v1/library/circulation/students` — student lookup for the issue desk
- `GET /api/v1/library/circulation/students/:id` — borrowing profile and eligibility blockers

> **Derived overdue status.** `book_issues.status` is promoted `ISSUED → OVERDUE` by
> `syncOverdueStatus()` before every status-filtered read. Without it, overdue counts
> and the `OVERDUE_MEMBERS` broadcast audience would always read zero.
>
> **Borrowing rules** (`circulation.service.ts`): max 4 active loans per student,
> max 2 renewals per loan, issuing blocked when the student is inactive, over the
> loan limit, holds an overdue book, or owes more than ₹200 in unpaid fines.
- `GET /api/v1/library/fines` — fines with search + `status` filter and `sort`, plus debtor aggregation
- `GET /api/v1/library/fines/:id` — fine detail with rate breakdown, student totals and sibling fines
- `GET /api/v1/library/fines/students/:id` — all fines for one student (pending + settled)
- `POST /api/v1/library/fines/:id/collect` — collect fine (write-through: Payment + Receipt + FinePayment)
- `POST /api/v1/library/fines/:id/waive` — waive fine (reason required, audited)
- `POST /api/v1/library/fines/:id/extend` — extend due date on an outstanding overdue loan
- `POST /api/v1/library/fines/settle` — bulk collect or waive every pending fine for a student
- `GET /api/v1/library/requests` — book purchase requests
- `POST /api/v1/library/requests/:id/decide` — approve/reject (creates procurement on approve)
- `GET /api/v1/library/digital` — digital resources with search + `type` / `status` / `audience` filters and `sort`
- `GET /api/v1/library/digital/:id` — resource detail with resolved audiences and usage stats
- `POST /api/v1/library/digital` — add digital resource
- `PUT /api/v1/library/digital/:id` — update resource (including archive/restore)
- `DELETE /api/v1/library/digital/:id` — archive a resource (history preserved)
- `POST /api/v1/library/digital/:id/grant-access` — grant to a program **or** batch
- `DELETE /api/v1/library/digital/:id/grants/:grantId` — revoke a grant
- `GET /api/v1/library/digital/audiences` — programs and batches for the grant picker
- `POST /api/v1/library/digital/:id/access` — record an access (increments `accessCount`)
- `GET /api/v1/library/digital/usage` — usage rollup by type, subject and top resources
- `POST /api/v1/library/digital/:id/grant-access` — grant access to program/batch
- `GET /api/v1/library/notifications` — inbox
- `POST /api/v1/library/notifications/read-all` — mark all read
- `POST /api/v1/library/broadcasts` — broadcast (ALL_STUDENTS / BORROWERS / OVERDUE_MEMBERS)
- `GET /api/v1/library/profile` — librarian profile + library stats

**App:** all 8 screens wired via `libraryApi` (`services/api.js`), demo identity `setDemoUser('library@learnix.dev')` in `library_staff.js`. Every static array removed; loading/error/retry/pull-to-refresh states throughout. Fines module has collect (CASH method) and waive actions; circulation has issue (rollNo + book picker) and return (auto-fine on overdue); requests has approve/reject; digital library shows resources from API; notifications has inbox + broadcast (3 audience types); profile shows live librarian data.