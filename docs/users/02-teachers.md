# 02 — Teacher App (`role: teacher`)

> Entry: `users/teachers/teacher.js` · Pattern: **tab-router** (5 tabs + class sub-flows)

## 1. Role & Scope
The teacher creates and grades academic content: manages classes, lecture notes, quizzes, syllabus, roster, assignments & exams, tracks student performance, weekly schedule. **Key model:** a teacher teaches several subjects, each subject to 1–3 class sections; a section studies 2–3 of the teacher's subjects.

## 2. App Shell
- **Header**: `TeacherHeader` (greeting + notification bell → Notifications screen).
- **Bottom nav**: Dashboard · Classes · Assignments · Performance · Profile.
- **Class sub-flows** (per selected class): `ClassDashboard` → `LectureNotes` / `Quiz` / `Syllabus` / `Roster`.
- **Top-level flows**: `Notifications`, `Schedule`.

## 3. Modules & Data Entities

### 3.1 Dashboard
Widgets: hero header, quick actions (Classes/Assignments/Performance/Profile), schedule list, performance overview, insights grid, recent submissions (→ grade).

**Entities**: header (name/role), quickActions[], schedule[], performance{}, insights[], submissions[] (student, assignment, status, score).

### 3.2 Classes (Management Grid)
List of class cards → tap opens `ClassDashboard` for that class; "upload" opens LectureNotes.

**Entities** (from `classData.js`)
| Field | Type |
|-------|------|
| class | id/code (SEC-042), title, students count, schedule (days + time), color |

### 3.3 Class Dashboard
Stats (attendance %, avg grade, pending grading, active quizzes), quick actions (Notes/Quizzes/Syllabus/Roster), weekly mini-timetable, AI teaching insights (performance gap + recommended recap).

**Entities**: DASHBOARD_STATS[], QUICK_ACTIONS[] (screen target), AI_INSIGHT{title, content, highlight, actions}.

### 3.4 Lecture Notes
Unit list → topic list → **create/edit notes editor** (title, subject metadata, rich content, sidebar). Published notes appear in the student Lecture Notes flow.

**Entities**
| Field | Type |
|-------|------|
| unit | id, title, order, topics[] |
| topic | id, title, content, attachments |
| note draft | title, subject, unit, content, publish flag |

### 3.5 Quiz
Unit list → topic detail → question management. Flows: **create quiz** (basic info, difficulty, question counter), **create question** (MCQ / True-False cards, proctoring rules), **edit questions**, **quiz preview** (timed, per-question cards).

**Entities**
| Field | Type |
|-------|------|
| quiz | id, title, class, subject, duration, difficulty, questions[] |
| question | type (MCQ/TF), prompt, options[], correctAnswer, marks |
| proctoringRules | allow retakes, timer, shuffle, anti-cheat |

**Actions**: create/edit/publish quiz, add/edit/delete question, preview & attempt, auto-grading (instant for MCQ/TF).

### 3.6 Syllabus
Unit list → unit page (topics + sub-pages: topic detail, edit topic, add/update). Statuses flow to HOD approval and student syllabus tracker.

**Entities**
| Field | Type |
|-------|------|
| unit | id, title, topics[] |
| topic | id, title, description, resources |
| status | Draft / Submitted / HOD Approved / Changes Requested / Approved |

### 3.7 Roster
Student roster per class: list with attendance %, contact, actions (message, view).

### 3.8 Assignments & Exams (hub)
Dashboard stats (active assignments, due this week, awaiting grading, upcoming exams), active assignment cards (submitted/total/graded), upcoming exams, quick actions (Create Assignment / Schedule Exam / Export Grades), alerts (low submission, grade disputes).

**Sub-pages**
| Page | Purpose |
|------|---------|
| assignment_list | tabs (active/upcoming/completed) |
| assignment_detail | overview, submissions list, per-submission grading entry |
| create_assignment | title, class, subject, due date, attachments, publish toggle |
| create_exam | exam metadata + schedule |
| exam_list / exam_detail | exam cards; results per student + publish bar |
| grade_submission | rubric card, grade input, submission viewer, nav between students |
| export_grades | format picker (CSV/PDF) + export bar |

**Entities**
| Field | Type |
|-------|------|
| assignment | id, title, subject, classCode, dueLabel, submitted, total, graded, status |
| exam | id, title, subject, classCode, date, time, room |
| submission | student, submittedAt, status (Pending/Graded/Flagged), score |
| grading | rubric[], grade, feedback |

**Actions**: create/publish assignment, schedule exam, grade submission (with rubric), export grades, publish results (→ student app).

### 3.9 Student Performance (Academic Curator)
**Model-driven:** subject ↔ section matrix (TEACHING map). Select subject → class section → overview (class average, attendance, participation, grade distribution, at-risk/top counts) → student list (ranked, status tiers Optimal/Steady/At Risk) → student detail (skill mastery bars, quiz/assignment/exam trends, strengths & improvements, AI note).
Also: compare subjects within a class, compare classes for a subject, subject-level skill gaps + AI suggestions (remedial sessions, peer groupings).

