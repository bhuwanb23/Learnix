# Learnix ERP — User Roles Documentation

> **Purpose:** These docs describe every user role in the Learnix ERP portal — the modules, screens, data entities, actions, and cross-app relationships — so the **backend can be built directly from them**. Each doc is written as a contract: what data exists, what changes it, and how apps talk to each other.

---

## Role Index

| # | Role | Login ID | App Entry | Doc |
|---|------|----------|-----------|-----|
| 1 | Student | `student` | `users/students/students.js` | [01-students.md](01-students.md) |
| 2 | Teacher | `teacher` | `users/teachers/teacher.js` | [02-teachers.md](02-teachers.md) |
| 3 | Admin (Super User) | `admin` | `users/admin/admin.js` | [03-admin.md](03-admin.md) |
| 4 | Placement Cell | `placement` | `users/placement_cell/placement_cell.js` | [04-placement-cell.md](04-placement-cell.md) |
| 5 | Exam Cell | `examcell` | `users/exam_cell/exam_cell.js` | [05-exam-cell.md](05-exam-cell.md) |
| 6 | Accounts & Finance | `accounts` | `users/accounts_finance/accounts_finance.js` | [06-accounts-finance.md](06-accounts-finance.md) |
| 7 | Library Staff | `library` | `users/library_staff/library_staff.js` | [07-library-staff.md](07-library-staff.md) |
| 8 | Hostel | `hostel` | `users/hostel/hostel.js` | [08-hostel.md](08-hostel.md) |
| 9 | Transport | `transport` | `users/transport/transport.js` | [09-transport.md](09-transport.md) |
| 10 | Sports & Cultural | `sports` | `users/sports/sports.js` | [10-sports-cultural.md](10-sports-cultural.md) |
| 11 | HOD / Department Coordinator | `hod` | `users/hod/hod.js` | [11-hod.md](11-hod.md) |
| 12 | Alumni Relations | `alumni` | `users/alumni/alumni.js` | [12-alumni-relations.md](12-alumni-relations.md) |

---

## 1. Application Architecture

### 1.1 Tech stack (frontend)
- **React Native (Expo)** mobile app, single codebase at `learnix/`.
- Entry: `App.js` → `navigation/AppNavigator.js` (state-based router, no react-navigation).
- Login: `pages/login/login.js` + `LoginCard` role picker → navigates to the role's screen.
- Shared theme: `constants/theme.js` (exports `COLORS`, `SPACING`, `TYPOGRAPHY`, plus a convenience `theme` object).
- All data today is **static mock data** (const arrays in `constants/` folders or inline in page files). The backend must replace these with API responses.
- Fonts loaded: `Manrope-Regular/Medium/SemiBold/Bold/ExtraBold`, `PlusJakartaSans-Bold/SemiBold/ExtraBold`.

### 1.2 Two app shell patterns
1. **Tab-router pattern** (Teacher, Admin, and all staff apps): a bottom nav with 4–5 tabs + a `FEATURE_MODULES` registry opened from the dashboard hub. Navigation object exposes `navigate`, `goBack`, `openModule`, `switchTab`.
2. **Full-screen pattern** (Student): tabs + top-level full-screen flows (`Notifications`, `BrowseJobs`, `JobDetails`, `JobApply`, `JobApplyDone`) tracked in `currentScreen` state, and profile sub-views tracked in `profileView`.

### 1.3 Navigation object contract
Every screen receives a `navigation` prop with a subset of:
- `navigate(screen, params)` — open a screen/flow
- `goBack()` — return to previous screen
- `openModule(key)` — open a feature module from the registry
- `switchTab(tabId)` — switch bottom-nav tab

### 1.4 Login flow contract
`LoginCard` lists roles → `login.js` maps `credentials.role` → `AppNavigator` screen. Backend must issue a role-scoped session (JWT) and the app routes by `role`.

---

## 2. Shared / Master Data (single source of truth)

These entities are **owned by Admin** (or the institution) and consumed by every other app. They are the backbone tables of the backend.

