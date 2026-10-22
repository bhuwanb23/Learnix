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

### 3.3 Courses (tab) — HD-06

The HOD's course desk. A **directory** of the department's courses, each carrying its health, its attendance and its pass rate, and a **course detail** that opens the whole chain in one call.

> **"Subject" IS "Course".** There is no `Subject` entity in this platform. `Evaluation.subjectOffering` is a `CourseOffering`, the exam cell's "course & subject allocation" block compares `ExamSlot.offerings` against the course offerings, and every "subject" is a course taught to one section by one teacher. So the desk says COURSE, and a subject allocation is a course allocation.

**The ten features**

| # | Feature | What it is |
|---|---------|-----------|
| 1 | Course directory | The department's courses, with filters (status, type, search, sort) and pagination |
| 2 | Course detail | The whole course in one call — eleven panels |
| 3 | Curriculum mapping | Which programmes the department **declares** this course for, and in which semester |
| 4 | Prerequisite graph | What this course demands first, and who is waiting for it |
| 5 | Faculty assignment | Who teaches each offering, and how much of the course is theirs |
| 6 | Student enrolment | The roll, and the state of each enrolment |
| 7 | Timetable | When the course meets, and for how long |
| 8 | Syllabus | The version, its state, its completion, and how long it has been sitting still |
| 9 | Attendance & performance | The register, the pass rate, the average, the grade spread |
| 10 | History | Every change to the course, and who made it |

**The chain**: `Course → Subjects → Faculty → Students → Timetable → Syllabus → Attendance → Performance → History`

**The Course Health Indicator** — three legs, and the same bands as the Department Health Score:

| Leg | Weight | Measured from |
|-----|--------|---------------|
| Attendance | 35% | The `AttendanceRecord` rows of the course's offerings. `PRESENT` and `LATE` both count as being in the room |
| Syllabus completion | 35% | Completed topics over total, on the course's **latest** syllabus version |
| Results | 30% | The per-course pass rate. The grade is **re-derived** from the marks through `gradeFor`, never read off the stored column |

Bands: `HEALTHY ≥ 80`, `WATCH ≥ 60`, `AT_RISK < 60`.

> **The health strip counts the TAUGHT courses only.** A retired course's last term is real data and its row shows the badge so a HOD can read how it ended, but a course that is no longer taught is not a problem to fix — and counting it would put a healthy **archived** course in the "healthy" strip and quietly flatter the department.

> **A leg with no data is EXCLUDED, never scored as zero.** A course in its first fortnight has no results and no attendance yet; scoring those as zero reports a brand-new course as a failing one — *confidently*, because the number looks like a measurement rather than the absence of one. The score is a weighted mean over the legs that **have** data, the weights are re-normalised over those legs, and the response names the legs left out and the weakest leg counted. A course with no data at all has **no score and no band** — it is unmeasured, not unhealthy.

**What the HOD may write**: edit a course, change its status, map it to a programme, unmap it, add a prerequisite, remove a prerequisite. What the HOD may **not** write: create a course — that is the Admin's, and the screen says so rather than offering a button that opens an alert. Every write leaves an audit row, and the History panel reads that table.

**Entity `course`** (added to `b1_structure.prisma`)

| Field | Type | Notes |
|-------|------|-------|
| id, code, name | string | `code` unique per institution |
| departmentId, institutionId | string | The department is the tenancy boundary, not the college |
| credits, semester | number | |
| type | string | `CORE \| ELECTIVE` — the course's **default** |
| **status** | string | `ACTIVE \| ARCHIVED \| DRAFT` — the course's own lifecycle, and NOT the exam's or the syllabus's |

**Entity `program_course`** (new — `c5_courses.prisma`)

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| programId, courseId | string | The **declaration**: which programme runs this course |
| semester | number | |
| type | string | `CORE \| ELECTIVE` — **in this programme**; a course can be core in one programme and an elective in another |
| isElective | boolean | Students choose it |

**Entity `course_prerequisite`** (new — `c5_courses.prisma`)

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| courseId | string | The course that DEMANDS |
| prerequisiteCourseId | string | The course that must come FIRST |
| type | string | `REQUIRED \| RECOMMENDED` |

