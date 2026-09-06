# 02 — Database Schema Blueprint (all 12 roles)

> The complete base schema. Grounded in `docs/users/*` (each domain cites its owning doc). Status values exactly match `05-state-machines.md`. Money = `Int` paise (`*Minor`). Every tenant table: `institutionId` + `@@index([institutionId])` (omitted below for brevity but **mandatory**). PK = `cuid()`. All models also get `createdAt/updatedAt`.

**≈ 96 tables.** Domains: **A** Identity & Tenancy · **B** Academic Core · **C** Assessment & Exams · **D** Placement · **E** Finance · **F** Library · **G** Hostel · **H** Transport · **I** Events & Sports · **J** Alumni · **K** Communication · **L** System.

---

## Domain A — Identity, Tenancy & RBAC (owner: none / all) — 11 tables

| Table | Key fields | Notes |
|---|---|---|
| `institutions` | name, code(uq), timezone, address, logoFileId, plan, status | Platform-owned; NOT tenant-filtered itself |
| `users` | institutionId, email(uq per inst), passwordHash, fullName, phone, avatarFileId, status(ACTIVE/SUSPENDED), lastLoginAt | Soft-delete. One row per person per institution |
| `user_roles` | userId, role | Rows: STUDENT/TEACHER/ADMIN/PLACEMENT/EXAMCELL/ACCOUNTS/LIBRARY/HOSTEL/TRANSPORT/SPORTS/HOD/ALUMNI. uq(userId, role) |
| `student_profiles` | userId(uq), rollNo(uq per inst), programId, batchId, section, currentSemester, admissionDate, status | 01-students · 03-admin |
| `staff_profiles` | userId(uq), employeeNo(uq per inst), designation, departmentId, joiningDate, maxWorkloadHours, status | All staff roles incl. teacher/HOD (02, 03, 11) |
| `alumni_profiles` | userId(uq), batchId, graduationYear, companyId?, currentRole, location, chapterId?, engagementStatus | 12-alumni |
| `role_permissions` | role, permissionKey | RBAC map seeded from admin Settings module (03 §3.15) |
| `permission_groups` | key, name, category | Academics/Exams/Students/Finance groupings |
| `refresh_tokens` | userId, tokenHash, expiresAt, revokedAt, replacedById | Rotation (ADR-07) |
| `password_resets` | userId, tokenHash, expiresAt, usedAt | One-time |
| `academic_years` | institutionId, name("2025-26"), startDate, endDate, isCurrent, semesterCount | 03-admin Settings §3.15 |

## Domain B — Academic Core (owner: Teacher/HOD/Admin) — 22 tables

