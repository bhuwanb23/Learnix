# 11 — HOD / Department Coordinator App (`role: hod`)

> Entry: `users/hod/hod.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
The HOD is the department-level layer between **Teachers** (create/grade) and **Admin** (final sign-off): approves syllabi, manages faculty workload and leave, oversees department courses and student performance.

## 2. App Shell
- **Bottom nav**: Dashboard · Faculty · Courses · Students · Profile.
- **Feature modules**: Syllabus, Leave, Notifications.
- **Sub-pages**: faculty_detail (workload/classes), course_detail (syllabus/performance).

## 3. Modules & Data Entities

### 3.1 Dashboard (HD-01)

The HOD's single-screen department command center: **nine sections** plus a **Department Health
Score**. Every figure is derived from live rows, and every word of vocabulary is published by the
server.

| # | Section | What it answers |
|---|---|---|
| 1 | **Department KPIs** | Students, faculty, courses, attendance and pass percentage |
| 2 | **Today's overview** | Classes today, faculty availability, sessions taken |
| 3 | **Attendance snapshot** | Department attendance, and the subject-wise split behind it |
| 4 | **Academic progress** | Syllabus completion across the department's courses |
| 5 | **Faculty workload** | Assigned hours against the hours actually taught |
| 6 | **Student risk alerts** | Low attendance, poor performance, and who needs a conversation |
| 7 | **Pending approvals** | Leave requests and course changes waiting on this HOD |
| 8 | **Quick actions** | Assign Faculty, View Students, Approve Leave, Review Syllabus |
| 9 | **Performance trends** | Pass rate and average marks, semester by semester |

**Department Health Score** (the smart feature) — attendance (35%), syllabus progress (25%), faculty
balance (20%) and student performance (20%), combined into one number, banded `HEALTHY` (≥80) ·
`WATCH` (≥60) · `AT RISK` (<60), with the **weakest component named**.

**A component with NO DATA IS EXCLUDED, never scored as zero.** A department in week three has no
attendance records and a barely-started syllabus; scoring those as zero would report a brand-new
department as unhealthy, and the number would be *confidently* wrong — it would look like a
measurement rather than an absence of one. The score is a weighted mean over the components that
have data, the response says how many were included, and the excluded ones are named. The weights
are published, so the score is explainable rather than a black box.

**"Completed teaching hours" is a RECORD, not an estimate.** There is no `hoursTaught` column
anywhere in the schema and `ClassSession` is empty, so the question "how many hours has this
department actually taught?" has no direct source. The platform already keeps the answer: an
`AttendanceSession` with `status = 'FINALIZED'` is a class that was actually held, with attendance
taken. The delivered hours are the hours of the schedule slots **for that weekday** — one
class meeting is one hour, not the offering's whole five-hour week.

**"Assigned" and "delivered" are not the same unit, and the labels say so.** Assigned is a **weekly**
figure, measured against `maxWorkloadHours`, which is also weekly, so the utilisation percentage is
like-for-like. Delivered is a **term-to-date** total. The section never divides one by the other —
28 weekly hours against 270 delivered hours is not "961% delivered", it is a category error. The
comparison that means something is delivered against the hours scheduled over the period the
attendance record actually covers, and **the coverage is reported**: "Attendance has been recorded
for 2 of 48 elapsed weeks."

**"Absent" and "unmarked" are different figures.** A student with no attendance record and no result
is **unmeasured** — not safe, and not at risk. The section says so rather than counting them as
failures, and the attendance threshold comes from `SystemConfig.attendanceThreshold` with 75 as the
fallback — the same number the teacher's desk uses, so the two desks agree about the same student.

**Two tenancy bugs were fixed in the module this replaced**, and both are asserted by the suites:
1. The leave requests were filtered by `institutionId` alone, so an HOD could **list and APPROVE**
   another department's leave. They are now scoped through `staffUser.staffProfile.departmentId`.
2. The workload query was filtered by `teacherUserId` alone, so a teacher who also taught in
   another department inflated this department's utilisation and could raise a false "overloaded"
   alert. It is now scoped through section → program → department.

**The old `GET /api/v1/hod/dashboard` is gone** — a 404, not a quietly different shape. It served
a flat hero-and-stats document with prose-string alerts, and it counted leave requests
institution-wide.

**The endpoints:**
```
GET /api/v1/hod/dashboard/catalogue    the nine sections, the four actions, the six alert kinds,
                                       the health components and bands, every threshold
GET /api/v1/hod/dashboard/overview      all nine sections in one call (?academicYearId= to scope)
GET /api/v1/hod/dashboard/blocks/:block one section on its own — the SAME function the overview calls
```

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
GET  /api/hod/dashboard/catalogue        the nine sections, the four actions, the six alert kinds
GET  /api/hod/dashboard/overview          all nine sections in one call (?academicYearId=)
GET  /api/hod/dashboard/blocks/:block     one section on its own
GET  /api/hod/faculty                     (+ /{id})
POST /api/hod/faculty/{id}/evaluate|reassign
GET  /api/hod/courses                     (+ /{id})
POST /api/hod/syllabus/{id}/approve|request-changes   { feedback }
GET  /api/hod/students                    (?year=)
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
- **Dashboard `GET /dashboard/overview`** — the nine sections plus the Department Health Score.
  The old `GET /dashboard` is **404**: it served a flat hero-and-stats document with prose-string
  alerts, and it counted leave requests institution-wide.
- **Dashboard `GET /dashboard/catalogue`** — the vocabulary (sections, actions, alert kinds,
  health components and bands, thresholds). The client holds a mirror as a fallback only.
- **Dashboard `GET /dashboard/blocks/:block`** — one section, through the SAME function the
  overview calls, so the two can never disagree.
- Faculty `GET /faculty` (+ detail from same payload); reassign via `POST /offerings/{id}/reassign`
  with **max-hours enforcement** (422 when the move exceeds the target's maxWorkloadHours)
- Syllabus `GET /syllabus`; decisions `POST /syllabus/{id}/approve` and
  `POST /syllabus/{id}/request-changes { feedback }` (SUBMITTED-only, 409 otherwise; notify + audit)
- Leave `GET /leave`; `POST /leave/{id}/approve { substituteUserId? }` and `/reject`
- Students `GET /students?year={semester}` — department programs scope
- Courses `GET /courses` + `GET /courses/{id}` — offerings oversight with latest syllabus status

**Two tenancy fixes landed with the dashboard** (both asserted by `check-hod-dashboard.ts`):
the leave queries are now scoped to the department's staff, and the workload queries are now scoped
through section → program → department. The second one matters because a teacher who also taught in
another department was inflating this department's utilisation and could raise a false "overloaded"
alert about a person who was not overloaded here.

**The attendance threshold is a config now.** `SystemConfig.attendanceThreshold` is named in the
schema's own header and was read by nobody — a key a college can change but that nothing reads
looks like it is being honoured. It is seeded and read by the risk rule, with 75 as the fallback, so
the HOD's desk and the teacher's desk agree about the same student.
- Analytics `GET /analytics` — attendance % / pass rate aggregates (null until attendance
  sessions and published results exist)
- Notifications `GET /notifications` + `POST /notifications/read-all`; broadcast
  `POST /broadcasts { audience: ALL_FACULTY | DEPT_STUDENTS, title, body }`
- Profile `GET /profile` — real user, roles, designation, department

HD-02/HD-06 evaluation-score and message/reassign alerts remain UI-phase features; leave
balance cards on faculty detail arrive with the leave-accrual policy.