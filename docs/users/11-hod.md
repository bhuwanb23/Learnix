# 11 — HOD / Department Coordinator App (`role: hod`)

> Entry: `users/hod/hod.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
The HOD is the department-level layer between **Teachers** (create/grade) and **Admin** (final sign-off): approves syllabi, manages faculty workload and leave, oversees department courses and student performance.

## 2. App Shell
- **Bottom nav**: Dashboard · Faculty · Courses · Students · Profile.
- **Feature modules**: Syllabus, Leave, Notifications.
- **Sub-pages**: faculty_detail (workload/classes), course_detail (syllabus/performance).

## 3. Modules & Data Entities

### 3.1 Dashboard
Department hero (workload utilization, students), stats (faculty/students/courses/avg CGPA), pending approvals (syllabus + leave), department alerts (attendance below 75%, workload overload), quick-tool launcher, activity feed.

### 3.2 Faculty (tab)
Department faculty with **workload bars** (red > 90%, amber > 75%) and status → **faculty detail**: evaluation score, Message/Reassign/Evaluate actions, workload card, classes with attendance bars, leave balance.

**Entity `faculty`**
| Field | Type |
|-------|------|
| id, name, designation | string |
| workload, maxWorkload | number |
| evaluationScore | number |
| classes | [{ name, attendance }] |
| leaveBalance | number |

### 3.3 Courses (tab)
Department courses with syllabus status chips → **course detail**: credits/students/pass rate, teacher card, **syllabus approve / request changes** actions, unit-by-unit syllabus progress.

**Entity `dept_course`**: id, name, code, semester, credits, students, passRate, teacherId, syllabusStatus.

### 3.4 Students (tab)
Department stats (students, avg CGPA, at risk), **performance by year bars** (color-coded by CGPA), year filters, student list with Top/Good/At Risk status.

**Entity**: student + per-year aggregate { year, avgCgpa, atRisk }.

### 3.5 Syllabus Approvals (module)
Pending/Approved tabs, preview, **Approve** (forwards to Admin) / **Request Changes** (feedback to teacher). Shared state with Teacher's syllabus submit and Admin's syllabus templates.

**Entity `syllabus_approval`**: id, courseId, submittedBy, version, status (Pending/HOD Approved/Changes Requested/Admin Approved), feedback.

### 3.6 Leave Requests (module)
Pending/Processed tabs, leave-type chips (Medical/Casual/Earned), dates + reason, **Approve / Reject** with substitute-assignment flow. Shared with Admin's leave_requests.

**Entity `leave_request`**: id, teacherId, type, from, to, days, reason, status, substituteId.

### 3.7 Notifications (module)
Inbox (syllabus/leave/alert/meeting/result types) + **Broadcast tab** (audience: All Faculty / Department Students / HOD Office / All CSE → meetings & announcements).

### 3.8 Profile
HOD profile (Dr. Meera Iyer, HoD Computer Science), department stats, preference toggles (approval/attendance/meeting alerts), account menu.

## 4. Backend API Surface
```
GET  /api/hod/dashboard
GET  /api/hod/faculty                   (+ /{id})
POST /api/hod/faculty/{id}/evaluate|reassign
GET  /api/hod/courses                   (+ /{id})
POST /api/hod/syllabus/{id}/approve|request-changes   { feedback }
GET  /api/hod/students                  (?year=)
GET  /api/hod/leave                     (POST /{id}/approve|reject { substituteId })
GET  /api/hod/notifications
POST /api/hod/broadcasts
```

## 5. Cross-App Dependencies
- Receives ← **Teacher**: syllabus submissions, leave requests, faculty workload.
- Writes → **Admin**: approved syllabi, leave decisions, department stats.
- Writes → **Teacher**: approval status + change feedback.
- Reads ← **Admin**: departments/programs/courses master, student master.

## 6. Wiring Status (backend v1) — ✅ COMPLETE
Implemented in `backend/src/modules/hod/` (routes + service + zod schemas), mounted at
`/api/v1/hod` (role gate: `HOD` or `ADMIN`). App wired in `learnix/users/hod/**` via
`learnix/services/api.js` (`hodApi`; demo login: `hod@learnix.dev` — Meera Iyer, HOD CSE).

Schema addition: `leave_requests` table (`h1_hod_leaves.prisma`) — the flagged HD-04 gap —
with type MEDICAL|CASUAL|EARNED, days, reason, PENDING→APPROVED|REJECTED, optional
`substituteUserId`, decided-by stamps. Also repaired a latent schema bug: `Program.department`
had been an implicit many-to-many; now a proper FK relation (migration
`20260906220000_fix_program_department_relation`).

Final API surface (vs §4 sketch):
- Dashboard `GET /dashboard` — utilization = weekly schedule-slot hours vs maxWorkloadHours
- Faculty `GET /faculty` (+ detail from same payload); reassign via `POST /offerings/{id}/reassign`
  with **max-hours enforcement** (422 when the move exceeds the target's maxWorkloadHours)
- Syllabus `GET /syllabus`; decisions `POST /syllabus/{id}/approve` and
  `POST /syllabus/{id}/request-changes { feedback }` (SUBMITTED-only, 409 otherwise; notify + audit)
- Leave `GET /leave`; `POST /leave/{id}/approve { substituteUserId? }` and `/reject`
- Students `GET /students?year={semester}` — department programs scope
- Courses `GET /courses` + `GET /courses/{id}` — offerings oversight with latest syllabus status
- Analytics `GET /analytics` — attendance % / pass rate aggregates (null until attendance
  sessions and published results exist)
- Notifications `GET /notifications` + `POST /notifications/read-all`; broadcast
  `POST /broadcasts { audience: ALL_FACULTY | DEPT_STUDENTS, title, body }`
- Profile `GET /profile` — real user, roles, designation, department

HD-02/HD-06 evaluation-score and message/reassign alerts remain UI-phase features; leave
balance cards on faculty detail arrive with the leave-accrual policy.