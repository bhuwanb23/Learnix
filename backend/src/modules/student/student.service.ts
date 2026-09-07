import { prisma } from '../../db/prisma.js';
import { notFound, conflict } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

// ── Helper: resolve student profile ────────────────────────
async function requireStudent(userId: string, institutionId: string) {
  const profile = await prisma.studentProfile.findFirst({
    where: { userId, institutionId, user: { deletedAt: null } },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      program: { select: { id: true, name: true, code: true } },
      batch: { select: { id: true, name: true } },
    },
  });
  if (!profile) throw notFound('Student profile not found');
  return profile;
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── S-01 Dashboard ─────────────────────────────────────────
export async function getDashboard(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  // Enrolled offerings
  const enrollments = await prisma.enrollment.findMany({
    where: { studentProfileId: student.id, status: 'ACTIVE' },
    include: {
      offering: {
        include: {
          course: { select: { code: true, name: true } },
          section: { select: { name: true } },
        },
      },
    },
  });
  const offeringIds = enrollments.map(e => e.offering.id);

  // Attendance
  const sessions = await prisma.attendanceSession.findMany({
    where: { offeringId: { in: offeringIds } },
    select: { records: { select: { studentProfileId: true, state: true } } },
  });
  const myRecords = sessions.flatMap(s => s.records.filter(r => r.studentProfileId === student.id));
  const present = myRecords.filter(r => r.state === 'PRESENT' || r.state === 'LATE').length;
  const attendancePct = myRecords.length === 0 ? 0 : Math.round((present / myRecords.length) * 100);

  // Today's schedule
  const dayOfWeek = new Date().getDay();
  const todaySlots = await prisma.offeringScheduleSlot.findMany({
    where: { offeringId: { in: offeringIds }, dayOfWeek },
    include: { offering: { select: { course: { select: { name: true } }, teacherUserId: true } } },
    orderBy: { startTime: 'asc' },
  });

  // Pending assignments
  const pendingAssignments = await prisma.assignment.count({
    where: { offeringId: { in: offeringIds }, status: 'PUBLISHED' },
  });

  // Notifications
  const unreadCount = await prisma.notification.count({
    where: { recipientUserId: userId, institutionId, readAt: null },
  });

  // Recent notifications
  const recentNotifications = await prisma.notification.findMany({
    where: { recipientUserId: userId, institutionId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    user: {
      name: student.user.fullName,
      semester: `Semester ${student.currentSemester ?? ''}`,
      program: student.program?.name ?? '',
      avatar: '',
    },
    attendance: {
      overallPct: attendancePct,
      totalSessions: myRecords.length,
      present,
      absent: myRecords.filter(r => r.state === 'ABSENT').length,
      late: myRecords.filter(r => r.state === 'LATE').length,
    },
    schedule: todaySlots.map(s => ({
      id: s.id,
      subject: s.offering.course.name,
      time: `${s.startTime} - ${s.endTime}`,
      room: s.room || 'TBA',
      status: 'upcoming',
    })),
    pendingWork: {
      assignments: pendingAssignments,
      quizzes: 0,
    },
    notifications: recentNotifications.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      time: timeAgo(n.createdAt),
      unread: n.readAt === null,
    })),
    unreadNotifications: unreadCount,
  };
}

// ── S-02 My Classes ────────────────────────────────────────
export async function listClasses(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentProfileId: student.id, status: 'ACTIVE' },
    include: {
      offering: {
        include: {
          course: { select: { id: true, code: true, name: true, credits: true, semester: true } },
          section: { select: { name: true } },
          teacherUser: { select: { fullName: true } },
          scheduleSlots: { select: { dayOfWeek: true, startTime: true, endTime: true, room: true } },
          _count: { select: { assignments: true, quizzes: true } },
        },
      },
    },
  });

  return enrollments.map(e => {
    const o = e.offering;
    const slots = o.scheduleSlots;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const schedule = slots.map(s => `${dayNames[s.dayOfWeek]} ${s.startTime}`).join(', ');

    return {
      id: o.id,
      courseCode: o.course.code,
      courseName: o.course.name,
      credits: o.course.credits,
      section: o.section.name,
      teacher: o.teacherUser?.fullName || 'TBA',
      schedule,
      assignmentCount: o._count.assignments,
      quizCount: o._count.quizzes,
    };
  });
}

