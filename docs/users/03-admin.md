# 03 — Admin App (`role: admin`)

> Entry: `users/admin/admin.js` · Pattern: **tab-router** (5 tabs + 11 feature modules) · Admin is the **super user** — owns all master data and oversees every other role.

## 1. Role & Scope
Admin is the institution-level super user: manages students, teachers, courses, reports, and every operational module (academics & exams, timetable, attendance, assignments, placements, events, library, fees, announcements, settings). All other staff roles operate under Admin's data and approvals.

## 2. App Shell
- **Bottom nav**: Dashboard · Students · Teachers · Courses · Reports.
- **Feature modules** (dashboard hub + quick actions): AcademicsExaminations, Timetable, Attendance, Assignments, Placements, Events, Library, Fees, Announcements, Settings, Notifications.
- **Sub-pages**: student_detail, add_student, batches; teacher_detail, add_teacher; course_detail; drive_detail; event_detail; class_report; cheating_cases, evaluation_details, exam_timetable, export_report, publish_results (under AcademicsExaminations).

## 3. Modules & Data Entities

### 3.1 Dashboard
Institution stats (1,234 students, 89 teachers, 156 courses, 94.2% attendance), module launcher grid, recent activity feed (enrollment, cheating alert, timetable published, fee payment, drive approved), quick actions (add student/teacher, create course, announcement, exam timetable, report).

### 3.2 Students (master table)
List with department filter chips, search; **student_detail** (profile, academics, fees, attendance); **add_student** (admission form); **batches** (per-batch student counts).

**Entity `students`**
| Field | Type |
|-------|------|
| id / rollNo | string (STU001 / CSE-21-001) |
| name, email, phone | string |
| department, program, semester, batch | FK strings |
| attendance, cgpa | number |
| status | Active / Probation / Inactive |

Also: `PENDING_APPROVALS` (admission requests to approve), `BATCHES` (id, name, students, year).

### 3.3 Teachers (master table)
List with department filter, workload shown; **teacher_detail**; **add_teacher**; **leave_requests** approval list.

**Entity `teachers`**
| Field | Type |
|-------|------|
| id | TCH001 |
| name, designation, department, email, phone | string |
| subjects | array |
| classes, workload, maxWorkload | number |
| status | Active / On Leave |

**Entity `leave_requests`**: teacherName, type (Medical/Casual/Earned), from/to, days, reason, status (Pending/Approved).

### 3.4 Courses (programs & syllabus)
Departments list (students, HOD), programs (duration, semesters, UG/PG), course list (code, credits, teacher), **course_detail**, syllabus templates with status (Approved/Draft) → approval gate for teacher/HOD submissions.

**Entities**: `departments`, `programs`, `courses`, `syllabus_templates` (see 00-overview §2).

### 3.5 Reports & Analytics
Institution KPIs (pass rate 87.4%, attendance, placement rate 92.1%), class reports (per-class students/attendance/passRate/avgCgpa), **class_report** drill-down, export options (student master, attendance, marks, fee, placement, library reports).

### 3.6 Academics & Examinations
Quick stats (active exams, pass rate, cheating cases, pending evaluations), exam timetable generator (conflict detection: room/teacher/subject overlaps), evaluation dashboard (completed/in-progress/pending, subject progress), AI cheating detection (risk levels), sub-pages: **cheating_cases**, **evaluation_details**, **exam_timetable**, **export_report**, **publish_results**.

**Entities**: exam{id, type (mid-term/final/quiz/assignment), semester, subject, date, time}, evaluation{completed, inProgress, pending, progressPercentage}, cheating_case{student, issue, riskLevel}, conflict{type, description, severity}.

### 3.7 Timetable
Week-day grid (Mon–Fri) of class sessions (time, subject, class, teacher, room), teacher allocation with utilization %, conflict list (room booked twice, teacher overlap, workload warning).

