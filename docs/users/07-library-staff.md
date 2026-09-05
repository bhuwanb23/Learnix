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
Overdue list with days overdue + fine amount. Actions: **Collect Fine** (marks paid, receipt → Accounts), **Extend Due Date** (renewal), **Waive Fine** (reason).

**Entity `fine`**: id, issueId, amount, status (Pending/Paid/Waived).

### 3.5 Requests (module)
Book purchase requests from students (student, book, reason, status). Actions: **Approve** (creates procurement), **Reject**, notify requester.

**Entity `book_request`**: id, studentId, book, reason, status (Pending/Approved/Rejected/Procured).

### 3.6 Digital Library (module)
E-resources catalog (title, type PDF/E-book/Journal, subject, license, access count). Actions: **Add Resource**, **Grant Access** (per program), usage stats.

**Entity `digital_resource`**: id, title, type, subject, license, accesses.

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