// ── S-03 Syllabus Tracker ──────────────────────────────────
export async function getSyllabus(userId: string, institutionId: string, offeringId: string) {
  const student = await requireStudent(userId, institutionId);

  // Verify enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentProfileId_offeringId: { studentProfileId: student.id, offeringId } },
  });
  if (!enrollment) throw notFound('Not enrolled in this offering');

  const offering = await prisma.courseOffering.findUnique({ where: { id: offeringId } });
  if (!offering) throw notFound('Offering not found');

  const version = await prisma.syllabusVersion.findFirst({
    where: { courseId: offering.courseId, status: { in: ['HOD_APPROVED', 'ADMIN_APPROVED', 'SUBMITTED'] } },
    orderBy: { version: 'desc' },
    include: {
      units: {
        include: { topics: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!version) return { version: null, units: [], progressPct: 0 };

  const allTopics = version.units.flatMap(u => u.topics);
  const completed = allTopics.filter(t => t.status === 'COMPLETED').length;
  const progressPct = allTopics.length === 0 ? 0 : Math.round((completed / allTopics.length) * 100);

  return {
    version: { id: version.id, version: version.version, status: version.status },
    units: version.units.map(u => ({
      id: u.id,
      title: u.title,
      order: u.order,
      topics: u.topics.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        order: t.order,
      })),
    })),
    progressPct,
    totalTopics: allTopics.length,
    completedTopics: completed,
  };
}

// ── S-04 Lecture Notes ─────────────────────────────────────
export async function listLectureNotes(userId: string, institutionId: string, offeringId: string) {
  const student = await requireStudent(userId, institutionId);

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentProfileId_offeringId: { studentProfileId: student.id, offeringId } },
  });
  if (!enrollment) throw notFound('Not enrolled');

  const notes = await prisma.lectureNote.findMany({
    where: { offeringId, status: 'PUBLISHED' },
    orderBy: [{ unitTitle: 'asc' }, { createdAt: 'desc' }],
  });

  // Group by unit
  const unitMap = new Map<string, { unitTitle: string; notes: typeof notes }>();
  for (const note of notes) {
    const key = note.unitTitle;
    if (!unitMap.has(key)) unitMap.set(key, { unitTitle: key, notes: [] });
    unitMap.get(key)!.notes.push(note);
  }

  return {
    units: [...unitMap.values()].map(u => ({
      unitTitle: u.unitTitle,
      notes: u.notes.map(n => ({
        id: n.id,
        title: n.title,
        topicTitle: n.topicTitle,
        publishedAt: n.publishedAt,
      })),
    })),
  };
}

export async function getLectureNote(userId: string, institutionId: string, noteId: string) {
  await requireStudent(userId, institutionId);

  const note = await prisma.lectureNote.findUnique({
    where: { id: noteId },
    include: {
      offering: { select: { course: { select: { code: true, name: true } } } },
      attachments: true,
    },
  });
  if (!note) throw notFound('Note not found');
  if (note.status !== 'PUBLISHED') throw notFound('Note not published');

  return {
    id: note.id,
    title: note.title,
    unitTitle: note.unitTitle,
    topicTitle: note.topicTitle,
    bodyJson: note.bodyJson,
    publishedAt: note.publishedAt,
    courseCode: note.offering.course.code,
    courseName: note.offering.course.name,
    attachments: note.attachments.map(a => ({ id: a.id, fileId: a.fileId })),
  };
}

