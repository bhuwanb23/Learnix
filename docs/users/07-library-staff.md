# 07 — Library Staff App (`role: library`)

> Entry: `users/library_staff/library_staff.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
Library staff manage the full library lifecycle: catalog, circulation (issue/return), fines & overdues, book requests, and the digital library. Admin's Library module is the institution-level view.

## 2. App Shell
- **Bottom nav**: Dashboard · Catalog · Circulation · Fines · Profile.
- **Feature modules**: Requests, DigitalLibrary, Notifications.

## 3. Modules & Data Entities

### 3.1 Dashboard
Every figure is derived live, because most library numbers are a function of the current date rather than stored state. Two definitions the endpoint gets right, and had to be fixed to get right:

- **On loan** is `returnDate: null`, *not* `status: 'ISSUED'`. `syncOverdueStatus()` promotes every past-due loan to OVERDUE before the counters run, so an ISSUED-only count reports "1 issued" on a library with 11 books out.
- **Circulation rate** is `(total copies − copies on the shelf) / total copies`. It was previously derived from the low-stock list, which reported **100% utilisation on a 22% library**. The screen also used to fall back to an invented `95%` when the field was missing; it now shows the real number or nothing.

Sections: hero (titles, copies on shelf, on loan, members, circulation rate), **today's desk** (due today, overdue, issues today, returns today), live counters that each open the screen that owns them, actionable alerts with a `HIGH`/`MEDIUM`/`LOW` severity, returns to chase (deep-linking into the loan detail, labelled with days late), shelf pressure, most-borrowed titles, and a 9-tile tool launcher.

Two honesty details: `pendingRequests` is tenant-scoped (a bare `status: 'PENDING'` counted other institutions'), and "all copies on loan" is reported differently from "out of stock" — a title with 0 free copies is usually one everyone is reading, not a procurement failure.

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

### 3.5 Book Requests + Procurement (module)
Student requests for titles the library may not stock, as a **procurement decision** rather than a status flag.

**Deciding.** `decideRequest` **requires a note** (min 5 chars) on both approve and decline — the student reads it in their notification, so a bare click is refused. The decision is stamped with `decidedByUserId` + `decidedAt`. Approving raises a `BookProcurement`; declining does not.

**Demand is visible.** The list reports, per request, how many students asked for the same title and whether the library already stocks it — "12 students want *Clean Code* and we own 5 copies" is a different decision from one obscure title. A "Most requested" card aggregates the top titles. The detail screen adds the requesting student's standing (books held, overdue, fines due) and every catalog title matching the request, with free/total copies.

**Procurement pipeline.** Approving is not the end of the line. A purchase moves `REQUESTED → ORDERED → RECEIVED` (or `CANCELLED`), and only forward — jumping a stage is refused:
- **ORDERED** records the cost (integer paise) and copies ordered.
- **RECEIVED** *creates the catalog `Book`* with the copies that actually arrived plus category and rack location, links it via `bookId`, marks the originating request `PROCURED` (a state previously unreachable), and notifies the student. If `announceNewArrivals` is on in Settings, it also broadcasts to all students.
- **CANCELLED** declines the linked request with the recorded reason, so an approved request never sits forever with no purchase behind it.

**Entity `book_request`**: studentProfileId, title, author, reason, status, decidedByUserId, decidedAt, decisionNote, procurementId. **Entity `book_procurement`**: requestId, title, author, copies, costMinor, status, category, rackLocation, orderedAt, receivedAt, bookId, note. The two link **both ways** — a one-way link left the procurement desk unable to show who asked.

**Entity `book_request`**: id, studentId, book, reason, status (Pending/Approved/Rejected/Procured).

### 3.6 Digital Library (module)
E-resources catalog (title, type PDF/E-book/Journal, subject, publisher, license, external link, access count). Actions: **Add Resource**, **Edit**, **Grant Access** (per program *or* batch), **Revoke**, **Archive**, usage stats.

**Entity `digital_resource`**: id, title, type, subject, publisher, license, externalUrl, description, status (ACTIVE | ARCHIVED), accesses. `digital_resource_accesses` is the per-open log; `accessCount` is the denormalized sum, re-aggregated inside `recordAccess()` so the two cannot drift.

> A resource with **no grants is open access** (every student may read it). Grants narrow that to specific programs or batches. `deleteDigitalResource` archives rather than deletes so access history survives.

### 3.7 Notifications
Library staff are **not** notification recipients — nobody sends them an inbox — so this module is an **outbound desk**, not a mailbox. It is built entirely from the circulation domain tables rather than the `notifications` table.

**Activity Feed** — issues, returns, renewals, fines, book requests and digital opens merged newest-first with per-kind counts and deep links into the loan / fine / resource sub-pages. Overdue status is synced before the feed is built, so a loan that crossed its due date reads as overdue the moment the screen opens.

**Broadcasts** — compose to a live-resolved audience (All Students / Borrowers / Overdue Members), with recipient counts shown *before* sending, four starter templates (holiday hours, extended hours, new arrivals, fine reminder), and a subject/message character budget. History lists every broadcast this module sent plus foreign broadcasts from other modules, and each row opens to the full message, sender, and recipient list. A broadcast with an audience the library does not own (e.g. another module's `{"role":"STUDENT"}`) degrades to an `UNKNOWN` audience with `currentAudienceSize: -1` instead of failing the whole list.

**Audiences** — per-audience recipient counts with coverage percentage against the student body, resolved live from circulation data.

**Reminder Schedule** — the four due-date stages the reminder worker would use: `DUE_3_DAYS`, `DUE_1_DAY`, `DUE_TODAY`, `OVERDUE_FINAL` (+7 days). Each stage shows how many open loans match it *right now*, plus the total reachable. `automationEnabled` is returned as an explicit `false` and the UI says so plainly, pointing the librarian at Compose Broadcast instead of pretending a nightly job exists.

**Entity `broadcast`**: id, senderUserId (bare scalar, name resolved manually), audienceJson, title, body, channels, sentAt. Delivery writes one `notification` row per resolved recipient.

### 3.8 Profile, Settings & Staff (module)
The librarian's real staff record (name, employee no, designation, joining date, last sign-in, institution) plus library-wide counters read live from circulation: titles, copies on shelf vs issued, active/overdue loans, pending fines, book requests, and issues/returns today. A "contribution" line reports this librarian's own loans issued and broadcasts sent.

**Circulation policy is data, not code.** The borrowing rules used to be hardcoded constants. They now live in `library_settings`, one row per institution, created on first read with the old values as defaults — and `circulation.service.ts` / `fines.service.ts` **read** them on every issue, renew and return. Editing a rule in Settings genuinely moves the limit.

| Setting | Default | Effect |
| --- | --- | --- |
| `loanPeriodDays` | 14 | Default loan length when the desk issues without picking one |
| `maxActiveLoans` | 4 | Books a student may hold; issuing stops at this count |
| `maxRenewalsPerLoan` | 2 | Renewals before a loan is final |
| `finePerDayPaise` | 500 | ₹5/day charged on an overdue return (integer paise, ADR-04) |
| `maxOutstandingFinePaise` | 20000 | ₹200 — unpaid fines above this block new issues |
| `dueRemindersEnabled` | true | Whether the reminder schedule counts due/overdue students |
| `autoFineEnabled` | true | Whether returning a late book creates a `Fine` row automatically |
| `announceNewArrivals` | false | Whether adding a book broadcasts to `ALL_STUDENTS` |
| `openTime` / `closeTime` / `closedDays` | 08:00 / 19:00 / SUNDAY | Library timings, surfaced in Help and on the profile |

Money crosses the wire as rupees for editing and is stored as paise; the route converts. `autoFineEnabled` off means the return still records lateness but no fine is raised — the librarian raises it. `dueRemindersEnabled` off zeroes the reminder stages and the endpoint's `note` says why rather than reporting coverage for a policy that is switched off.

**Sub-pages**: *Library Settings* (rules with steppers, timings, closed-day chips, automation switches, save/discard bar), *Library Staff* (every account holding the LIBRARY role, with per-person loans-issued and broadcasts-sent counts plus a detail view of their recent desk activity), *Access & Permissions* (read-only, from `role_permissions` ⋈ `permission_groups`, with ungranted categories named), *Change Password* (real `POST /auth/change-password` with a strength meter), *Help & Support* (FAQ whose answers quote the **live** policy, plus task shortcuts).

**Entity `library_settings`**: institutionId (unique), the five circulation columns, three boolean policies, three timing columns, updatedAt/updatedByUserId. Settings edits are audited via `writeAudit`.

## 4. Backend API Surface
```
GET  /api/library/dashboard
GET/POST /api/library/catalog             (+ /{id}, add/edit)
POST /api/library/circulation/issue       { studentId, bookId }
POST /api/library/circulation/return      { issueId }
GET  /api/library/fines                   (POST /{id}/collect, /{id}/extend, /{id}/waive)
GET  /api/library/requests                ?q= &status= &sort=
GET  /api/library/requests/{id}
POST /api/library/requests/{id}/decide    { decision, note }   ← note required
GET  /api/library/procurements            ?status=
GET  /api/library/procurements/{id}
POST /api/library/procurements/{id}/advance  { status, costRupees?, copies?, category?, rackLocation?, note? }
GET/POST /api/library/digital             (+ /{id}, grant access)
GET  /api/library/notifications/activity  ?limit=
GET  /api/library/notifications/insights
GET  /api/library/notifications/reminders
GET  /api/library/broadcasts              POST /api/library/broadcasts
GET  /api/library/broadcasts/audiences    (registered before /:id)
GET  /api/library/broadcasts/{id}
GET  /api/library/profile
GET/PUT /api/library/settings            (rupees in, paise stored)
GET  /api/library/staff                  GET /api/library/staff/{id}
GET  /api/library/permissions
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
- `GET /api/v1/library/requests` — book purchase requests (q/status/sort)
- `GET /api/v1/library/requests/:id` — request detail: student standing, catalog matches, same-title demand, linked purchase
- `POST /api/v1/library/requests/:id/decide` — approve/decline; `note` is required
- `GET /api/v1/library/procurements` — purchase pipeline with spend totals
- `GET /api/v1/library/procurements/:id` — purchase detail
- `POST /api/v1/library/procurements/:id/advance` — ORDERED / RECEIVED (creates the catalog book) / CANCELLED
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

**App:** every screen is wired to a real endpoint via `libraryApi` (`services/api.js`), with demo identity `setDemoUser('library@learnix.dev')` in `library_staff.js`. No static arrays remain and no action is a stub. Circulation issues, renews and returns with live policy limits; fines collects, waives, extends and bulk-settles; digital library does CRUD, grants, revocation and usage; notifications runs an activity feed, broadcast compose/history, audience insights and a reminder schedule; profile reads real stats, edits the live circulation policy, and lists the staff directory and RBAC permissions; book requests decide with a mandatory reason and walk purchases through to the catalog.