# 04 — Placement Cell App (`role: placement`)

> Entry: `users/placement_cell/placement_cell.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
The placement cell runs campus hiring end-to-end: creates placement drives & jobs, manages companies, reviews student applications, tracks offers. Admin watches placement operations; the student app consumes jobs/drives and submits applications.

## 2. App Shell
- **Bottom nav**: Dashboard · Drives · Applications · Students · Profile.
- **Feature modules**: Jobs, Companies, Notifications.
- **Sub-pages**: drive_detail, drive applications review.

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (placement season progress), stats (drives/companies/applications/offers), upcoming drives with application progress, pending actions (drive approvals from admin, application shortlists), alerts, quick-tool launcher, recent activity.

### 3.2 Drives
Drive list (company, role, package LPA, date, mode On-campus/Virtual, eligible/applications counts, status chip) → **drive detail**: eligibility, process stages (Apply → Test → Interview → Offer), applications with status, actions (Approve → forwards to admin, Edit).

**Entity `placement_drive`**
| Field | Type |
|-------|------|
| id | D1 |
| company, role | string |
| package | string (₹7.5 LPA) |
| date, mode | string |
| eligible, applications | number |
| status | Scheduled / Approved / Pending |

### 3.3 Applications
Application list per drive with status pipeline (Applied → Shortlisted → Interview → Offered / Rejected), actions: **Shortlist**, **Reject**, **Mark Offered** (updates offer count, notifies student).

**Entity `application`**: id, student, driveId, company, role, appliedAt, status.

### 3.4 Students (placement-eligible pool)
Student list with eligibility (CGPA, backlog, batch), resume completeness, registration status for drives. Actions: view profile, add to drive shortlist.

### 3.5 Jobs (module)
Job posting list beyond drives (company, role, package, location, openings, deadline) → create/edit job, **Close Job**. These appear as "Recommended Jobs" in the student app.

**Entity `job`**: id, company, role, package, location, openings, deadline, status (Open/Closed).

### 3.6 Companies (module)
Company directory (name, sector, jobs posted, hires, rating) → add company, view drives per company, contact HR.

**Entity `company`**: id, name, sector, jobs, hires.

### 3.7 Notifications
Inbox (application/drive/offer types) + Broadcast tab (audience: All Students / Final Year / CSE / Eligible for TCS → drive announcements, test schedules, offer letters).

### 3.8 Profile
Placement officer profile, season stats, preference toggles, account menu.

## 4. Backend API Surface
```
GET  /api/placement/dashboard
GET/POST /api/placement/drives            (+ /{id}, POST /{id}/approve)
GET  /api/placement/applications?drive=&status=
POST /api/placement/applications/{id}/shortlist|reject|offer
GET  /api/placement/students
GET/POST /api/placement/jobs              (+ /{id})
GET/POST /api/placement/companies         (+ /{id})
GET  /api/placement/notifications
POST /api/placement/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Student**: job/drive visibility, application status updates, offers.
- Writes → **Admin**: drive approval requests, offer/placement stats.
- Reads ← **Admin**: student master, batch eligibility.
- Reads ← **Alumni**: mentorship/hiring referrals (future).

## 6. Wiring Status

Backend: `backend/src/modules/placement/` (schemas, service, routes)
Frontend: `learnix/users/placement_cell/` (8 pages wired to live API)

| Endpoint | Method | Status |
|----------|--------|--------|
| `/placement/dashboard` | GET | ✅ wired |
| `/placement/companies` | GET | ✅ wired |
| `/placement/companies` | POST | ✅ wired |
| `/placement/companies/:id` | PUT | ✅ wired |
| `/placement/jobs` | GET | ✅ wired |
| `/placement/jobs` | POST | ✅ wired |
| `/placement/jobs/:id/close` | POST | ✅ wired |
| `/placement/drives` | GET | ✅ wired |
| `/placement/drives` | POST | ✅ wired |
| `/placement/drives/:id/submit` | POST | ✅ wired |
| `/placement/applications` | GET | ✅ wired |
| `/placement/applications/:id/decide` | POST | ✅ wired |
| `/placement/offers/extend` | POST | ✅ wired |
| `/placement/offers/:id/decide` | POST | ✅ wired |
| `/placement/students` | GET | ✅ wired |
| `/placement/notifications` | GET | ✅ wired |
| `/placement/notifications/read-all` | POST | ✅ wired |
| `/placement/broadcasts` | POST | ✅ wired |
| `/placement/profile` | GET | ✅ wired |

**App wiring:**
- `placement_cell.js`: demo user `setDemoUser('placement@learnix.dev')`
- Dashboard: live API (hero, stats, active drives, pending applications, module hub)
- Drives: live API (list, create, submit for approval, filter)
- Applications: live API (filter, shortlist/interview/reject decisions)
- Students: live API (eligible pool, search, eligibility status)
- Jobs: live API (list, post, close)
- Companies: live API (directory, add, sector filter)
- Notifications: live API (inbox, mark all read, broadcast)
- Profile: live API (name, stats, preferences, menu)