// ── S-05 Practice Quizzes ──────────────────────────────────
export async function listQuizzes(userId: string, institutionId: string, offeringId: string) {
  const student = await requireStudent(userId, institutionId);

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentProfileId_offeringId: { studentProfileId: student.id, offeringId } },
  });
  if (!enrollment) throw notFound('Not enrolled');

  const quizzes = await prisma.quiz.findMany({
    where: { offeringId, status: 'PUBLISHED' },
    include: {
      _count: { select: { questions: true, attempts: true } },
      attempts: { where: { studentProfileId: student.id }, select: { id: true, status: true, scoreMarks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return quizzes.map(q => ({
    id: q.id,
    title: q.title,
    durationMin: q.durationMin,
    difficulty: q.difficulty,
    questionCount: q._count.questions,
    attemptCount: q._count.attempts,
    myAttempts: q.attempts.length,
    myBestScore: q.attempts.filter(a => a.status === 'AUTO_GRADED').reduce((best, a) => Math.max(best, a.scoreMarks ?? 0), null as number | null),
  }));
}

export async function startQuizAttempt(userId: string, institutionId: string, quizId: string) {
  const student = await requireStudent(userId, institutionId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!quiz) throw notFound('Quiz not found');
  if (quiz.status !== 'PUBLISHED') throw conflict('Quiz not available');

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentProfileId_offeringId: { studentProfileId: student.id, offeringId: quiz.offeringId } },
  });
  if (!enrollment) throw notFound('Not enrolled in this course');

  // Check retake policy
  if (!quiz.allowRetake) {
    const existing = await prisma.quizAttempt.findFirst({
      where: { quizId, studentProfileId: student.id, status: { not: 'IN_PROGRESS' } },
    });
    if (existing) throw conflict('Quiz already completed, retakes not allowed');
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentProfileId: student.id,
      status: 'IN_PROGRESS',
    },
  });

  return {
    attemptId: attempt.id,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      durationMin: quiz.durationMin,
      questions: quiz.questions.map(q => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        optionsJson: q.optionsJson,
        marks: q.marks,
        order: q.order,
      })),
    },
  };
}

export async function submitQuizAnswer(userId: string, body: {
  attemptId: string; questionId: string; answerJson: string;
}) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: body.attemptId } });
  if (!attempt) throw notFound('Attempt not found');
  if (attempt.studentProfileId !== (await requireStudent(userId, '')).id) throw notFound('Not your attempt');
  if (attempt.status !== 'IN_PROGRESS') throw conflict('Attempt already submitted');

  const question = await prisma.question.findUnique({ where: { id: body.questionId } });
  if (!question || question.quizId !== attempt.quizId) throw notFound('Question not found');

  const isCorrect = body.answerJson === question.correctAnswer;

  await prisma.quizAnswer.upsert({
    where: { attemptId_questionId: { attemptId: body.attemptId, questionId: body.questionId } },
    update: { answerJson: body.answerJson, isCorrect, marksAwarded: isCorrect ? question.marks : 0 },
    create: {
      attemptId: body.attemptId,
      questionId: body.questionId,
      answerJson: body.answerJson,
      isCorrect,
      marksAwarded: isCorrect ? question.marks : 0,
    },
  });

  return { saved: true };
}

export async function submitQuizAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { include: { questions: true } }, answers: true },
  });
  if (!attempt) throw notFound('Attempt not found');
  if (attempt.status !== 'IN_PROGRESS') throw conflict('Already submitted');

  const totalMarks = attempt.quiz.questions.reduce((s, q) => s + q.marks, 0);
  const earnedMarks = attempt.answers.reduce((s, a) => s + (a.marksAwarded ?? 0), 0);

  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'AUTO_GRADED',
      submittedAt: new Date(),
      scoreMarks: earnedMarks,
    },
  });

  return {
    id: updated.id,
    score: earnedMarks,
    total: totalMarks,
    percentage: totalMarks === 0 ? 0 : Math.round((earnedMarks / totalMarks) * 100),
  };
}

