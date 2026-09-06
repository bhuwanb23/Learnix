# Learnix — Master Feature List (all 12 apps + platform)

> **Planning input for the backend.** Every feature in every app, numbered (`S-01`, `T-04`…)
> so your phase plan can reference them ("Phase 2 = S-01…S-07 + T-01…T-08"). Each row cites
> the schema tables that back it (125 tables, domains A–L in `backend/prisma/schema/`) and
> whether demo data is already seeded (✅ = seeded, — = table ready, empty until API writes).
>
> Companions: `docs/users/01–12` (per-role contracts + API shapes) · `02-database-schema.md`
> (table details) · `04-api-surface.md` (endpoint map) · `05-state-machines.md` (flows).

**Legend:** Tables = backing models · Seed = demo data present

---

## Student app (S) — docs/users/01 · tables: A, B, C, D, E, G, H, I, J, K

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| S-01 | Home dashboard (live class widget, attendance %, pending work, notices) | B course_offerings/class_sessions/attendance, K announcements | — |
| S-02 | My classes: enrolled offerings list + class detail | B course_offerings, enrollments | ✅ (CS401) |
| S-03 | Syllabus tracker (units/topics progress, % complete) | B syllabus_versions/units/topics | ✅ (3u/6t) |
| S-04 | Lecture notes reader (published notes + attachments) | B lecture_notes, note_attachments, L files | ✅ (1 note) |
| S-05 | Practice quizzes: attempt, timer, MCQ/TF auto-grade, score | C quizzes/questions/quiz_attempts/quiz_answers | ✅ (2/3) |
| S-06 | Assignments: list, detail, submit (text/file), see grade + feedback | B assignments/submissions, L files | ✅ (1 pub) |
| S-07 | Timetable: weekly view from master slots | B timetable_slots / offering_schedule_slots | — |
| S-08 | Exam schedule + hall ticket (QR) + seat | C exams/exam_slots/hall_tickets | ✅ (A-12) |
| S-09 | Results view + re-evaluation request (window-gated) | C results, re_evaluation_requests, L system_config | — |
| S-10 | Attendance detail (per subject, present/absent/late history) | B attendance_sessions/records | — |
| S-11 | Fee dues + pay (gateway later) + receipts download | E fee_dues/payments/receipts | ✅ |
| S-12 | Placement: browse jobs, apply, my applications, offers | D jobs/job_applications/placement_offers | ✅ |
| S-13 | Events: browse, register (QR pass), my registrations | I events/event_registrations | ✅ |
| S-14 | Library: my issued books, dues, request a book, digital resources | F books/book_issues/fines/book_requests, digital_resources | ✅ |
| S-15 | Hostel: my allocation, mess menu/feedback, gate pass request, complaints | G hostel_allocations/mess_*/gate_passes/hostel_complaints | ✅ |
| S-16 | Transport: my route/stop, live bus position, delay alerts, fee | H routes/route_stops/enrollments/bus_positions, E transport_fee_dues | ✅ |
| S-17 | Sports: join team/tournament, see fixtures | I teams/team_members/fixtures | ✅ |
| S-18 | Alumni mentorship: my mentor, request sessions | J mentorship_pairs/sessions | ✅ |
| S-19 | Notifications inbox + AI Study Buddy chat | K notifications/ai_interactions | ✅ |
| S-20 | Profile (avatar upload → files, personal/academic info) | A users, student_profiles, L files | ✅ |