**Entity `timetable_slot`**: day, time, subject, class, teacher, room.

### 3.8 Attendance
Today overall stats (present/late/absent/classes held), per-class attendance bars, recent absent list (risk tracking).

**Entity `attendance_record`**: classId, date, presentCount, absentCount, lateCount.

### 3.9 Assignments (institution view)
Stats (active assignments, submissions, pending grading, plagiarism flags), recent submissions with status (Graded/Pending/Flagged), plagiarism cases (similarity %, source, status Under Review/Confirmed).

### 3.10 Placements (institution view)
Stats (drives, companies, applications, offers), drive list with approval status (Approved/Pending/Scheduled), recent applications (Applied/Shortlisted), companies; **drive_detail**.

**Entities**: `placement_drive`{company, role, package, date, mode, eligible, applications, status}, `application`{student, company, role, status}, `company`.

### 3.11 Events (institution view)
Event list (Tech Fest, Sports Meet, Cultural Night, Hackathon, Alumni Networking Meet) with registrations/capacity/status, **event_detail**, recent registrations.

### 3.12 Library (institution view)
Stats (24,580 books, issued, overdue, fines), book catalog (copies/available), issued books with due dates, book requests queue.

### 3.13 Fees & Finance (institution view)
Stats (₹4.2 Cr collected, ₹5.1 Cr target, dues, defaulters), recent collections (method: UPI/card/cash, status Cleared/Partial), fee dues with days overdue, fee structure per program.

### 3.14 Announcements
Published/drafts/pending stats, published list (title, content, audience, author), pending approval queue (from departments/library/sports) → **approve/reject** and broadcast.

**Entity `announcement`**: title, content, audience, author, status (Draft/Pending/Published).

### 3.15 Settings
Roles & permissions (RBAC — Super Admin, Admin, Teacher, Placement, Exam Cell, Library, Accounts, Student with permission counts), permission groups (Academics/Exams/Students/Finance), academic year config, system config (institution name, support email, attendance threshold, backlog limit, passing marks, re-evaluation window).

**Entities**: `roles`{id, name, users, permissions}, `permission_groups`, `academic_year`, `system_config`.

## 4. Backend API Surface
```
GET  /api/admin/dashboard
GET/POST /api/admin/students               (+ /{id}, /{id}/approve, POST add)
GET/POST /api/admin/teachers               (+ /{id}, POST add)
GET/POST /api/admin/leave-requests/{id}/approve|reject
GET/POST /api/admin/courses                (+ /{id}, syllabus templates, approve)
GET  /api/admin/reports                    (+ /classes/{id}, /export?type=)
GET  /api/admin/academics                  (exams, evaluations, cheating cases)
POST /api/admin/exams/timetable/generate   (conflict detection)
POST /api/admin/cheating-cases/{id}/action
GET/POST /api/admin/timetable              (+ teacher allocation, conflicts)
GET/PUT /api/admin/attendance              (daily records)
GET  /api/admin/assignments                (+ plagiarism cases, /{id}/resolve)
GET/POST /api/admin/placements             (drives, /{id}/approve)
GET/POST /api/admin/events                 (+ /{id}/approve)
GET  /api/admin/library
GET  /api/admin/fees
POST /api/admin/announcements              (+ /{id}/approve|reject → broadcast)
GET/PUT /api/admin/settings                (roles, permissions, config, academic year)
GET  /api/admin/notifications
```

## 5. Cross-App Dependencies
- **Owns**: all master data (departments, programs, courses, students, teachers, batches, fee structure, companies, books, events, roles).
- **Approves**: syllabus (from HOD/Teacher), announcements (from departments), placement drives (from Placement), event requests (from Sports/Alumni).
- **Watches**: every staff app's operations (fees ↔ Accounts, placements ↔ Placement, library ↔ Library staff, exams ↔ Exam Cell, events ↔ Sports/Alumni).
- **Writes → Student**: announcements, results (via publish), events.