// ── S-06 Assignments ───────────────────────────────────────
export async function listAssignments(userId: string, institutionId: string, tab?: string) {
  const student = await requireStudent(userId, institutionId);
  const offeringIds = (await prisma.enrollment.findMany({
    where: { studentProfileId: student.id, status: 'ACTIVE' },
    select: { offeringId: true },
  })).map(e => e.offeringId);

  const where: Record<string, unknown> = { offeringId: { in: offeringIds } };
  if (tab === 'active') where.status = 'PUBLISHED';
  if (tab === 'completed') where.submissions = { some: { studentProfileId: student.id, status: 'GRADED' } };

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      offering: { select: { course: { select: { code: true, name: true } } } },
      submissions: { where: { studentProfileId: student.id }, select: { id: true, status: true, gradeMarks: true, feedback: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { dueAt: 'asc' },
  });

  return assignments.map(a => {
    const mySubmission = a.submissions[0];
    return {
      id: a.id,
      title: a.title,
      instructions: a.instructions,
      courseCode: a.offering.course.code,
      courseName: a.offering.course.name,
      dueAt: a.dueAt,
      maxMarks: a.maxMarks,
      status: a.status,
      submissionCount: a._count.submissions,
      mySubmission: mySubmission ? {
        id: mySubmission.id,
        status: mySubmission.status,
        gradeMarks: mySubmission.gradeMarks,
        feedback: mySubmission.feedback,
      } : null,
    };
  });
}

export async function getAssignmentDetail(userId: string, institutionId: string, assignmentId: string) {
  const student = await requireStudent(userId, institutionId);

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      offering: { select: { course: { select: { code: true, name: true } }, teacherUser: { select: { fullName: true } } } },
      rubricCriteria: { orderBy: { order: 'asc' } },
      submissions: { where: { studentProfileId: student.id } },
    },
  });
  if (!assignment) throw notFound('Assignment not found');

  const mySubmission = assignment.submissions[0];

  return {
    id: assignment.id,
    title: assignment.title,
    instructions: assignment.instructions,
    courseCode: assignment.offering.course.code,
    courseName: assignment.offering.course.name,
    teacher: assignment.offering.teacherUser?.fullName || 'TBA',
    dueAt: assignment.dueAt,
    maxMarks: assignment.maxMarks,
    weightage: assignment.weightage,
    status: assignment.status,
    rubric: assignment.rubricCriteria.map(r => ({
      id: r.id, title: r.title, maxMarks: r.maxMarks, order: r.order,
    })),
    mySubmission: mySubmission ? {
      id: mySubmission.id,
      text: mySubmission.text,
      status: mySubmission.status,
      gradeMarks: mySubmission.gradeMarks,
      feedback: mySubmission.feedback,
      submittedAt: mySubmission.submittedAt,
    } : null,
  };
}

export async function submitAssignment(userId: string, institutionId: string, assignmentId: string, body: {
  text?: string; fileId?: string;
}) {
  const student = await requireStudent(userId, institutionId);

  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw notFound('Assignment not found');
  if (assignment.status !== 'PUBLISHED') throw conflict('Assignment not accepting submissions');

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentProfileId_offeringId: { studentProfileId: student.id, offeringId: assignment.offeringId } },
  });
  if (!enrollment) throw notFound('Not enrolled');

  const existing = await prisma.submission.findUnique({
    where: { assignmentId_studentProfileId: { assignmentId, studentProfileId: student.id } },
  });
  if (existing && (existing.status === 'GRADED' || existing.status === 'RETURNED')) {
    throw conflict('Already graded, cannot resubmit');
  }

  const submission = await prisma.submission.upsert({
    where: { assignmentId_studentProfileId: { assignmentId, studentProfileId: student.id } },
    update: {
      text: body.text,
      fileId: body.fileId,
      submittedAt: new Date(),
      status: 'UNDER_REVIEW',
    },
    create: {
      assignmentId,
      studentProfileId: student.id,
      text: body.text,
      fileId: body.fileId,
      submittedAt: new Date(),
      status: 'UNDER_REVIEW',
    },
  });

  return { id: submission.id, status: submission.status };
}

