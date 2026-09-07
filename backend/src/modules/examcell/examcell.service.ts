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
// X-02 — Exam schedule (timetable)
// ─────────────────────────────────────────────────────────────
export async function listExams(institutionId: string) {
  const exams = await prisma.exam.findMany({
    where: { institutionId },
    include: {
      examSlots: {
        include: { offering: { include: { course: true } } },
        orderBy: { date: 'asc' },
      },
      examConflicts: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return exams.map((e) => ({
    id: e.id,
    name: e.name,
    semester: e.semester,
    type: e.type,
    status: e.status,
    slotsCount: e.examSlots.length,
    conflicts: e.examConflicts.length,
    createdAt: e.createdAt,
    slots: e.examSlots.map((s) => ({
      id: s.id,
      course: s.offering.course.name,
      courseCode: s.offering.course.code,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      seats: s.seats,
      status: s.status,
    })),
  }));
}

export async function createExam(
  institutionId: string,
  userId: string,
  body: { semester: number; type: string; name: string },
) {
  const ay = await prisma.academicYear.findFirst({ where: { institutionId, isCurrent: true } });
  if (!ay) throw badRequest('No active academic year');

  // Check duplicate
  const existing = await prisma.exam.findFirst({
    where: { institutionId, semester: body.semester, type: body.type, name: body.name },
  });
  if (existing) throw badRequest('An exam with this name and type already exists for this semester');

  const exam = await prisma.exam.create({
    data: {
      institutionId,
      academicYearId: ay.id,
      semester: body.semester,
      type: body.type,
      name: body.name,
      createdByUserId: userId,
      status: 'SCHEDULED',
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'EXAM_CREATED', entityType: 'Exam', entityId: exam.id });
  return exam;
}

export async function addExamSlot(
  institutionId: string,
  userId: string,
  examId: string,
  body: { offeringId: string; date: string; startTime: string; endTime: string; room?: string; seats: number },
) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId } });
  if (!exam) throw notFound('Exam not found');

  const offering = await prisma.courseOffering.findFirst({ where: { id: body.offeringId } });
  if (!offering) throw notFound('Course offering not found');

  // Conflict detection: same offering in same time window
  const conflictSlot = await prisma.examSlot.findFirst({
    where: {
      examId,
      offeringId: body.offeringId,
      date: new Date(body.date),
      startTime: body.startTime,
    },
  });
  if (conflictSlot) throw badRequest('A slot already exists for this offering at the same date/time');

  // Room conflict check (same room, same date, overlapping time)
  if (body.room) {
    const roomConflict = await prisma.examSlot.findFirst({
      where: {
        exam: { institutionId },
        room: body.room,
        date: new Date(body.date),
        startTime: { lte: body.endTime },
        endTime: { gte: body.startTime },
      },
    });
    if (roomConflict) throw badRequest(`Room ${body.room} is already allocated for another exam at this time`);
  }

  const slot = await prisma.examSlot.create({
    data: {
      examId,
      offeringId: body.offeringId,
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      room: body.room,
      seats: body.seats,
      status: 'SCHEDULED',
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'EXAM_SLOT_ADDED', entityType: 'ExamSlot', entityId: slot.id });
  return slot;
}

export async function rescheduleSlot(
  institutionId: string,
  userId: string,
  slotId: string,
  body: { date: string; startTime: string; endTime: string; room?: string },
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
  });
  if (!slot) throw notFound('Exam slot not found');

  const updated = await prisma.examSlot.update({
    where: { id: slotId },
    data: {
      date: new Date(body.date),
      startTime: body.startTime,
      endTime: body.endTime,
      room: body.room ?? slot.room,
      status: 'RESCHEDULED',
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'EXAM_SLOT_RESCHEDULED', entityType: 'ExamSlot', entityId: slotId });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// X-03 — Room allocations + invigilator duty
// ─────────────────────────────────────────────────────────────
export async function listRoomAllocations(institutionId: string, slotId: string) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
    include: {
      roomAllocations: true,
    },
  });
  if (!slot) throw notFound('Exam slot not found');

  return {
    slotId: slot.id,
    room: slot.room,
    seats: slot.seats,
    allocations: slot.roomAllocations.map((a) => ({
      id: a.id,
      roomId: a.roomId,
      invigilatorUserId: a.invigilatorUserId,
    })),
  };
}