| Table | Key fields | Notes |
|---|---|---|
| `departments` | name, code(uq per inst), hodUserId? | 03 §3.4 · 11 |
| `programs` | departmentId, name, code, level(UG/PG), durationYears, totalSemesters | 03 §3.4 |
| `batches` | programId, name("CSE 2027"), startYear, graduationYear | 03 §3.2 · 11 |
| `sections` | programId, batchId, name("Section A"), currentSemester | The "class" in teacher app (02 §3.2 SEC-042) |
| `courses` | departmentId, code(uq per inst), name, credits, semester, type(CORE/ELECTIVE) | 03 §3.4 |
| `course_offerings` | courseId, sectionId, teacherUserId, semester, academicYearId | **Central join** — teacher's subject↔section matrix (02 §3.9), student classes, attendance, timetable all hang off this |
| `offering_schedule_slots` | offeringId, dayOfWeek, startTime, endTime, room | Weekly timetable per class (02 §3.10, 03 §3.7) |
| `timetable_slots` | sectionId, offeringId, dayOfWeek, startTime, endTime, room, lockedByAdmin | 03 §3.7 master grid |
| `enrollments` | studentProfileId, offeringId, status(ACTIVE/DROPPED/COMPLETED), enrolledAt | uq(studentProfileId, offeringId) |
| `syllabus_versions` | courseId, version, submittedByUserId, status(DRAFT/SUBMITTED/HOD_APPROVED/CHANGES_REQUESTED/ADMIN_APPROVED), feedback, actionedByUserId? | 11 §3.5 · 02 §3.6 · 03 §3.4 |
| `syllabus_units` | syllabusVersionId, order, title | 02 §3.6 |
| `syllabus_topics` | unitId, order, title, description, status, completedAt? | Student syllabus tracker (01 §3.2) |
| `lecture_notes` | offeringId, unitTitle, topicTitle, title, bodyJson, status(DRAFT/PUBLISHED), publishedAt, authorUserId | 02 §3.4 → 01 §3.2 reader |
| `note_attachments` | lectureNoteId, fileId | via files table |
| `attendance_sessions` | offeringId, date, takenByUserId, status(OPEN/FINALIZED) | 03 §3.8 |
| `attendance_records` | sessionId, studentProfileId, state(PRESENT/ABSENT/LATE), markedAt | Per-student mark |
| `class_sessions` | offeringId, date, startTime, endTime, mode(OFFLINE/VIRTUAL), meetLink?, status(SCHEDULED/LIVE/COMPLETED/CANCELLED) | Student "live class" widget (01 §3.1), teacher join (02 §3.10) |
| `teaching_assistants` | offeringId, staffUserId | Future-proofing |
| `assignments` | offeringId, title, instructions, dueAt, maxMarks, weightage, status(DRAFT/PUBLISHED/CLOSED), createdByUserId | 02 §3.8 → 01 §3.3 |
| `assignment_attachments` | assignmentId, fileId | Attached files |
| `submissions` | assignmentId, studentProfileId, text?, submittedAt, status(PENDING/UNDER_REVIEW/GRADED/FLAGGED/RETURNED), gradeMarks?, feedback?, gradedByUserId?, gradedAt? | 02 §3.8 grade_submission |
| `rubric_criteria` | assignmentId, title, maxMarks, order | 02 §3.8 rubric card |
| `rubric_scores` | submissionId, rubricCriterionId, marks | Per-criterion grading |

## Domain C — Quizzes & Exams (owner: Teacher + Exam Cell) — 15 tables

| Table | Key fields | Notes |
|---|---|---|
| `quizzes` | offeringId, title, durationMin, difficulty(EASY/MEDIUM/HARD), status(DRAFT/PUBLISHED/CLOSED), shuffleQuestions, allowRetake, createdByUserId | 02 §3.5 |
| `questions` | quizId, type(MCQ/TRUE_FALSE), prompt, optionsJson, correctAnswer, marks, order | 02 §3.5 |
| `quiz_attempts` | quizId, studentProfileId, startedAt, submittedAt, scoreMarks?, status(IN_PROGRESS/SUBMITTED/AUTO_GRADED/FLAGGED) | 01 §3.2 practice quizzes |
| `quiz_answers` | attemptId, questionId, answerJson, isCorrect?, marksAwarded? | Auto-grade for MCQ/TF |
| `exams` | academicYearId, semester, type(MID_TERM/FINAL/QUIZ/ASSIGNMENT), name, createdByUserId, status(SCHEDULED/ONGOING/COMPLETED/RESULTS_PUBLISHED) | 03 §3.6 · 05 |
| `exam_slots` | examId, offeringId, date, startTime, endTime, room, seats, status(SCHEDULED/COMPLETED/RESCHEDULED) | 05 §3.2 timetable |
| `exam_room_allocations` | examSlotId, roomId, invigilatorUserId? | Conflict detection input (03 §3.6) |
| `hall_tickets` | examSlotId, studentProfileId, seatNo, qrPayload, status(GENERATED/DOWNLOADED/NOT_GENERATED), generatedAt | 05 §3.5 |
| `evaluations` | examSlotId, subjectOfferingId, totalPapers, completedPapers, inProgressPapers, evaluatorUserId?, status(PENDING/IN_PROGRESS/COMPLETED) | 05 §3.3 |
| `evaluation_papers` | evaluationId, studentProfileId, evaluatorUserId?, marksEntered?, status(PENDING/EVALUATING/DONE) | Paper-level granularity |
| `results` | examSlotId, studentProfileId, marksObtained, maxMarks, grade, isPass, publishedAt?, publishedByUserId? | 05 §3.4 → student app; publishing gated by exam status |
| `re_evaluation_requests` | resultId, studentProfileId, reason, status(REQUESTED/APPROVED/COMPLETED/REJECTED), decidedByUserId? | 05 §3.4 · window from system_config |
| `cheating_cases` | examSlotId, studentProfileId, issue, riskLevel(HIGH/MEDIUM/LOW), evidenceJson, source(AI/INVIGILATOR), status(UNDER_REVIEW/CONFIRMED/DISMISSSED/ESCALATED), reviewedByUserId? | 05 §3.6 · 03 §3.6 (AI detection feeds same table) |
| `exam_conflicts` | examId, type(ROOM/TEACHER/SUBJECT), description, severity, resolvedAt? | Generated by timetable generator (03 §3.6) |
| `grading_deadlines` | examId, dueAt, remindedAt? | Alerts for pending evaluations |