> **Why the curriculum is a table and not a query.** Before this, "which programme runs which course" could only be answered *retrospectively*, from the offerings that had actually been created. That reports what **happened**, never what **should happen**, and it makes a course that was never offered indistinguishable from one that does not exist. So the department **declares** its curriculum and the offerings are the evidence it was carried out. A declared course with no offering is a gap; an offering with no declaration is an accident — and the detail panel reports the second one as `unmapped`.

> **Why a prerequisite is its own table.** A course that demands another course is a **self-relation with a kind on it**, and a self-relation cannot be a pair of columns: a list of ids in a scalar cannot be indexed, cannot be joined, and cannot carry a kind. The graph is kept acyclic — the server refuses an edge that would close a loop, because a loop makes "what must come first" unanswerable.

**The old route stays.** `GET /api/v1/hod/courses` and `GET /api/v1/hod/courses/:courseId` still answer, unchanged. The desk is a new set of paths (`/courses/catalogue`, `/courses/directory`, `/courses/:courseId/detail`), so a caller holding the old path gets the old document rather than a quietly different one.

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
GET  /api/hod/courses                     (+ /{id})   the OLD pair — unchanged
GET  /api/hod/courses/catalogue           the vocabulary: statuses, types, sorts, the health legs and bands, the thresholds
GET  /api/hod/courses/directory           the list, with the health on every row (?status=&type=&search=&sort=&page=)
GET  /api/hod/courses/{courseId}/detail   the whole course: the chain, the curriculum, the graph, the history
PATCH /api/hod/courses/{courseId}         { name?, credits?, semester?, type?, status? }
PUT  /api/hod/courses/{courseId}/status   { status: ACTIVE|ARCHIVED|DRAFT }
POST /api/hod/courses/{courseId}/curriculum      { programId, semester, type, isElective? }
DEL  /api/hod/courses/{courseId}/curriculum/{programId}
POST /api/hod/courses/{courseId}/prerequisites   { prerequisiteCourseId, type }
DEL  /api/hod/courses/{courseId}/prerequisites/{prerequisiteCourseId}
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
  (the OLD pair, still answering unchanged)

**The Courses desk (HD-06)** — `GET /courses/catalogue`, `GET /courses/directory` and
`GET /courses/{id}/detail`, mounted BEFORE the old HOD router on its own paths so the old pair
keeps answering. The detail is **one call**: the chain is a chain, and six round trips to
assemble one screen is six chances to show a half-drawn course.
- **The Course Health Indicator** — attendance 35% / syllabus 35% / results 30%, with the SAME
  bands as the Department Health Score so the two read as one family. **A leg with no data is
  EXCLUDED and re-weighted, never scored as zero**; a course with no data at all has no score
  and no band, because an unmeasured course is not an unhealthy one. The grade behind the pass
  rate is re-derived from the marks through `gradeFor`, not read off the denormalised column.
- **The curriculum is a DECLARATION** — `program_courses` says which programmes the department
  runs a course in, and the offerings are the evidence it was carried out. A course that is
  taught but never declared is reported as `unmapped`; nothing else in the platform could see it.
- **The prerequisite graph** is kept acyclic: a course cannot be its own prerequisite, and an
  edge that would close a loop is refused with a 422 rather than discovered later.
- **The HOD edits, archives and maps; the Admin creates.** There is no course write path
  anywhere in the platform, so this desk adds the first one — and the screen says the Admin
  creates courses rather than offering a "New Course" button that opens an alert.
- **The HOD shell grew a param channel** (`route.params`), which is what makes a course detail
  reachable at all: without it a sub-screen cannot be told WHICH record it is showing, and the
  old course detail was registered but unreachable.
- The dashboard's `LOW_ATTENDANCE` and `POOR_PERFORMANCE` alerts both route to the Courses tab,
  and the tab now **shows the attendance and the pass rate on every row** — an alert that routes
  to a screen which cannot show the figure it fired about is a broken route.


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

HD-02 evaluation-score and message/reassign alerts remain UI-phase features; leave balance cards
on faculty detail arrive with the leave-accrual policy.