## Teacher app (T) — docs/users/02 · tables: A, B, C, K

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| T-01 | Teacher dashboard (today's classes, pending grading, alerts) | B offerings/attendance/submissions | — |
| T-02 | My classes matrix: subject ↔ section ↔ semester (multi-class core) | B course_offerings | ✅ (2) |
| T-03 | Class dashboard per offering (stats, shortcuts) | B offerings + aggregates | — |
| T-04 | Lecture notes CRUD (draft→publish, attachments) | B lecture_notes/note_attachments, L files | ✅ |
| T-05 | Quiz builder (questions MCQ/TF, publish) + monitor attempts | C quizzes/questions/quiz_attempts | ✅ |
| T-06 | Syllabus: create version, units/topics, submit to HOD | B syllabus_versions/units/topics | ✅ SUBMITTED |
| T-07 | Syllabus tracker update (mark topics completed in class) | B syllabus_topics | — |
| T-08 | Roster: student list + roll numbers + quick profiles | B enrollments → student_profiles | ✅ (1) |
| T-09 | Schedule: my weekly timetable + class sessions (join link) | B offering_schedule_slots/class_sessions | ✅ slots |
| T-10 | Attendance: create session, mark, finalize, % + defaulters | B attendance_sessions/records | — |
| T-11 | Assignments: create (rubric, due), publish, close | B assignments/rubric_criteria | ✅ |
| T-12 | Grading: submissions queue, rubric scoring, return/flag | B submissions/rubric_scores | — |
| T-13 | Exam grade entry (feeds exam-cell evaluations) | C evaluation_papers | — |
| T-14 | Student performance analytics (per offering, AI insights) | B+C aggregates, K ai_interactions | — |
| T-15 | Notifications + broadcast to my classes | K notifications/broadcasts | ✅ 1 pending ann |
| T-16 | Profile (staff card, workload) | A staff_profiles | ✅ |

## Admin app (A) — docs/users/03 · tables: everything (oversight)

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| A-01 | Institution dashboard (KPIs across all modules) | aggregates | — |
| A-02 | Students CRUD + approvals (rollNo, program, section) | A users/student_profiles | ✅ |
| A-03 | Teachers/staff CRUD (employee, dept, workload) | A users/staff_profiles | ✅ |
| A-04 | Academics & Examinations (AI timetable generator + conflicts, cheating detection view) | C exams/exam_slots/exam_conflicts/cheating_cases | ✅ 1 case |
| A-05 | Timetable master grid + lock slots | B timetable_slots | — |
| A-06 | Attendance institution view + threshold alerts | B attendance_*, L system_config | — |
| A-07 | Assignments oversight (all offerings) | B assignments | ✅ |
| A-08 | Courses & Departments master CRUD | B departments/programs/courses | ✅ |
| A-09 | Fees: structures, revision approvals, dues oversight | E fee_structures/fee_dues | ✅ |
| A-10 | Placements oversight: approve drives, view pipeline | D placement_drives/job_applications | ✅ |
| A-11 | Events: create/approve/publish (the approval queue) | I events, event_registrations | ✅ |
| A-12 | Library oversight (catalog, circulation stats) | F books/book_issues | ✅ |
| A-13 | Hostel/Transport oversight reads | G/H tables | ✅ |
| A-14 | Announcements: author, approve queue, publish | K announcements | ✅ PUBLISHED+PENDING |
| A-15 | Reports & exports (CSV per module) | various | — |
| A-16 | Settings: academic years, config knobs, RBAC roles/permissions, feature flags | A academic_years, L system_config/feature_flags, A3 permission tables | ✅ 6+3 |
| A-17 | Notifications + audit log viewer | K notifications, L audit_logs | ✅ 1 entry |

## Placement Cell (P) — docs/users/04 · tables: D

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| P-01 | Dashboard (drives, applications, offers, CTC stats) | D aggregates | — |
| P-02 | Companies CRUD + ratings | D companies | ✅ (2) |
| P-03 | Jobs: post, open/close, applicant lists | D jobs | ✅ (1) |
| P-04 | Drives: create (eligibility JSON), submit for admin approval, schedule | D placement_drives | ✅ APPROVED→SCHEDULED |
| P-05 | Applications pipeline: shortlist → interview → offer/reject | D job_applications | ✅ INTERVIEW |
| P-06 | Offers: extend, mark accepted/declined | D placement_offers | ✅ EXTENDED |
| P-07 | Student eligibility pool + drive registration + attendance | D placement_eligibility/drive_registrations | ✅ |
| P-08 | Notifications + profile | K, A | ✅ |

## Exam Cell (X) — docs/users/05 · tables: C

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| X-01 | Dashboard (exams by status, pending evaluations, alerts) | C aggregates | — |
| X-02 | Exam schedule: create exam + slots, conflict detection | C exams/exam_slots/exam_conflicts | ✅ |
| X-03 | Room allocations + invigilator duty | C exam_room_allocations | ✅ |
| X-04 | Hall tickets: batch generate (QR), download tracking | C hall_tickets | ✅ (A-12) |
| X-05 | Evaluations: assign evaluator, paper progress, deadline reminders | C evaluations/evaluation_papers/grading_deadlines | ✅ 0/1 |
| X-06 | Results: enter → publish (gated by exam status), student view | C results, exams.status | — |
| X-07 | Re-evaluation window (config-gated) + decisions | C re_evaluation_requests, L system_config | — |
| X-08 | Cheating cases: review → confirm/dismiss/escalate | C cheating_cases | ✅ UNDER_REVIEW |
| X-09 | Notifications + profile | K, A | ✅ |

## Accounts & Finance (F) — docs/users/06 · tables: E

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| F-01 | Dashboard (collections vs dues, payroll status, budget burn) | E aggregates | — |
| F-02 | Collections: record payment (any category) + auto receipt no. | E payments/receipts | ✅ ×3 |
| F-03 | Fee structures (per program×AY) + revision approvals | E fee_structures | ✅ |
| F-04 | Fee dues: generate per semester, reminders, waive (audited) | E fee_dues, L audit_logs | ✅ |
| F-05 | Unified ledger: all money-in incl. fines/rent/transport/donations | E payments + link rows | ✅ |
| F-06 | Payroll: run per month, entries, payslips | E payroll_runs/entries, L files | ✅ DRAFT |
| F-07 | Expenses: approve/reject + budget updates (denorm) | E expenses/budgets | ✅ |
| F-08 | Scholarships: create, award, disburse → payment/write-off | E scholarships/scholarship_awards | ✅ APPROVED |
| F-09 | Finance reports (reconciliation: payments = receipts) | E | — |
| F-10 | Notifications + profile | K, A | ✅ |

## Library Staff (L) — docs/users/07 · tables: F

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| L-01 | Dashboard (issued, overdue, pending requests) | F aggregates | — |
| L-02 | Catalog CRUD (copies, racks) | F books | ✅ (2) |
| L-03 | Circulation: issue/return, overdue sweep → fine creation | F book_issues/fines | ✅ OVERDUE |
| L-04 | Fines: collect (→ payments write-through) or waive (audited) | F fines, E payments/fine_payments | ✅ PAID chain |
| L-05 | Book requests: approve → procurement pipeline | F book_requests/book_procurements | ✅ PENDING |
| L-06 | Digital library: resources + access grants | F digital_resources/digital_access_grants | ✅ |
| L-07 | Notifications + profile | K, A | ✅ |

## Hostel (H) — docs/users/08 · tables: G

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| H-01 | Dashboard (occupancy, pending passes, open complaints) | G aggregates | — |
| H-02 | Blocks/rooms/beds grid (vacant/allocated/maintenance) | G hostel_blocks/rooms/beds | ✅ A-101 |
| H-03 | Allocations: allocate/transfer/vacate (+bed state, rent dues) | G hostel_allocations, E hostel_rent_dues | ✅ |
| H-04 | Residents list | G allocations → students | ✅ (1) |
| H-05 | Mess: weekly menu CRUD, meal attendance, feedback review | G mess_menu_items/meal_attendance/mess_feedback | ✅ |
| H-06 | Gate passes: approve/reject, in/out times | G gate_passes | ✅ PENDING |
| H-07 | Complaints: assign, resolve | G hostel_complaints | ✅ OPEN |
| H-08 | Visitors: check-in/out | G visitors | ✅ IN |
| H-09 | Rent dues tracking → payments write-through | E hostel_rent_dues | ✅ Jul+Aug |
| H-10 | Notifications + profile | K, A | ✅ |

## Transport (R) — docs/users/09 · tables: H

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| R-01 | Dashboard (routes on road, service due, fee collection) | H/E aggregates | — |
| R-02 | Routes CRUD + stops timeline | H routes/route_stops | ✅ ×2 |
| R-03 | Fleet: vehicles CRUD, documents expiry alerts | H vehicles/vehicle_documents | ✅ ×2 |
| R-04 | Drivers: roster, duty status, license expiry | H drivers | ✅ |
| R-05 | Student enrollment per route/stop | H route_enrollments | ✅ |
| R-06 | Live tracking: GPS ping upsert, ETA, delay status | H bus_positions | ✅ ON_TIME |
| R-07 | Maintenance: service records + fuel logs | H service_records/fuel_logs | ✅ |
| R-08 | Transport fees: generate dues → collect via payments | E transport_fee_dues/payments | ✅ UNPAID |
| R-09 | Notifications + profile | K, A | ✅ |

## Sports & Cultural (SP) — docs/users/10 · tables: I

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| SP-01 | Dashboard (upcoming events, tournaments, equipment out) | I aggregates | — |
| SP-02 | Events: create (admin approval), schedule items, volunteers, registration approvals | I events/event_schedule_items/event_volunteers/event_registrations | ✅ |
| SP-03 | Teams: create, roster, captain | I teams/team_members | ✅ |
| SP-04 | Tournaments: fixtures, results entry, standings auto-update | I tournaments/fixtures/standings | ✅ |
| SP-05 | Equipment: items CRUD, issue/return, overdue | I equipment_items/equipment_issues | ✅ 9/10 |
| SP-06 | Venues: master + booking requests approve/reject | I venues/venue_bookings | ✅ PENDING |
| SP-07 | Notifications + profile | K, A | ✅ |

## HOD (HD) — docs/users/11 · tables: A, B, C

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| HD-01 | Department dashboard (faculty workload, approvals pending, results) | aggregates | — |
| HD-02 | Faculty management: workload view, max-hours enforcement | A staff_profiles, B offerings | ✅ |
| HD-03 | Syllabus approvals: SUBMITTED → HOD_APPROVED / CHANGES_REQUESTED (+feedback) | B syllabus_versions | ✅ 1 waiting |
| HD-04 | Leave requests: approve/reject (+substitute arrangement) | A users*, leave table pending** | — |
| HD-05 | Students by year/section (department scope) | A student_profiles, B sections | ✅ (1) |
| HD-06 | Course offerings oversight for department | B course_offerings/courses | ✅ |
| HD-07 | Department results/attendance analytics | B/C aggregates | — |
| HD-08 | Notifications + profile | K, A | ✅ |

**\*** leave requests table was in HOD doc but not in the 12-domain schema paste — **flag: add `leave_requests` table if you want HD-04** (one-model addition).

## Alumni Relations (AL) — docs/users/12 · tables: J, I, E

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| AL-01 | Dashboard (engagement %, events, donations, mentorship) | J/E/I aggregates | — |
| AL-02 | Directory: alumni list, filters, detail (message/invite/add-mentor) | A users/alumni_profiles | ✅ (Priya) |
| AL-03 | Events: ALUMNI category events, RSVP flow (= event_registrations), announce | I events/event_registrations | ✅ Alumni Meet |
| AL-04 | Donations: campaigns CRUD, record pledge → payment + receipt write-through | J fundraising_campaigns/donations, E payments/receipts | ✅ full chain |
| AL-05 | Mentorship: pairs approve/decline, reminders, sessions log | J mentorship_pairs/sessions | ✅ ACTIVE |
| AL-06 | Chapters: city chapters, presidents, members | J alumni_chapters, A alumni_profiles.chapterId | ✅ Bengaluru |
| AL-07 | Notifications + broadcast (audience: batch/city/mentors) | K notifications/broadcasts | ✅ |
| AL-08 | Profile (director card, program stats) | A | ✅ |

## Platform & shared (X-) — tables: A, L

| ID | Feature | Tables | Seed |
|----|---------|--------|------|
| X-01 | Auth: login (email+password, multi-role user), refresh rotation, logout, me | A users/user_roles/refresh_tokens | ✅ 5 users |
| X-02 | Password reset (email flow) | A password_resets | — |
| X-03 | Platform admin: create institutions, first-admin provisioning | A institutions, L platform_admins | ✅ DEMO |
| X-04 | Master data reads (departments/programs/batches/sections/courses/AY) | B, A academic_years | ✅ |
| X-05 | Notification service: create/fan-out/mark-read (used by all modules) | K notifications | ✅ |
| X-06 | Broadcast fan-out (audienceJson → notification rows) | K broadcasts | ✅ 1 |
| X-07 | Files: upload/download, purpose-tagged | L files | ✅ (avatar) |
| X-08 | Audit logging (every mutation) | L audit_logs | ✅ live |
| X-09 | Config + feature-flag resolution per institution | L system_config/feature_flags | ✅ |
| X-10 | RBAC middleware (roles + permission keys) | A user_roles/role_permissions/permission_groups | tables seeded? — |

---

## Quick coverage map (feature counts)

| App | Features | App | Features |
|---|---|---|---|
| Student | 20 | Hostel | 10 |
| Teacher | 16 | Transport | 9 |
| Admin | 17 | Sports & Cultural | 7 |
| Placement | 8 | HOD | 8 |
| Exam Cell | 9 | Alumni Relations | 8 |
| Accounts | 10 | Platform/shared | 10 |

**Total: 132 features.**

## Gaps found while listing (your call during planning)

1. **`leave_requests` table missing** (HOD HD-04, teacher leaves) — 1-model addition, recommend adding before API work.
2. **RBAC seed** (X-10) — `permission_groups`/`role_permissions` exist but empty; needs a seed pass when auth hardens.
3. Timetable generator + AI cheating detection (A-04) — tables ready, but algorithms are service-layer work, plan as separate features.
4. Payment gateway (S-11, F-02) — schema ready (`gatewayRef`), integration is Phase-8-ish.
5. Live WS for bus tracking + quiz — current design is polling/upsert by design (ADR), no ws infra needed in v1.