| Entity | Source (frontend) | Key fields | Consumed by |
|--------|-------------------|------------|-------------|
| `departments` | `admin/.../coursesData.js` | id, name, code, programs, students, hod | Admin, HOD, Teacher |
| `programs` | `admin/.../coursesData.js` | id, name, department, duration, semesters, type (UG/PG) | Admin, HOD, Student |
| `courses` | `admin/.../coursesData.js` | id, name, code (CS301), department, program, semester, credits, teacher | Admin, HOD, Teacher, Student |
| `syllabus_templates` | `admin/.../coursesData.js` | id, name, program, semester, units, status (Approved/Draft) | Admin, HOD, Teacher |
| `students` | `admin/.../studentsData.js` | id, name, rollNo, department, program, semester, batch, email, phone, attendance, cgpa, status | All apps |
| `teachers` | `admin/.../teachersData.js` | id, name, department, designation, email, phone, subjects, classes, workload, maxWorkload, status | Admin, HOD, Teacher |
| `leave_requests` | `admin/.../teachersData.js` | id, teacherName, type, from, to, days, reason, status | Admin, HOD |
| `batches` | `admin/.../studentsData.js` | id, name, students, year | Admin, HOD, Alumni |
| `fee_structure` | `admin/.../feesData.js` | program, tuition, other, total | Admin, Accounts, Student |
| `companies` | `admin/.../placementsData.js` | id, name, sector, jobs, hires | Admin, Placement, Student |
| `books` | `admin/.../libraryData.js` | id, title, author, category, copies, available | Admin, Library |
| `events` | `admin/.../eventsData.js` | id, name, category, date, venue, registrations, capacity, status | Admin, Student, Sports, Alumni |
| `roles` | `admin/.../settingsData.js` | id, name, users, permissions | Admin (RBAC) |
| `academic_year` | `admin/.../settingsData.js` | current, startDate, endDate, semesters, examWeeks | Global |

---

## 3. Cross-App Data Relationships (backend joins)

```
departments 1—* programs 1—* courses 1—* syllabus_templates
teachers 1—* classes (sections) 1—* students (enrollment)
courses *—* teachers (subject assignment, workload)
students 1—* fee_dues/collections (Accounts)
students 1—* placements_applications (Placement)
students 1—* library_issues (Library)
students 1—* hostel_allocations (Hostel)
students 1—* exam_results/hall_tickets (Exam Cell)
teachers 1—* leave_requests (Admin/HOD)
teachers 1—* syllabus approvals (HOD → Admin)
companies 1—* placement_drives 1—* jobs 1—* applications (Placement → Student)
events 1—* registrations (Admin/Sports/Alumni → Student)
alumni 1—* donations (Alumni → Accounts)
alumni 1—* mentorship pairs (Alumni → Student)
vehicles 1—* routes 1—* students (Transport)
```

---

## 4. Shared Action Semantics (state machines)

Many modules share approval/review flows. Standardize these in the backend:

| Flow | States |
|------|--------|
| Syllabus approval | Draft → Submitted → **HOD Approved / Changes Requested** → Admin Approved |
| Leave request | Pending → **Approved / Rejected** |
| Placement application | Applied → Shortlisted → Interview → **Offered / Rejected** |
| Event RSVP | Pending → **Confirmed / Declined** |
| Donation | Pledged → **Received** (receipt → Accounts) |
| Library issue | Issued → **Returned / Overdue** (fine) |
| Gate pass | Pending → **Approved / Rejected** |
| Complaint (hostel) | Open → Assigned → **Resolved** |
| Mentorship request | Pending → **Approved / Declined** |
| Maintenance (transport) | Scheduled → In Progress → **Completed** |
| Transport fee | Unpaid → **Collected / Partial** |
| Broadcast | Draft → **Sent** (push + email) |

---

## 5. Notifications Model (all apps)

Every staff app has a Notifications module with two tabs:
- **Inbox**: type-tagged items (`type`, `title`, `time`, `unread`, color, icon), `mark all read`, per-item read toggle.
- **Broadcast**: audience chips + message templates → push/email delivery to student app.

Backend needs a `notifications` table (recipient_role, audience filter, title, body, type, read flag, created_at) and a `broadcasts` table (audience selector, template, sent_at).

---

## 6. Backend Blueprint (suggested API shape)

```
POST   /api/auth/login                     { role, email, password } → { token, role }
GET    /api/{role}/dashboard               → role-specific stats + activity

# Master data
GET    /api/master/departments | programs | courses | batches | academic-year

# Per-role CRUD + actions (one resource per entity in the per-role docs)
GET/POST/PUT/DELETE /api/students | teachers | courses | ...
POST   /api/{entity}/{id}/{action}         e.g. POST /api/syllabus/5/approve

# Cross-app write-through
POST   /api/donations/{id}/record          → also creates Accounts collection + receipt
POST   /api/broadcasts                     → fan-out to student notifications
```

Each per-role doc below lists its **exact entities, fields, actions and endpoint surface**.