## Domain D — Placement (owner: Placement Cell) — 7 tables

| Table | Key fields | Notes |
|---|---|---|
| `companies` | name(uq per inst), sector, website, hrContact, rating | 04 §3.6 |
| `placement_drives` | companyId, title, role, packageMinorPerAnnum, driveDate, mode(ON_CAMPUS/VIRTUAL), eligibilityJson(minCgpa, maxBacklogs, allowedBranches[]), status(DRAFT/PENDING_ADMIN/APPROVED/SCHEDULED/COMPLETED), createdByUserId, approvedByUserId? | 04 §3.2 · 03 §3.10 |
| `jobs` | companyId, postedByUserId, role, packageMinorPerAnnum, location, openings, deadline, description, status(OPEN/CLOSED) | 04 §3.5 → student BrowseJobs |
| `job_applications` | jobId?, driveId?, studentProfileId, status(APPLIED/SHORTLISTED/INTERVIEW/OFFERED/REJECTED/WITHDRAWN), appliedAt, decidedByUserId?, decidedAt? | uq prevents duplicate apply; either job or drive. 04 §3.3 → student My Applications |
| `placement_offers` | applicationId, ctcMinor, offerDate, status(EXTENDED/ACCEPTED/DECLINED) | Offer tracking |
| `placement_eligibility` | studentProfileId, isEligible, blockedReason?, registeredForDrives | 04 §3.4 pool |
| `drive_registrations` | driveId, studentProfileId, status(REGISTERED/ATTENDED/ABSENT) | Test/interview attendance |

## Domain E — Finance (owner: Accounts & Finance) — 14 tables

| Table | Key fields | Notes |
|---|---|---|
| `fee_structures` | programId, academicYearId, tuitionMinor, otherMinor, totalMinor, status(ACTIVE/REVISION_REQUESTED/REVISION_APPROVED), requestedByUserId? | 03 §3.13 · 06 §3.5 |
| `fee_dues` | studentProfileId, feeStructureId?, title, amountMinor, dueDate, status(UNPAID/PARTIAL/CLEARED/WAIVED), waivedReason?, daysOverdue(denormalized) | 06 §3.3 |
| `payments` | payerUserId?, studentProfileId, category(TUITION/HOSTEL_RENT/MESS/TRANSPORT/FINE/DONATION/MISC), referenceNo, amountMinor, method(UPI/NET_BANKING/CARD/CASH), status(CLEARED/PARTIAL/PENDING/FAILED), paidAt, recordedByUserId?, gatewayRef? | **Unified money-in table** — collections (06 §3.2), fines (07 §3.4), hostel rent (08 §3.3), transport fees (09 §3.7), donations (12 §3.4) all land here; `category` + optional FK rows (below) give each its detail |
| `receipts` | paymentId(uq), receiptNo(uq per inst), issuedAt | 06 §3.2 · donation receipt write-through (12) |
| `donation_payments` | paymentId(uq), donationId | Links unified payment to alumni donation row |
| `transport_fee_dues` | paymentId?, studentProfileId, academicYearId, amountMinor, status(UNPAID/PARTIAL/PAID) | 09 §3.7 |
| `hostel_rent_dues` | paymentId?, allocationId, month, amountMinor, status | 08 §3.3 rent payments |
| `fine_payments` | paymentId(uq), bookIssueId | Links library fine to payment |
| `payroll_runs` | month, status(DRAFT/RUN/PAID), runByUserId, totalMinor | 06 §3.4 Run Payroll bulk |
| `payroll_entries` | payrollRunId, staffUserId, grossMinor, deductionsMinor, netMinor, status(PENDING/PAID), paidAt, payslipFileId? | 06 §3.4 |
| `expenses` | category, vendor, amountMinor, date, status(PENDING/APPROVED/REJECTED), requestedByUserId, approvedByUserId?, budgetId? | 06 §3.6 |
| `budgets` | departmentId?, fiscalYear, category, plannedMinor, spentMinor(denorm) | 06 §3.8 expense vs budget |
| `scholarships` | name, type(MERIT/NEED_BASED), coveragePercent, academicYearId | 06 §3.7 |
| `scholarship_awards` | scholarshipId, studentProfileId, amountMinor, status(APPROVED/DISBURSED/REJECTED), disbursedPaymentId? | 06 §3.7 → creates payment/write-off |