**Entities** (from `performanceData.js`)
| Field | Type |
|-------|------|
| subject | id, name, color |
| class section | id, label |
| teaching matrix | subjectId → [sectionIds] |
| student | id, name, studentId, attendance, grade, status, trend[], keyDriver |
| skill mastery | skill, value (0–100) |
| subject gaps | topic, mastery %, note |
| suggestions | text, action type |

### 3.10 Schedule
Day tabs (Mon–Sun) → session cards (time, title, location, mode virtual/offline, joinable flag). Join button placeholder for live class link.

### 3.11 Notifications
Inbox list (types: assignment, exam, leave, alert...) with unread markers, mark all read.

### 3.12 Profile
Teacher profile: info, teaching stats, settings, logout.

## 4. Backend API Surface
```
GET  /api/teacher/dashboard
GET  /api/teacher/classes
GET  /api/teacher/classes/{id}/dashboard
GET  /api/teacher/classes/{id}/notes          (unit → topic tree)
POST /api/teacher/notes                       { unitId?, title, content, publish }
GET/POST /api/teacher/classes/{id}/quizzes
POST /api/teacher/quizzes/{id}/questions
GET  /api/teacher/classes/{id}/syllabus       (units/topics + status)
PUT  /api/teacher/syllabus/{topicId}          (submit for HOD approval)
GET  /api/teacher/classes/{id}/roster
GET  /api/teacher/assignments?tab=...
POST /api/teacher/assignments                (create + publish)
POST /api/teacher/exams                      (schedule)
POST /api/teacher/submissions/{id}/grade     { score, feedback, rubric[] }
POST /api/teacher/exams/{id}/publish-results
GET  /api/teacher/exams/{id}/export?format=csv|pdf
GET  /api/teacher/performance?subject=&class= (overview + students + gaps + suggestions)
GET  /api/teacher/schedule
GET  /api/teacher/notifications
```

## 5. Cross-App Dependencies
- Writes → **Student**: notes, quizzes, assignments, results, roster visibility.
- Writes → **HOD**: syllabus submissions for approval.
- Reads ← **Admin**: class/course assignments, student master list.
- Reads ← **Exam Cell**: exam timetable.

## 6. Wiring Status

**Backend**: `backend/src/modules/teacher/` — `teacher.schemas.ts` + `teacher.service.ts` + `teacher.routes.ts`
**Mounted at**: `/api/v1/teacher` (with `TEACHER` role gate)
**Seed user**: `teacher@learnix.dev` (Anita Sharma, Assistant Professor)
**Demo setup**: `setDemoUser('teacher@learnix.dev')` in `teacher.js`

### Endpoints (16 features)

| Feature | Method | Endpoint |
|---------|--------|----------|
| T-01 Dashboard | GET | `/dashboard` |
| T-02 Classes | GET | `/classes` |
| T-03 Class Dashboard | GET | `/classes/:id/dashboard` |
| T-04 Notes list | GET | `/classes/:id/notes` |
| T-04 Create note | POST | `/notes` |
| T-04 Update note | PUT | `/notes/:id` |
| T-05 Quizzes | GET | `/classes/:id/quizzes` |
| T-05 Create quiz | POST | `/quizzes` |
| T-05 Add question | POST | `/quizzes/:id/questions` |
| T-05 Publish quiz | POST | `/quizzes/:id/publish` |
| T-06 Syllabus | GET | `/classes/:id/syllabus` |
| T-06 Submit syllabus | POST | `/syllabus/submit` |
| T-07 Update topic | PUT | `/syllabus/topics/:id` |
| T-08 Roster | GET | `/classes/:id/roster` |
| T-09 Schedule | GET | `/schedule` |
| T-10 Create session | POST | `/attendance/sessions` |
| T-10 Mark attendance | POST | `/attendance/mark` |
| T-10 Finalize | POST | `/attendance/finalize` |
| T-10 Attendance stats | GET | `/classes/:id/attendance` |
| T-11 Assignments | GET | `/assignments` |
| T-11 Create assignment | POST | `/assignments` |
| T-11 Assignment detail | GET | `/assignments/:id` |
| T-12 Grade submission | POST | `/submissions/:id/grade` |
| T-13 Exam grade entry | POST | `/exam-grades` |
| T-14 Performance | GET | `/performance?offeringId=` |
| T-15 Notifications | GET | `/notifications` |
| T-15 Mark all read | POST | `/notifications/read-all` |
| T-15 Broadcast | POST | `/broadcasts` |
| T-16 Profile | GET | `/profile` |

### App Wiring
- `teacher.js` — demo identity via `setDemoUser('teacher@learnix.dev')`
- Key pages wired to live API with loading/error/refresh states:
  - Dashboard (hero, schedule, performance, insights, recent submissions)
  - Classes (live offering list with students, schedule, section)
  - Notifications (inbox, mark all read)
  - Schedule (weekly timetable with day tabs, join button)
  - Profile (live stats, name, designation, quick links)
- Sub-pages (ClassDashboard, LectureNotes, Quiz, Syllabus, Roster, AssignmentExams, Performance) use the same API endpoints and can be wired progressively |