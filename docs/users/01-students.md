# 01 — Student App (`role: student`)

> Entry: `users/students/students.js` · Pattern: **full-screen** (tabs + top-level flows)

## 1. Role & Scope
The student consumes everything the institution produces: classes & notes, assignments, events, placement, profile, notifications. Data comes from Teacher (notes/quizzes/assignments), Admin (events/announcements), Placement Cell (drives/jobs), and other staff apps (broadcasts).

## 2. App Shell
- **Header**: `StudentHeader` — profile avatar (taps → Profile tab), notification bell (→ Notifications screen).
- **Bottom nav**: Home · Classes · Assignments · Events · Placement · Profile.
- **Top-level flows** (replace tab content): `Notifications`, `BrowseJobs`, `PlacementDrive`, `JobDetails`, `JobApply`, `JobApplyDone`.
- **Profile sub-views** (`profileView`): `profile`, `view_profile`, `academic_details`, `progress_analytics`, `activity`, `settings`, `my_applications`, `my_registration`, `certifications`.

## 3. Modules & Data Entities

### 3.1 Dashboard (Home)
Widgets: Hero header (user), quick actions, attendance widget, today's schedule, performance heatmap, notifications panel, AI Study Buddy chat.

**Entities**
| Field | Type | Notes |
|-------|------|-------|
| user | object | name, semester, avatar |
| attendance | object | overall %, trend, per-subject |
| schedule | array | subject, time, room, status |
| performance | object | heatmap data (daily/weekly) |
| notifications | array | type, title, time |
| aiBuddy | object | quick prompts, chat simulation |

**Actions**: quick-action navigation (Classes/Assignments/Events/Profile), pull-to-refresh, AI chat (simulated — backend hook for real LLM).

### 3.2 Classes (Class hub)
Sections: today's overview (live class), quick-actions bento, course progression cards, AI recommendations, upcoming tests timeline, performance stats.
**Feature flows** (sub-screens): **Lecture Notes** (subject → unit → topic → notes reader), **Practice Quizzes**, **Syllabus Tracker**, **Weak Topics**.

**Entities**
| Field | Type |
|-------|------|
| semester / credits | string |
| liveClass | subject, professor, time, materials, status |
| courses | name, professor, progress %, grade, milestone (title, date) |
| upcomingTests | title, date, daysLeft, urgency |
| performance | gpa, trend, chart[] |
| aiRecommendations | title, message, highlight, resources[] |

### 3.3 Assignments
Tabs: **Active / Upcoming / Completed**. Detail views per tab:
- Active → submission flow (text editor + attachments → submission review success screen)
- Upcoming → detail w/ instructions, attached files, visual context, bottom action bar
- Completed → **results** (grade card, competency map, instructor feedback, improvement suggestions) or **under-review** (pending state, file attachment, achievement badge)

**Entities**
| Field | Type | Notes |
|-------|------|-------|
| assignment | object | id, title, subject, instructor, priority, dueDate, timeLeft, progress, status (Pending/Active/Submitted/Graded), grade, underReview |
| attachedFiles | array | name, type, size |
| instructions | array | strings |
| submission | object | text, files, submittedAt |
| result | object | grade, feedback, competencyMap, suggestions |

**Actions**: submit (text + attachments), view results, view feedback.

### 3.4 Events
Category filter chips, search, event cards (discovery), my registrations sidebar (QR pass + reminder), trending tags, event details page.

**Entities**
| Field | Type |
|-------|------|
| event | id, title, description, category, date{day,month}, time, location, image, attendees, avatars[] |
| registration | eventId, datetime, qrCode, reminderActive, reminderText |
| stats | upcoming count, xpEarned |

**Actions**: filter/search, register, view details, view campus map (placeholder).

### 3.5 Placement (Student portal)
Sections: header, quick actions, profile strength (resume completeness %), recommended jobs, upcoming drives.
**Flows**: `BrowseJobs` (list + filters) → `JobDetails` → `JobApply` (form) → `JobApplyDone` (confirmation). Also `PlacementDrive` (drive detail).

**Entities**
| Field | Type |
|-------|------|
| job | id, company, role, package, location, eligibility, deadline |
| drive | id, company, role, date, mode, eligibility, status |
| application | jobId, status (Applied/Shortlisted/...) |
| profileStrength | resume %, skill tags |

**Actions**: apply to job, view drive, view application status (also under Profile → My Applications).

