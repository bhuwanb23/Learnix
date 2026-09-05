# 05 — Exam Cell App (`role: examcell`)

> Entry: `users/exam_cell/exam_cell.js` · Pattern: **tab-router** (5 tabs + 3 feature modules)

## 1. Role & Scope
The exam cell plans and runs all examinations: builds the exam timetable, generates hall tickets, tracks evaluations, publishes results, and manages cheating cases flagged by AI. Admin's Academics & Examinations module is the institution-level view of the same data.

## 2. App Shell
- **Bottom nav**: Dashboard · Timetable · Evaluations · Results · Profile.
- **Feature modules**: HallTickets, CheatingCases, Notifications.

## 3. Modules & Data Entities

### 3.1 Dashboard
Hero (exam season progress), stats (exams scheduled, students registered, evaluations pending, results published), today's exam schedule, pending items (evaluations to collect, results to publish), alerts (room conflicts, unverified papers), quick-tool launcher, activity feed.

### 3.2 Timetable
Exam timetable by day: slots (subject, class, date, time, room, exam type Mid-term/Final/Quiz/Assignment), conflict warnings, actions (reschedule, notify students).

**Entity `exam_slot`**: id, subject, class, date, time, room, type, status (Scheduled/Completed).

### 3.3 Evaluations
Evaluation queue: exam → subject → paper counts with status (Pending / In Progress / Completed), per-paper evaluator assignment, progress %. Actions: assign evaluator, mark complete.

**Entity `evaluation`**: examId, subject, totalPapers, completed, inProgress, pending, evaluator.

### 3.4 Results
Result list per exam (published/unpublished), class-wise pass %, topper, grade distribution. Actions: **publish results** (→ student app), re-evaluation requests handling.

**Entity `result`**: examId, student, marks, grade, pass/fail, published flag.

### 3.5 Hall Tickets (module)
Hall ticket generation per exam: student, roll no, exam, date/time, room, seat number, QR. Statuses: Generated / Downloaded / Not Generated. Actions: generate batch, reprint, notify.

**Entity `hall_ticket`**: id, studentId, examId, room, seat, qrCode, generatedAt.

### 3.6 Cheating Cases (module)
Cases from AI detection (timing analysis, answer similarity) with risk levels (High/Medium/Low), evidence, status (Under Review / Confirmed / Dismissed). Actions: **Confirm / Dismiss**, escalate to admin, notify student.

**Entity `cheating_case`**: id, studentId, examId, issue, riskLevel, evidence, status.

### 3.7 Notifications
Inbox (timetable/result/hall-ticket/cheating types) + Broadcast tab (audience: All Students / By Class / Exam Registrants → timetable changes, hall ticket release, result announcements).

### 3.8 Profile
Exam controller profile, exam stats, preference toggles, account menu.

## 4. Backend API Surface
```
GET  /api/examcell/dashboard
GET/POST /api/examcell/timetable          (+ /{id}/reschedule, notify)
GET  /api/examcell/evaluations            (+ /{id}/assign, /{id}/complete)
GET  /api/examcell/results                (+ /{id}/publish, re-evaluation)
GET/POST /api/examcell/hall-tickets       (generate batch, reprint)
GET/POST /api/examcell/cheating-cases     (+ /{id}/confirm|dismiss)
GET  /api/examcell/notifications
POST /api/examcell/broadcasts
```

## 5. Cross-App Dependencies
- Writes → **Student**: timetable visibility, hall tickets, published results.
- Writes → **Admin**: evaluation progress, cheating cases (institution view), result approval.
- Reads ← **Admin**: exam configuration, academic calendar.
- Reads ← **Teacher**: exam requests/grades.
- Cheating cases shared with Admin's AI cheating detection module.