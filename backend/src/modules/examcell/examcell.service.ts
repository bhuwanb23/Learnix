import { PrismaClient } from '@prisma/client';
import { notFound, badRequest } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// X-01 — Dashboard
// ─────────────────────────────────────────────────────────────
export async function getDashboard(institutionId: string) {
  const [
    totalExams,
    ongoingExams,
    scheduledExams,
    completedExams,
    totalSlots,
    totalHallTickets,
    pendingEvaluations,
    completedPapers,
    totalPapers,
    pendingResults,
    publishedResults,
    totalCheatingCases,
    activeCases,
  ] = await Promise.all([
    prisma.exam.count({ where: { institutionId } }),
    prisma.exam.count({ where: { institutionId, status: 'ONGOING' } }),
    prisma.exam.count({ where: { institutionId, status: 'SCHEDULED' } }),
    prisma.exam.count({ where: { institutionId, status: 'COMPLETED' } }),
    prisma.examSlot.count({ where: { exam: { institutionId } } }),
    prisma.hallTicket.count({ where: { examSlot: { exam: { institutionId } } } }),
    prisma.evaluation.count({ where: { examSlot: { exam: { institutionId } }, status: 'PENDING' } }),
    prisma.evaluation.aggregate({ where: { examSlot: { exam: { institutionId } } }, _sum: { completedPapers: true } }),
    prisma.evaluation.aggregate({ where: { examSlot: { exam: { institutionId } } }, _sum: { totalPapers: true } }),
    prisma.result.count({ where: { examSlot: { exam: { institutionId } }, publishedAt: null } }),
    prisma.result.count({ where: { examSlot: { exam: { institutionId } }, publishedAt: { not: null } } }),
    prisma.cheatingCase.count({ where: { examSlot: { exam: { institutionId } } } }),
    prisma.cheatingCase.count({ where: { examSlot: { exam: { institutionId } }, status: 'UNDER_REVIEW' } }),
  ]);

  // Upcoming exams (next 7 days)
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingSlots = await prisma.examSlot.findMany({
    where: { exam: { institutionId }, date: { gte: now, lte: weekLater }, status: 'SCHEDULED' },
    include: { offering: { include: { course: true } } },
    orderBy: { date: 'asc' },
    take: 10,
  });

  // Grading deadline alert
  const gradingDeadline = await prisma.gradingDeadline.findFirst({
    where: { exam: { institutionId } },
    orderBy: { dueAt: 'asc' },
  });

  // Recent cheating cases
  const recentCheating = await prisma.cheatingCase.findMany({
    where: { examSlot: { exam: { institutionId } } },
    include: { studentProfile: { include: { user: { select: { fullName: true } } } }, examSlot: { include: { offering: { include: { course: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const alerts: string[] = [];
  if (activeCases > 0) alerts.push(`${activeCases} cheating case(s) under review`);
  if (pendingEvaluations > 0) alerts.push(`${pendingEvaluations} evaluation(s) pending`);
  if (gradingDeadline && gradingDeadline.dueAt < weekLater) alerts.push(`Grading deadline approaching: ${gradingDeadline.dueAt.toLocaleDateString()}`);

  return {
    hero: {
      activeExams: ongoingExams,
      scheduledExams,
      completedExams,
      totalStudents: totalHallTickets,
    },
    stats: {
      totalExams,
      totalSlots,
      pendingEvaluations,
      completedPapers: completedPapers._sum.completedPapers ?? 0,
      totalPapers: totalPapers._sum.totalPapers ?? 0,
      pendingResults,
      publishedResults,
      totalCheatingCases,
      activeCheatingCases: activeCases,
    },
    upcomingExams: upcomingSlots.map((s) => ({
      id: s.id,
      subject: s.offering.course.name,
      code: s.offering.course.code,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      seats: s.seats,
    })),
    recentCheating: recentCheating.map((c) => ({
      id: c.id,
      student: c.studentProfile.user.fullName,
      issue: c.issue,
      riskLevel: c.riskLevel,
      subject: c.examSlot.offering.course.name,
    })),
    alerts,
  };
}

// ─────────────────────────────────────────────────────────────
// X-02 / X-03 — REMOVED, superseded by `./timetable.service.ts`
// ─────────────────────────────────────────────────────────────
//
// Six functions used to live here and were deleted rather than left as dead
// exports, because a dead export is still a second answer to "what counts as a
// clash" — and having three of them is how this module reached the state it was
// in. For the record, what each one got wrong:
//
//   listExams              returned `conflicts: examConflicts.length`, and NO code
//                          path ever created an ExamConflict row. The count was a
//                          hard zero forever while the screen showed "2 conflicts"
//                          out of a fixture file.
//   createExam             the only way to make an exam; there was no edit at all,
//                          which is most of what a controller does.
//   addExamSlot            looked the offering up with `where: { id }` and NO
//                          institution filter — another college's offering could
//                          be scheduled into this exam.
//   rescheduleSlot         checked NOTHING. Moving a paper could create the very
//                          student clash the controller was trying to fix.
//   listRoomAllocations    reported a raw roomId with nothing to resolve it
//                          against; `Room` in this schema is a HOSTEL room.
//   allocateRoom           wrote an unchecked roomId string into a scalar column
//                          and never checked the invigilator for a double booking.

// ─────────────────────────────────────────────────────────────
// X-04 — Hall tickets: MOVED to `./hallticket.service.ts`.
//
// The two functions that used to sit here were removed rather than re-pointed,
// because what they did was not merely thin but UNSAFE in ways the replacement
// is not:
//
//   listHallTickets(institutionId, examId)  took examId straight off the query
//                                            string with no schema at all, so
//                                            `?examId=` (empty) queried a scope
//                                            nobody meant, and every result was
//                                            reported as `stats` beside it.
//
//   generateHallTickets(…)                  issued a ticket for every active
//                                            enrolment and returned only
//                                            `{ generated, totalSlots }` — no
//                                            eligibility view, no way to see
//                                            WHICH students were warned about,
//                                            and a `seatCounter` that restarted
//                                            at 1 per slot without consulting
//                                            seats already handed out. Two
//                                            batch runs, or a deleted ticket
//                                            followed by a re-run, could collide
//                                            on the unique (examSlotId, seatNo)
//                                            constraint and abort halfway.
//
// Replaced by `hallticket.service.ts`: `generateBulk` takes its seat numbers
// from `nextSeatNo(taken)` where `taken` grows as the run writes, and returns
// the warnings alongside the count. `examcellApi.hallTickets` and
// `examcellApi.generateHallTickets` on the client pointed at the two removed
// routes and were replaced with the X-04 surface.


// ─────────────────────────────────────────────────────────────
// X-05 — Evaluations
// ─────────────────────────────────────────────────────────────
export async function listEvaluations(institutionId: string) {
  const evaluations = await prisma.evaluation.findMany({
    where: { examSlot: { exam: { institutionId } } },
    include: {
      examSlot: { include: { exam: true, offering: { include: { course: true } } } },
      subjectOffering: { include: { course: true } },
      papers: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const gradingDeadline = await prisma.gradingDeadline.findFirst({
    where: { exam: { institutionId } },
    orderBy: { dueAt: 'asc' },
  });

  return {
    deadline: gradingDeadline?.dueAt ?? null,
    evaluations: evaluations.map((e) => ({
      id: e.id,
      examName: e.examSlot.exam.name,
      course: e.subjectOffering.course.name,
      courseCode: e.subjectOffering.course.code,
      totalPapers: e.totalPapers,
      completedPapers: e.completedPapers,
      inProgressPapers: e.inProgressPapers,
      pendingPapers: e.totalPapers - e.completedPapers - e.inProgressPapers,
      evaluatorUserId: e.evaluatorUserId,
      status: e.status,
    })),
  };
}

export async function assignEvaluator(
  institutionId: string,
  userId: string,
  evaluationId: string,
  evaluatorUserId: string,
) {
  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, examSlot: { exam: { institutionId } } },
  });
  if (!evaluation) throw notFound('Evaluation not found');

  // Verify evaluator is a teacher/HOD
  const evaluator = await prisma.userRole.findFirst({
    where: { userId: evaluatorUserId, role: { in: ['TEACHER', 'HOD'] } },
  });
  if (!evaluator) throw badRequest('Evaluator must be a teacher or HOD');

  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      evaluatorUserId,
      status: evaluation.status === 'PENDING' ? 'IN_PROGRESS' : evaluation.status,
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'EVALUATOR_ASSIGNED', entityType: 'Evaluation', entityId: evaluationId });
  return updated;
}

export async function completeEvaluation(
  institutionId: string,
  userId: string,
  evaluationId: string,
) {
  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, examSlot: { exam: { institutionId } } },
  });
  if (!evaluation) throw notFound('Evaluation not found');

  const updated = await prisma.evaluation.update({
    where: { id: evaluationId },
    data: {
      status: 'COMPLETED',
      completedPapers: evaluation.totalPapers,
      inProgressPapers: 0,
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'EVALUATION_COMPLETED', entityType: 'Evaluation', entityId: evaluationId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// X-06 — Results
// ─────────────────────────────────────────────────────────────
export async function listResults(institutionId: string) {
  const exams = await prisma.exam.findMany({
    where: { institutionId },
    include: {
      examSlots: {
      include: {
        results: true,
        offering: { include: { course: true, enrollments: { include: { studentProfile: true } } } },
      },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const pendingPublish: any[] = [];
  const published: any[] = [];

  for (const exam of exams) {
    for (const slot of exam.examSlots) {
      const totalResults = slot.results.length;
      const publishedCount = slot.results.filter((r) => r.publishedAt !== null).length;

      if (publishedCount === totalResults && totalResults > 0) {
        published.push({
          examId: exam.id,
          examName: exam.name,
          slotId: slot.id,
          course: slot.offering.course.name,
          courseCode: slot.offering.course.code,
          totalStudents: totalResults,
          publishedCount,
          passRate: totalResults > 0
            ? Math.round((slot.results.filter((r) => r.isPass).length / totalResults) * 100)
            : 0,
          publishedAt: slot.results[0]?.publishedAt,
        });
      } else if (totalResults > 0) {
        pendingPublish.push({
          examId: exam.id,
          examName: exam.name,
          slotId: slot.id,
          course: slot.offering.course.name,
          courseCode: slot.offering.course.code,
          totalStudents: totalResults,
          graded: publishedCount,
          publishedCount,
        });
      }
    }
  }

  // Re-evaluation requests
  const reevalRequests = await prisma.reEvaluationRequest.findMany({
    where: { result: { examSlot: { exam: { institutionId } } } },
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
      result: { include: { examSlot: { include: { offering: { include: { course: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    pendingPublish,
    published,
    reevalRequests: reevalRequests.map((r) => ({
      id: r.id,
      studentName: r.studentProfile.user.fullName,
      rollNo: r.studentProfile.rollNo,
      course: r.result.examSlot.offering.course.name,
      courseCode: r.result.examSlot.offering.course.code,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}

export async function enterResult(
  institutionId: string,
  userId: string,
  body: { studentProfileId: string; examSlotId: string; marksObtained: number; maxMarks: number; grade: string; isPass: boolean },
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: body.examSlotId, exam: { institutionId } },
  });
  if (!slot) throw notFound('Exam slot not found');

  const student = await prisma.studentProfile.findFirst({ where: { id: body.studentProfileId } });
  if (!student) throw notFound('Student not found');

  const existing = await prisma.result.findFirst({
    where: { examSlotId: body.examSlotId, studentProfileId: body.studentProfileId },
  });

  if (existing) {
    const updated = await prisma.result.update({
      where: { id: existing.id },
      data: {
        marksObtained: body.marksObtained,
        maxMarks: body.maxMarks,
        grade: body.grade,
        isPass: body.isPass,
      },
    });
    return updated;
  }

  const result = await prisma.result.create({
    data: {
      examSlotId: body.examSlotId,
      studentProfileId: body.studentProfileId,
      marksObtained: body.marksObtained,
      maxMarks: body.maxMarks,
      grade: body.grade,
      isPass: body.isPass,
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'RESULT_ENTERED', entityType: 'Result', entityId: result.id });
  return result;
}

export async function publishResults(
  institutionId: string,
  userId: string,
  examSlotId: string,
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: examSlotId, exam: { institutionId } },
  });
  if (!slot) throw notFound('Exam slot not found');

  // Check exam allows publishing (COMPLETED or ONGOING)
  const exam = await prisma.exam.findFirst({ where: { id: slot.examId } });
  if (!exam) throw notFound('Exam not found');
  if (exam.status === 'SCHEDULED') throw badRequest('Cannot publish results for an exam that hasn\'t started');

  const res = await prisma.result.updateMany({
    where: { examSlotId, publishedAt: null },
    data: { publishedAt: new Date(), publishedByUserId: userId },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'RESULTS_PUBLISHED', entityType: 'Result', entityId: examSlotId });
  return { published: res.count };
}

// ─────────────────────────────────────────────────────────────
// X-07 — Re-evaluation
// ─────────────────────────────────────────────────────────────
export async function decideReevaluation(
  institutionId: string,
  userId: string,
  reevalId: string,
  decision: string,
) {
  const request = await prisma.reEvaluationRequest.findFirst({
    where: { id: reevalId, result: { examSlot: { exam: { institutionId } } } },
  });
  if (!request) throw notFound('Re-evaluation request not found');
  if (request.status !== 'REQUESTED' && request.status !== 'APPROVED') {
    throw badRequest('This request has already been decided');
  }

  const updated = await prisma.reEvaluationRequest.update({
    where: { id: reevalId },
    data: {
      status: decision,
      decidedByUserId: userId,
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: `REVAL_${decision}`, entityType: 'ReEvaluationRequest', entityId: reevalId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// X-08 — Cheating cases
// ─────────────────────────────────────────────────────────────
export async function listCheatingCases(institutionId: string) {
  const cases = await prisma.cheatingCase.findMany({
    where: { examSlot: { exam: { institutionId } } },
    include: {
      studentProfile: { include: { user: { select: { fullName: true } } } },
      examSlot: { include: { offering: { include: { course: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return cases.map((c) => ({
    id: c.id,
    studentName: c.studentProfile.user.fullName,
    rollNo: c.studentProfile.rollNo,
    course: c.examSlot.offering.course.name,
    courseCode: c.examSlot.offering.course.code,
    issue: c.issue,
    riskLevel: c.riskLevel,
    evidence: c.evidenceJson ? JSON.parse(c.evidenceJson) : null,
    source: c.source,
    status: c.status,
    createdAt: c.createdAt,
  }));
}

export async function decideCheatingCase(
  institutionId: string,
  userId: string,
  caseId: string,
  decision: string,
) {
  const cheatingCase = await prisma.cheatingCase.findFirst({
    where: { id: caseId, examSlot: { exam: { institutionId } } },
  });
  if (!cheatingCase) throw notFound('Cheating case not found');
  if (cheatingCase.status !== 'UNDER_REVIEW') {
    throw badRequest('This case has already been decided');
  }

  const updated = await prisma.cheatingCase.update({
    where: { id: caseId },
    data: {
      status: decision,
      reviewedByUserId: userId,
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: `CHEATING_${decision}`, entityType: 'CheatingCase', entityId: caseId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// X-09 — Notifications + profile
// ─────────────────────────────────────────────────────────────
export async function listNotifications(userId: string, institutionId: string) {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientUserId: userId, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { recipientUserId: userId, institutionId, readAt: null } }),
  ]);
  return {
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
  };
}

export async function markAllRead(userId: string, institutionId: string) {
  const res = await prisma.notification.updateMany({
    where: { recipientUserId: userId, institutionId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: res.count };
}

export async function createBroadcast(
  institutionId: string,
  _senderUserId: string,
  body: { audience: string; title: string; body: string },
) {
  let recipientIds: string[] = [];

  if (body.audience === 'ALL_STUDENTS') {
    const students = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'SEM_STUDENTS') {
    const students = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null }, currentSemester: { gte: 3 } },
      select: { userId: true },
    });
    recipientIds = students.map((s) => s.userId);
  } else if (body.audience === 'FINAL_YEAR') {
    const students = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null }, currentSemester: { gte: 7 } },
      select: { userId: true },
    });
    recipientIds = students.map((s) => s.userId);
  }

  if (recipientIds.length === 0) {
    // Fall back to all students if no specific audience matches
    const allStudents = await prisma.studentProfile.findMany({
      where: { user: { institutionId, deletedAt: null } },
      select: { userId: true },
    });
    recipientIds = allStudents.map((s) => s.userId);
  }

  if (recipientIds.length === 0) return { created: 0 };

  await prisma.notification.createMany({
    data: recipientIds.map((id) => ({
      recipientUserId: id,
      institutionId,
      type: 'EXAM_CELL_BROADCAST',
      title: body.title,
      body: body.body,
    })),
  });

  return { created: recipientIds.length };
}

export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: {
      roles: true,
      staffProfile: { select: { designation: true, employeeNo: true } },
    },
  });
  if (!user) throw notFound('User not found');

  const [totalExams, totalHallTickets, totalResults, totalCheatingCases] = await Promise.all([
    prisma.exam.count({ where: { institutionId, createdByUserId: userId } }),
    prisma.hallTicket.count({ where: { examSlot: { exam: { institutionId } } } }),
    prisma.result.count({ where: { examSlot: { exam: { institutionId } } } }),
    prisma.cheatingCase.count({ where: { examSlot: { exam: { institutionId } } } }),
  ]);

  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    roles: user.roles.map((r) => r.role),
    designation: user.staffProfile?.designation,
    employeeNo: user.staffProfile?.employeeNo,
    stats: {
      totalExams,
      totalHallTickets,
      totalResults,
      totalCheatingCases,
    },
  };
}