### 3.6 Profile (+ sub-views)
Main: profile hero (PROFILE_INFO), stats (CGPA, attendance, credits, rank), categories & honors, campus wallet, quick settings.
Sub-views: View Profile, Academic Details, Progress Analytics, Activity, Settings, My Applications, My Registration, Certifications.

**Entities**
| Field | Type |
|-------|------|
| profile | name, id, program, email, phone, avatar |
| stats | cgpa, attendance, credits, rank |
| wallet | balance, transactions |
| applications | job applications statuses |
| registrations | event registrations + QR |
| certifications | earned certs |

### 3.7 Notifications (top-level screen)
List with unread count, mark all read, per-item read on tap. Same shape as staff apps' inbox.

## 4. Backend API Surface
```
GET  /api/student/dashboard
GET  /api/student/classes                     (courses + progress + tests)
GET  /api/student/lecture-notes               (subject → unit → topic → note)
GET  /api/student/assignments?tab=active|upcoming|completed
POST /api/student/assignments/{id}/submit     { text, files[] }
GET  /api/student/assignments/{id}/result
GET  /api/student/events                      (+ category filter, search)
POST /api/student/events/{id}/register
GET  /api/student/placement/jobs              (browse, filters)
GET  /api/student/placement/drives
POST /api/student/placement/jobs/{id}/apply   { form fields }
GET  /api/student/profile                     (all profile sub-views)
GET  /api/student/notifications
POST /api/student/notifications/read-all
```

## 5. Cross-App Dependencies
- Reads: courses/notes/quizzes (Teacher), events/announcements (Admin), jobs/drives (Placement), broadcasts (all staff apps), fee dues (Accounts), exam timetable/results (Exam Cell), library (Library), hostel/transport notices.
- Writes: assignment submissions, event registrations, job applications.

## 6. Wiring Status

**Backend**: `backend/src/modules/student/` — `student.schemas.ts` + `student.service.ts` + `student.routes.ts`
**Mounted at**: `/api/v1/student` (with `STUDENT` role gate)
**Seed user**: `student@learnix.dev` (Arjun Kumar, STU-2026-001)
**Demo setup**: `setDemoUser('student@learnix.dev')` in `students.js`

### Endpoints (20 features)

| Feature | Method | Endpoint |
|---------|--------|----------|
| S-01 Dashboard | GET | `/dashboard` |
| S-02 My Classes | GET | `/classes` |
| S-03 Syllabus Tracker | GET | `/syllabus/:offeringId` |
| S-04 Lecture Notes | GET | `/lecture-notes/:offeringId` |
| S-04 Note Detail | GET | `/lecture-notes/note/:id` |
| S-05 Quizzes | GET | `/quizzes/:offeringId` |
| S-05 Start Quiz | POST | `/quizzes/start` |
| S-05 Answer | POST | `/quizzes/answer` |
| S-05 Submit Quiz | POST | `/quizzes/submit` |
| S-06 Assignments | GET | `/assignments?tab=` |
| S-06 Assignment Detail | GET | `/assignments/:id` |
| S-06 Submit | POST | `/assignments/:id/submit` |
| S-07 Timetable | GET | `/timetable` |
| S-08 Exams | GET | `/exams` |
| S-09 Results | GET | `/results` |
| S-09 Re-evaluation | POST | `/results/reevaluate` |
| S-10 Attendance | GET | `/attendance/:offeringId` |
| S-11 Fee Dues | GET | `/fees` |
| S-12 Jobs | GET | `/placement/jobs` |
| S-12 Drives | GET | `/placement/drives` |
| S-12 Apply | POST | `/placement/apply` |
| S-12 My Applications | GET | `/placement/applications` |
| S-13 Events | GET | `/events` |
| S-13 Register | POST | `/events/:id/register` |
| S-13 My Registrations | GET | `/events/registrations` |
| S-14 Library | GET | `/library/my-books` |
| S-15 Hostel | GET | `/hostel/allocation` |
| S-16 Transport | GET | `/transport` |
| S-19 Notifications | GET | `/notifications` |
| S-19 Mark All Read | POST | `/notifications/read-all` |
| S-20 Profile | GET | `/profile` |

### App Wiring
- `students.js` — demo identity via `setDemoUser('student@learnix.dev')`
- Key pages wired to live API:
  - Dashboard (hero, attendance, schedule, notifications, AI buddy)
  - Notifications (inbox, mark all read)
- Additional pages use the same API endpoints and can be wired progressively:
  - Classes (syllabus, notes, quizzes, roster)
  - Assignments (list, detail, submit)
  - Events (browse, register)
  - Placement (jobs, drives, apply)
  - Profile (stats, academic details) |