export async function allocateRoom(
  institutionId: string,
  userId: string,
  slotId: string,
  body: { roomId: string; invigilatorUserId?: string },
) {
  const slot = await prisma.examSlot.findFirst({
    where: { id: slotId, exam: { institutionId } },
  });
  if (!slot) throw notFound('Exam slot not found');

  const existing = await prisma.examRoomAllocation.findFirst({
    where: { examSlotId: slotId, roomId: body.roomId },
  });
  if (existing) throw badRequest('Room already allocated for this slot');

  const allocation = await prisma.examRoomAllocation.create({
    data: {
      examSlotId: slotId,
      roomId: body.roomId,
      invigilatorUserId: body.invigilatorUserId,
    },
  });

  await writeAudit({ institutionId, actorUserId: userId, action: 'ROOM_ALLOCATED', entityType: 'ExamRoomAllocation', entityId: allocation.id });
  return allocation;
}

// ─────────────────────────────────────────────────────────────
// X-04 — Hall tickets
// ─────────────────────────────────────────────────────────────
export async function listHallTickets(institutionId: string, examId: string) {
  const tickets = await prisma.hallTicket.findMany({
    where: { examSlot: { exam: { id: examId, institutionId } } },
    include: {
      studentProfile: { include: { user: { select: { fullName: true, email: true } } } },
      examSlot: { include: { offering: { include: { course: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: tickets.length,
    generated: tickets.filter((t) => t.status === 'GENERATED').length,
    downloaded: tickets.filter((t) => t.status === 'DOWNLOADED').length,
  };

  return {
    stats,
    tickets: tickets.map((t) => ({
      id: t.id,
      studentName: t.studentProfile.user.fullName,
      rollNo: t.studentProfile.rollNo,
      seatNo: t.seatNo,
      course: t.examSlot.offering.course.name,
      courseCode: t.examSlot.offering.course.code,
      date: t.examSlot.date,
      startTime: t.examSlot.startTime,
      room: t.examSlot.room,
      status: t.status,
      generatedAt: t.generatedAt,
    })),
  };
}

export async function generateHallTickets(
  institutionId: string,
  userId: string,
  examId: string,
) {
  const exam = await prisma.exam.findFirst({ where: { id: examId, institutionId } });
  if (!exam) throw notFound('Exam not found');

  const slots = await prisma.examSlot.findMany({
    where: { examId },
    include: { offering: { include: { enrollments: { include: { studentProfile: true } } } } },
  });

  let generated = 0;
  for (const slot of slots) {
    const enrolled = slot.offering.enrollments.filter((e) => e.status === 'ACTIVE');
    let seatCounter = 1;

    for (const enrollment of enrolled) {
      const existing = await prisma.hallTicket.findFirst({
        where: { examSlotId: slot.id, studentProfileId: enrollment.studentProfileId },
      });
      if (!existing) {
        const seatNo = `A-${seatCounter}`;
        await prisma.hallTicket.create({
          data: {
            examSlotId: slot.id,
            studentProfileId: enrollment.studentProfileId,
            seatNo,
            qrPayload: JSON.stringify({ slotId: slot.id, seat: seatNo }),
            status: 'GENERATED',
          },
        });
        generated++;
        seatCounter++;
      }
    }
  }

  await writeAudit({ institutionId, actorUserId: userId, action: 'HALL_TICKETS_GENERATED', entityType: 'HallTicket', entityId: examId });
  return { generated, totalSlots: slots.length };
}

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