## Domain F — Library (owner: Library Staff) — 7 tables

| Table | Key fields | Notes |
|---|---|---|
| `books` | title, author, isbn, category, totalCopies, availableCopies(denorm), rackLocation | 07 §3.2 · 03 §3.12 |
| `book_issues` | bookId, studentProfileId, issueDate, dueDate, returnDate?, status(ISSUED/RETURNED/OVERDUE), issuedByUserId | 07 §3.3 |
| `fines` | bookIssueId(uq), amountMinor, daysOverdue, status(PENDING/PAID/WAIVED), waivedReason?, paidPaymentId? | 07 §3.4 → fine_payments |
| `book_requests` | studentProfileId, title, author?, reason, status(PENDING/APPROVED/REJECTED/PROCURED) | 07 §3.5 |
| `digital_resources` | title, type(PDF/EBOOK/JOURNAL), subject, license, accessCount | 07 §3.6 |
| `digital_access_grants` | resourceId, programId? , batchId? | Grant access per program |
| `book_procurements` | requestId?, title, copies, costMinor, status(REQUESTED/APPROVED/ORDERED/RECEIVED) | Purchase pipeline |

## Domain G — Hostel (owner: Hostel office) — 10 tables

| Table | Key fields | Notes |
|---|---|---|
| `hostel_blocks` | name("Block A"), wardenUserId? | 08 §3.2 |
| `rooms` | blockId, floor, number(uq per block), capacity, occupiedCount(denorm) | 08 §3.2 |
| `beds` | roomId, bedNo(uq per room), status(VACANT/ALLOCATED/MAINTENANCE) | Room grid bed dots |
| `hostel_allocations` | studentProfileId, bedId(uq active), fromDate, toDate?, status(ACTIVE/TRANSFERRED/VACATED) | 08 §3.2 allocate/transfer/vacate |
| `mess_menu_items` | dayOfWeek, meal(BREAKFAST/LUNCH/DINNER), itemsJson, isVeg | 08 §3.4 weekly menu |
| `meal_attendance` | date, meal, studentProfileId, count? | 08 §3.4 attendance bars |
| `mess_feedback` | studentProfileId, mealDate, rating, comment? | 08 §3.4 |
| `gate_passes` | studentProfileId, reason, outAt, expectedInAt, actualInAt?, status(PENDING/APPROVED/REJECTED), decidedByUserId? | 08 §3.5 |
| `hostel_complaints` | studentProfileId, category(PLUMBING/ELECTRICAL/NETWORK/MAINTENANCE), description, severity(LOW/MEDIUM/HIGH), status(OPEN/ASSIGNED/RESOLVED), assignedToUserId?, resolvedAt? | 08 §3.6 |
| `visitors` | name, visitingStudentProfileId, relation, checkInAt, checkOutAt?, status(IN/OUT) | 08 §3.7 check-in/out |

## Domain H — Transport (owner: Transport dept) — 9 tables