// ── S-07 Timetable ─────────────────────────────────────────
export async function getTimetable(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const offeringIds = (await prisma.enrollment.findMany({
    where: { studentProfileId: student.id, status: 'ACTIVE' },
    select: { offeringId: true },
  })).map(e => e.offeringId);

  const slots = await prisma.offeringScheduleSlot.findMany({
    where: { offeringId: { in: offeringIds } },
    include: { offering: { select: { course: { select: { code: true, name: true } }, teacherUser: { select: { fullName: true } } } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = new Map<number, typeof slots>();
  for (const slot of slots) {
    const existing = byDay.get(slot.dayOfWeek) || [];
    existing.push(slot);
    byDay.set(slot.dayOfWeek, existing);
  }

  return [1, 2, 3, 4, 5].map(d => ({
    day: dayNames[d],
    dayOfWeek: d,
    slots: (byDay.get(d) || []).map(s => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      courseCode: s.offering.course.code,
      courseName: s.offering.course.name,
      teacher: s.offering.teacherUser?.fullName || 'TBA',
      room: s.room || 'TBA',
    })),
  }));
}

// ── S-08 Exam Schedule + Hall Ticket ───────────────────────
export async function getExamSchedule(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const offeringIds = (await prisma.enrollment.findMany({
    where: { studentProfileId: student.id, status: 'ACTIVE' },
    select: { offeringId: true },
  })).map(e => e.offeringId);

  const examSlots = await prisma.examSlot.findMany({
    where: { offeringId: { in: offeringIds } },
    include: {
      exam: { select: { id: true, name: true, type: true, semester: true, status: true } },
      offering: { select: { course: { select: { code: true, name: true } } } },
      hallTickets: { where: { studentProfileId: student.id } },
    },
    orderBy: { date: 'asc' },
  });

  return examSlots.map(slot => ({
    id: slot.id,
    examName: slot.exam.name,
    examType: slot.exam.type,
    examStatus: slot.exam.status,
    courseCode: slot.offering.course.code,
    courseName: slot.offering.course.name,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room,
    hallTicket: slot.hallTickets[0] ? {
      id: slot.hallTickets[0].id,
      seatNo: slot.hallTickets[0].seatNo,
      qrPayload: slot.hallTickets[0].qrPayload,
      status: slot.hallTickets[0].status,
    } : null,
  }));
}

// ── S-09 Results + Re-evaluation ───────────────────────────
export async function getResults(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const results = await prisma.result.findMany({
    where: { studentProfileId: student.id },
    include: {
      examSlot: {
        include: {
          exam: { select: { name: true, type: true } },
          offering: { select: { course: { select: { code: true, name: true } } } },
        },
      },
      reEvaluations: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return results.map(r => ({
    id: r.id,
    examName: r.examSlot.exam.name,
    examType: r.examSlot.exam.type,
    courseCode: r.examSlot.offering.course.code,
    courseName: r.examSlot.offering.course.name,
    marksObtained: r.marksObtained,
    maxMarks: r.maxMarks,
    grade: r.grade,
    isPass: r.isPass,
    publishedAt: r.publishedAt,
    hasReEvaluation: r.reEvaluations.length > 0,
  }));
}

export async function requestReevaluation(userId: string, institutionId: string, body: {
  resultId: string; reason: string;
}) {
  const student = await requireStudent(userId, institutionId);

  const result = await prisma.result.findUnique({ where: { id: body.resultId } });
  if (!result) throw notFound('Result not found');
  if (result.studentProfileId !== student.id) throw notFound('Not your result');

  const existing = await prisma.reEvaluationRequest.findFirst({
    where: { resultId: body.resultId, studentProfileId: student.id, status: { not: 'REJECTED' } },
  });
  if (existing) throw conflict('Re-evaluation already requested');

  const request = await prisma.reEvaluationRequest.create({
    data: {
      resultId: body.resultId,
      studentProfileId: student.id,
      reason: body.reason,
      status: 'REQUESTED',
    },
  });

  return { id: request.id, status: request.status };
}

// ── S-10 Attendance Detail ─────────────────────────────────
export async function getAttendanceDetail(userId: string, institutionId: string, offeringId: string) {
  const student = await requireStudent(userId, institutionId);

  const sessions = await prisma.attendanceSession.findMany({
    where: { offeringId },
    include: { records: true },
    orderBy: { date: 'desc' },
  });

  const myRecords = sessions.flatMap(s =>
    s.records.filter(r => r.studentProfileId === student.id).map(r => ({
      date: s.date,
      state: r.state,
      sessionId: s.id,
    }))
  );

  const present = myRecords.filter(r => r.state === 'PRESENT').length;
  const late = myRecords.filter(r => r.state === 'LATE').length;
  const absent = myRecords.filter(r => r.state === 'ABSENT').length;
  const total = myRecords.length;

  return {
    totalSessions: total,
    present,
    late,
    absent,
    percentage: total === 0 ? 0 : Math.round(((present + late) / total) * 100),
    history: myRecords,
  };
}

// ── S-11 Fee Dues ──────────────────────────────────────────
export async function getFeeDues(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const dues = await prisma.feeDue.findMany({
    where: { studentProfileId: student.id },
    include: { payments: true },
    orderBy: { dueDate: 'asc' },
  });

  return dues.map(d => ({
    id: d.id,
    title: d.title,
    amountMinor: d.amountMinor,
    amountRupees: Math.round(d.amountMinor / 100),
    dueDate: d.dueDate,
    status: d.status,
    paidAmount: d.payments.reduce((s, p) => s + (p.status === 'CLEARED' ? p.amountMinor : 0), 0),
    payments: d.payments.map(p => ({
      id: p.id,
      amountMinor: p.amountMinor,
      method: p.method,
      status: p.status,
      paidAt: p.paidAt,
    })),
  }));
}

// ── S-12 Placement ─────────────────────────────────────────
export async function listJobs(userId: string, institutionId: string) {
  await requireStudent(userId, institutionId);

  const jobs = await prisma.job.findMany({
    where: { status: 'OPEN' },
    include: { company: { select: { name: true, sector: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return jobs.map(j => ({
    id: j.id,
    company: j.company.name,
    sector: j.company.sector,
    role: j.role,
    packageMinorPerAnnum: j.packageMinorPerAnnum,
    packageLpa: Math.round(j.packageMinorPerAnnum / 10000000 * 10) / 10,
    location: j.location,
    openings: j.openings,
    deadline: j.deadline,
    description: j.description,
  }));
}

export async function listDrives(userId: string, institutionId: string) {
  await requireStudent(userId, institutionId);

  const drives = await prisma.placementDrive.findMany({
    where: { status: { in: ['SCHEDULED', 'APPROVED'] } },
    include: { company: { select: { name: true } } },
    orderBy: { driveDate: 'asc' },
  });

  return drives.map(d => ({
    id: d.id,
    company: d.company.name,
    title: d.title,
    role: d.role,
    packageMinorPerAnnum: d.packageMinorPerAnnum,
    driveDate: d.driveDate,
    mode: d.mode,
    status: d.status,
  }));
}

export async function applyToJob(userId: string, institutionId: string, body: {
  jobId: string; coverLetter?: string; resumeFileId?: string;
}) {
  const student = await requireStudent(userId, institutionId);

  const existing = await prisma.jobApplication.findFirst({
    where: { jobId: body.jobId, studentProfileId: student.id },
  });
  if (existing) throw conflict('Already applied');

  const application = await prisma.jobApplication.create({
    data: {
      jobId: body.jobId,
      studentProfileId: student.id,
      status: 'APPLIED',
    },
  });

  return { id: application.id, status: application.status };
}

export async function getMyApplications(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const applications = await prisma.jobApplication.findMany({
    where: { studentProfileId: student.id },
    include: {
      job: { include: { company: { select: { name: true } } } },
      drive: { include: { company: { select: { name: true } } } },
      offer: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return applications.map(a => ({
    id: a.id,
    type: a.jobId ? 'job' : 'drive',
    company: a.job?.company?.name || a.drive?.company?.name || '',
    role: a.job?.role || a.drive?.role || '',
    status: a.status,
    appliedAt: a.createdAt,
    offer: a.offer ? {
      ctcMinor: a.offer.ctcMinor,
      status: a.offer.status,
    } : null,
  }));
}

// ── S-13 Events ────────────────────────────────────────────
export async function listEvents(userId: string, institutionId: string) {
  await requireStudent(userId, institutionId);

  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED' },
    include: { _count: { select: { registrations: true } } },
    orderBy: { startDate: 'asc' },
  });

  return events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    startDate: e.startDate,
    endDate: e.endDate,
    venue: e.venue,
    capacity: e.capacity,
    registrationCount: e._count.registrations,
    status: e.status,
  }));
}

export async function registerForEvent(userId: string, institutionId: string, eventId: string) {
  const student = await requireStudent(userId, institutionId);

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw notFound('Event not found');

  const existing = await prisma.eventRegistration.findFirst({
    where: { eventId, studentProfileId: student.id },
  });
  if (existing) throw conflict('Already registered');

  const registration = await prisma.eventRegistration.create({
    data: {
      eventId,
      studentProfileId: student.id,
      status: 'REGISTERED',
    },
  });

  return { id: registration.id, status: registration.status };
}

export async function getMyRegistrations(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const registrations = await prisma.eventRegistration.findMany({
    where: { studentProfileId: student.id },
    include: { event: { select: { title: true, startDate: true, venue: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return registrations.map(r => ({
    id: r.id,
    eventTitle: r.event.title,
    eventDate: r.event.startDate,
    venue: r.event.venue,
    status: r.status,
    registeredAt: r.createdAt,
  }));
}

// ── S-14 Library ───────────────────────────────────────────
export async function getLibraryMyBooks(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const issues = await prisma.bookIssue.findMany({
    where: { studentProfileId: student.id },
    include: { book: { select: { title: true, author: true, isbn: true } } },
    orderBy: { issuedAt: 'desc' },
  });

  return issues.map(i => ({
    id: i.id,
    bookTitle: i.book.title,
    author: i.book.author,
    issuedAt: i.issuedAt,
    dueAt: i.dueAt,
    returnedAt: i.returnedAt,
    status: i.returnedAt ? 'RETURNED' : (i.dueAt < new Date() ? 'OVERDUE' : 'ACTIVE'),
  }));
}

// ── S-15 Hostel ────────────────────────────────────────────
export async function getHostelAllocation(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const allocation = await prisma.hostelAllocation.findFirst({
    where: { studentProfileId: student.id, status: 'ACTIVE' },
    include: {
      bed: {
        include: { room: { include: { block: true } } },
      },
    },
  });

  if (!allocation) return null;

  return {
    id: allocation.id,
    block: allocation.bed?.room?.block?.name || '',
    room: allocation.bed?.room?.roomNumber || '',
    bed: allocation.bed?.bedLabel || '',
    rentPerMonth: allocation.rentPerMonth,
    status: allocation.status,
  };
}

// ── S-16 Transport ─────────────────────────────────────────
export async function getTransportInfo(userId: string, institutionId: string) {
  const student = await requireStudent(userId, institutionId);

  const enrollment = await prisma.routeEnrollment.findFirst({
    where: { studentProfileId: student.id },
    include: {
      route: {
        include: {
          stops: { orderBy: { order: 'asc' } },
        },
      },
    },
  });

  if (!enrollment) return null;

  return {
    routeId: enrollment.route.id,
    routeName: enrollment.route.name,
    stops: enrollment.route.stops.map(s => ({
      id: s.id,
      name: s.stopName,
      time: s.time,
      order: s.order,
    })),
    myStopOrder: enrollment.stopOrder,
  };
}

// ── S-19 Notifications ─────────────────────────────────────
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
    notifications: items.map(n => ({
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

// ── S-20 Profile ───────────────────────────────────────────
export async function getProfile(userId: string, institutionId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, institutionId },
    include: {
      roles: true,
      studentProfile: {
        include: {
          program: { select: { name: true, code: true } },
          batch: { select: { name: true } },
        },
      },
    },
  });
  if (!user) throw notFound('User not found');

  const sp = user.studentProfile;
  if (!sp) throw notFound('Student profile not found');

  // Enrollment count
  const enrollmentCount = await prisma.enrollment.count({
    where: { studentProfileId: sp.id, status: 'ACTIVE' },
  });

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roles: user.roles.map(r => r.role),
    rollNo: sp.rollNo,
    section: sp.section,
    currentSemester: sp.currentSemester,
    program: sp.program?.name || null,
    programCode: sp.program?.code || null,
    batch: sp.batch?.name || null,
    status: sp.status,
    stats: {
      activeEnrollments: enrollmentCount,
    },
  };
}
