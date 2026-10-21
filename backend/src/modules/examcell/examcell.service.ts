// The exam cell module's shared surface.
//
// WHAT IS IN HERE
// ---------------
// Only the re-exports and the removal notes. The X-01 dashboard that used to live here now has
// its own module (`examcell-dashboard.service.ts`), and the X-09/X-10 work has its own too.
//
// WHY THE DASHBOARD MOVED OUT
// ----------------------------
// The old `getDashboard` answered with `{ hero, stats, upcomingExams, recentCheating, alerts }` —
// a flat shape with a banner and four counters. It had four defects that could not be fixed in
// place, and three of them were about what it did NOT show:
//
//   1. It counted THREE of the SIX exam statuses. `EXAM_STATUSES` (`timetable.rules.ts:172`) is
//      DRAFT | SCHEDULED | PUBLISHED | ONGOING | COMPLETED | RESULTS_PUBLISHED, and the old one
//      reported only ONGOING, SCHEDULED and COMPLETED. A DRAFT exam and a PUBLISHED one were both
//      INVISIBLE — so an officer reading "0 ongoing" could not tell whether that meant "none
//      running" or "the dashboard does not count that".
//   2. It counted only `UNDER_REVIEW` misconduct cases, when the OPEN set is REPORTED |
//      UNDER_REVIEW | COMMITTEE_REVIEW | ESCALATED. Three of the four were invisible.
//   3. `alerts` was a flat `string[]` — "3 cheating case(s) under review" — which cannot be
//      filtered, cannot be counted, and cannot be linked to.
//   4. It had no "absent" and no "appeared", because the exam domain had NO attendance record at
//      all: the only attendance table was a teacher's per-lecture register, keyed by course
//      offering, with no join key to an exam slot.
//
// The replacement is SEVEN STRUCTURED SECTIONS, in `examcell-dashboard.service.ts`.
//
// WHY THE OTHER FUNCTIONS ARE GONE
// --------------------------------
// Each was answering a question the wrong way, and each was replaced by a module that answers it
// properly. The record of what each one got wrong is kept, because a removal with no explanation
// is a removal somebody re-implements.
//
//   X-02/X-03  Six functions moved to `./timetable.service.ts`:
//               `listExams` returned `conflicts: examConflicts.length` and NO code path ever
//                 created an ExamConflict row, so the count was a hard zero while the screen
//                 showed "2 conflicts" out of a fixture file.
//               `createExam` was the only way to make an exam, with no edit at all.
//               `addExamSlot` looked the offering up with `where: { id }` and NO institution
//                 filter, so another college's offering could be scheduled into this exam.
//               `rescheduleSlot` checked NOTHING — moving a paper could create the very student
//                 clash the controller was trying to fix.
//               `listRoomAllocations` reported a raw roomId with nothing to resolve it against;
//                 `Room` in this schema is a HOSTEL room.
//               `allocateRoom` wrote an unchecked roomId string into a scalar column and never
//                 checked the invigilator for a double booking.
//
//   X-04  Two functions moved to `./hallticket.service.ts`:
//         `listHallTickets` took examId straight off the query string with no schema at all.
//         `generateHallTickets` issued a ticket for every active enrolment and returned only a
//         count — no eligibility view, and a seat counter that restarted at 1 per slot.
//
//   X-05  Three functions moved to `./evaluation.service.ts`:
//         `listEvaluations` returned denormalised counters straight off the row, so the screen
//           and the truth agreed only as long as nobody lied.
//         `assignEvaluator` accepted any TEACHER id with NO institution check, so another
//           college's teacher could be allocated to grade our papers.
//         `completeEvaluation` set completedPapers = totalPapers unconditionally, without
//           reading a single paper. It was the lie the whole module was built on.
//
//   X-06/X-07  Four functions moved to `./result.service.ts`:
//               `listResults` had no workflow — it could not tell DRAFT from APPROVED.
//               `enterResult` accepted a CLIENT-SUPPLIED grade and isPass: the screen decided
//                 who passed.
//               `publishResults` skipped verification and approval entirely.
//               `decideReevaluation` accepted no revisedMarks, so a COMPLETED decision could
//                 not rewrite the marks it was completing.
//
//   X-09/X-10  Four functions removed, replaced by `examcell-notifications.inbox.ts` and
//               `examcell-profile.service.ts`.
//
//   X-11  The dashboard removed, replaced by `examcell-dashboard.service.ts`.
//
// The X-08 cheating-case re-exports are still here, because the admin app and the exam cell both
// read that table and two implementations of one table is how two screens start disagreeing.

export {
  listCheatingCasesLegacy as listCheatingCases,
  decideCheatingCaseLegacy as decideCheatingCase,
  createCheatingCaseLegacy as createCheatingCase,
} from './cheating.legacy.js';
