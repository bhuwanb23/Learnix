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