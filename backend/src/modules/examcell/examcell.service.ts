import { PrismaClient } from '@prisma/client';

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
// X-05 — Evaluations: MOVED to `./evaluation.service.ts`.
//
// Three functions used to live here and were deleted rather than re-pointed:
//
//   listEvaluations(institutionId)   returned denormalised counters straight
//                                    off the row with no look at the papers —
//                                    the same counters `completeEvaluation`
//                                    fabricated, so the screen and the truth
//                                    agreed only as long as nobody lied.
//   assignEvaluator(…)               checked that the userId had a TEACHER or
//                                    HOD role — with NO institution filter,
//                                    so another college's teacher could be
//                                    allocated to grade our papers.
//   completeEvaluation(…)            set completedPapers = totalPapers and
//                                    status COMPLETED unconditionally, without
//                                    reading a single paper. It was the lie
//                                    the whole module was built on.
//
// Replaced by `evaluation.service.ts`, where completion is DERIVED from the
// rows (an evaluation is COMPLETED exactly when every paper is marked),
// allocation is institution-checked, and every counter is recomputed in the
// same transaction as the write.

// ─────────────────────────────────────────────────────────────
// X-06 Results + X-07 re-evaluation — MOVED to `result.service.ts`.
//
// `listResults`, `enterResult`, `publishResults` and `decideReevaluation`
// were removed, not re-pointed:
//
//   listResults        a flat pending/published view with no workflow — it
//                      could not tell DRAFT from APPROVED because neither
//                      status existed yet.
//   enterResult        accepted a CLIENT-SUPPLIED grade and isPass: the
//                      screen decided who passed.
//   publishResults     stamped publishedAt on every row of a slot, skipping
//                      verification and approval entirely.
//   decideReevaluation accepted no revisedMarks, so a COMPLETED decision
//                      could not rewrite the marks it was completing.
//
// The replacement derives grade/pass from marks in `result.rules.ts` and
// walks DRAFT → VERIFIED → APPROVED → PUBLISHED with the row's own status as
// the guard. See `result.service.ts` and `result.routes.ts`.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// X-08 — Cheating cases
// ─────────────────────────────────────────────────────────────
// The X-08 cheating-case implementation now lives in its own module, split by what it does:
// `cheating.rules.ts` (the vocabulary), `cheating.internal.ts` (the loader and the shaper),
// `cheating.catalogue.ts`, `cheating.read.ts`, `cheating.report.ts`, `cheating.write.ts` and
// `cheating.legacy.ts` (the three functions that predate the feature, kept working).
//
// These three NAMES are re-exported because the admin app and the exam cell both read this table,
// and two implementations of one table is how two screens start disagreeing. The behaviour is the
// new one — the state machine is enforced, a decision carries a penalty, and the student is told —
// while the SIGNATURE stays the one the existing callers use.
export {
  listCheatingCasesLegacy as listCheatingCases,
  decideCheatingCaseLegacy as decideCheatingCase,
  createCheatingCaseLegacy as createCheatingCase,
} from './cheating.legacy.js';

// X-09 — Notifications + X-10 — Profile
// ─────────────────────────────────────────────────────────────
//
// The four functions that used to live here were REMOVED rather than re-pointed, because each one
// was answering a question the wrong way:
//
//   listNotifications   a flat 50-row dump of every notification the platform had ever sent the
//                       officer, with no categories, no unread filter and no pagination. Every row
//                       wore the same icon, and the client GUESSED the icon from the type string
//                       (`type.includes('EXAM')`), so a row the server had no chrome for rendered as
//                       a blue bell.
//   markAllRead        marked the officer's FINANCE mail read as well, on a screen labelled
//                       "Notifications" in the exam office. "I read the exam notices" is not a
//                       claim about their bills.
//   createBroadcast    wrote rows with `type: 'EXAM_CELL_BROADCAST'`, which was registered NOWHERE,
//                       so every notice it sent was labelled with a fallback. It also fell back to
//                       "all students" when its audience matched nobody, so a notice meant for the
//                       final year went to every student in the college.
//   getProfile         answered a name, a designation and three counts — two of which were the
//                       INSTITUTION's totals presented as the officer's work.
//
// The replacements live in `examcell-notifications.inbox.ts` (the officer's inbox, the catalogue,
// the composer), `examcell-notifications.emitters.ts` (who to tell and when), and
// `examcell-profile.service.ts` (the seven questions a profile answers).
export {};