| Table | Key fields | Notes |
|---|---|---|
| `routes` | name("Route 01"), distanceKm, vehicleId?, driverUserId? | 09 §3.2 |
| `route_stops` | routeId, order, stopName, time, lat?, lng? | Stop timeline |
| `vehicles` | regNo(uq per inst), model, capacity, odometerKm, fuelPct, status(ON_ROAD/IDLE/SERVICE) | 09 §3.3 |
| `vehicle_documents` | vehicleId, registrationExpiry, insuranceExpiry, fitnessExpiry | Detail card |
| `drivers` | staffUserId?, name, licenseNo, licenseExpiry, experienceYears, dutyStatus(ON_DUTY/OFF_DUTY/ON_LEAVE) | 09 §3.4 |
| `route_enrollments` | routeId, stopId, studentProfileId, status(ACTIVE/REMOVED) | Students per route |
| `bus_positions` | vehicleId(uq latest per vehicle), routeId, currentStopId?, speedKmh, lat, lng, etaMin, status(ON_TIME/DELAYED), pingedAt | 09 §3.5 — upsert rows, no ws infra yet |
| `service_records` | vehicleId, type, costMinor, serviceDate, status(SCHEDULED/IN_PROGRESS/COMPLETED) | 09 §3.6 |
| `fuel_logs` | vehicleId, litres, amountMinor, filledAt | 09 §3.6 |

## Domain I — Events, Sports & Cultural (owner: Admin + Sports) — 11 tables

| Table | Key fields | Notes |
|---|---|---|
| `events` | title, description, category(TECH/SPORTS/CULTURAL/ALUMNI/OTHER), startDate, endDate, venueId?, capacity, organizerUserId, status(DRAFT/PENDING_ADMIN/APPROVED/PUBLISHED/COMPLETED/CANCELLED), coverFileId? | 03 §3.11 · 01 §3.4 · 10 §3.2 · 12 §3.3 (category ALUMNI = networking meet) |
| `event_registrations` | eventId, registrantUserId, status(PENDING/APPROVED/REJECTED/CONFIRMED/DECLINED), qrPayload?, reminderAt? | Student registration + sports approvals + alumni RSVP in one; audience-specific flows read same rows |
| `event_schedule_items` | eventId, day, item, isDone, order | Day-wise schedule (10 §3.2, 12 §3.3) |
| `event_volunteers` | eventId, studentProfileId, role? | 10 §3.2 Volunteers |
| `tournaments` | name, sport, category, status(UPCOMING/ONGOING/COMPLETED), organizerUserId | 10 §3.5 |
| `teams` | name, sport, captainStudentProfileId?, tournamentId? | 10 §3.3 |
| `team_members` | teamId, studentProfileId, role(PLAYER/CAPTAIN), joinedAt | Roster |
| `fixtures` | tournamentId, teamAId, teamBId, fixtureDate, resultJson?, status(UPCOMING/TODAY/COMPLETED) | 10 §3.5 |
| `standings` | tournamentId, teamId, played, won, lost, points | Points table |
| `venues` | name, location, capacity, status(AVAILABLE/BOOKED/MAINTENANCE) | 10 §3.6 |
| `venue_bookings` | venueId, eventTitle, requestedByUserId, date, timeSlot, status(PENDING/APPROVED/REJECTED) | 10 §3.6 booking requests |
| `equipment_items` | name, category, totalUnits, availableUnits(denorm), condition(GOOD/NEEDS_REPAIR) | 10 §3.4 |
| `equipment_issues` | itemId, studentProfileId, issuedAt, dueAt, returnedAt?, status(ISSUED/RETURNED/OVERDUE) | Issued-out tab |

## Domain J — Alumni (owner: Alumni Relations) — 5 tables

| Table | Key fields | Notes |
|---|---|---|
| `fundraising_campaigns` | name, description, targetMinor, raisedMinor(denorm), deadline, status(ACTIVE/COMPLETED) | 12 §3.4 |
| `donations` | campaignId?, alumniUserId, fund, amountMinor, status(PLEDGED/RECEIVED), receivedAt?, paymentId? | Record → unified payments + receipt write-through |
| `mentorship_pairs` | mentorAlumniUserId, menteeStudentProfileId, field, status(PENDING/ACTIVE/DECLINED/COMPLETED), requestedAt, approvedAt? | 12 §3.5 |
| `mentorship_sessions` | pairId, sessionDate, notes, loggedByUserId | Sessions log |
| `alumni_chapters` | city, presidentAlumniUserId, memberCount(denorm), nextEventAt? | 12 §3.6 |

## Domain K — Communication (owner: all) — 6 tables

| Table | Key fields | Notes |
|---|---|---|
| `notifications` | recipientUserId, type, title, body, dataJson?, readAt?, sourceModule | Every app's inbox reads this |
| `broadcasts` | senderUserId, audienceJson({role?, departmentId?, batchId?, sectionId?…}), templateKey?, title, body, channels(IN_APP/EMAIL/PUSH), sentAt | 12 apps' Broadcast tabs |
| `announcements` | authorUserId, title, content, audienceJson, status(DRAFT/PENDING_ADMIN/PUBLISHED/REJECTED), approvedByUserId?, publishedAt | 03 §3.14 approval queue → student notices |
| `push_tokens` | userId, platform, token | Reserved for push phase |
| `email_log` | recipientEmail, templateKey, payloadJson, status, sentAt | Delivery tracking when mailer lands |
| `ai_interactions` | userId, feature(STUDY_BUDDY/TEACHING_INSIGHT/PERFORMANCE_NOTE), prompt, response, tokensUsed? | Student AI buddy + teacher AI insights history |

## Domain L — System (owner: platform) — 5 tables

| Table | Key fields | Notes |
|---|---|---|
| `files` | institutionId, uploaderUserId, purpose, mimeType, sizeBytes, storageKey, originalName | Polymorphic attachments (ADR-10) |
| `audit_logs` | actorUserId, institutionId, action, entityType, entityId, beforeJson?, afterJson?, ip | Every state-changing mutation (ADR-10) |
| `system_config` | institutionId, key(uq per inst), valueJson | attendanceThreshold, backlogLimit, passingMarks, reEvalWindow, institutionName, supportEmail (03 §3.15) |
| `feature_flags` | institutionId, key, enabled | Rollout control |
| `platform_admins` | userId, level | PLATFORM_ADMIN role detail (ADR-08) |

---

## Core relationship map (FK spine)

```
institutions 1—* users 1—* user_roles
users 1—1 student_profiles | staff_profiles | alumni_profiles
departments 1—* programs 1—* batches 1—* sections
departments 1—* courses 1—* course_offerings *—1 sections, 1—1 staff_users (teacher)
course_offerings 1—* enrollments *—1 student_profiles
course_offerings 1—* {assignments, quizzes, lecture_notes, attendance_sessions, class_sessions, offering_schedule_slots, exam_slots}
assignments 1—* submissions *—1 student_profiles
exams 1—* exam_slots 1—* {hall_tickets, evaluations, results} *—1 student_profiles
placement: companies 1—* {jobs, placement_drives} 1—* job_applications *—1 student_profiles
finance: fee_structures 1—* fee_dues *—1 student_profiles; payments 1—1 receipts; payments ← {fines, donations, hostel_rent, transport_fees}
hostel: blocks 1—* rooms 1—* beds 1—* hostel_allocations *—1 student_profiles
transport: routes 1—* route_stops 1—* route_enrollments *—1 student_profiles; vehicles 1—* {service_records, fuel_logs, bus_positions}
sports: tournaments 1—* {fixtures, standings}; teams 1—* team_members; events 1—* event_registrations *—1 users
alumni: campaigns 1—* donations *—1 alumni_users; mentorship_pairs (alumni_user × student_profile)
comms: users 1—* notifications; broadcasts → audienceJson fan-out
```

## Build order for `schema.prisma`

Write domains in dependency order: **A → B → C → D → E → F → G → H → I → J → K → L** (E references D's donations only via `donation_payments` link, J/E circular pair resolved by storing `paymentId` on `donations` and `donationId` on `donation_payments` — no Prisma cycle since FK is one-directional).

## SQLite → PostgreSQL switch checklist

1. `provider = "postgresql"` in schema.prisma.
2. Re-run `prisma migrate dev` (regenerate SQL).
3. Replace `DATABASE_URL`.
4. Audit any raw SQL (none allowed by convention — only Prisma).
5. Re-run full test suite (tenant isolation + state machines).
