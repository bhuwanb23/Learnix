/**
 * DB-free checks for the mentorship feature only.
 *
 * No server, no database â€” these exercise the pure parts (Zod contracts, the pair
 * projection, skill normalisation) so a regression shows up without needing a
 * running API or seeded fixtures.
 */
import {
  mentorshipRequestSchema,
  mentorshipDecisionSchema,
  mentorshipSessionSchema,
  goalSchema,
  updateGoalSchema,
  mentorshipFeedbackSchema,
  createPairSchema,
} from '../src/modules/alumni/alumni.schemas.js';
import { mapPair } from '../src/modules/alumni/mentorship.service.js';
import { parseSkillList } from '../src/modules/alumni/matching.service.js';

let pass = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail = '') {
  if (ok) pass++;
  else {
    failures.push(label);
    console.log(`  x ${label} ${detail}`);
  }
}
const ok = (res: unknown) => (res as { success?: boolean }).success === true;

console.log('\n--- mentorship contract checks (no DB) ---');

// â”€â”€ Requests â”€â”€
check('request accepts a plain self-service body', ok(mentorshipRequestSchema.safeParse({ requestedSkills: 'C++, placements' })));
check('request rejects BOTH mentee kinds', !mentorshipRequestSchema.safeParse({ alumniProfileId: 'a', studentProfileId: 'b' }).success);
check('request accepts an office enrolment', ok(mentorshipRequestSchema.safeParse({ studentProfileId: 'abc' })));

// â”€â”€ Decisions â”€â”€
check('decline without a reason is refused', !mentorshipDecisionSchema.safeParse({ action: 'decline' }).success);
check('decline with a 2-char reason is refused', !mentorshipDecisionSchema.safeParse({ action: 'decline', reason: 'no' }).success);
check('decline with a real reason is accepted', ok(mentorshipDecisionSchema.safeParse({ action: 'decline', reason: 'At capacity this term.' })));
check('accept needs no reason', ok(mentorshipDecisionSchema.safeParse({ action: 'accept' })));

// â”€â”€ Sessions â”€â”€
check('a booking cannot carry a duration yet', !mentorshipSessionSchema.safeParse({ sessionDate: '2026-03-14T17:00', planned: true, durationMinutes: 45 }).success);
check('a booking is accepted without one', ok(mentorshipSessionSchema.safeParse({ sessionDate: '2026-03-14T17:00', planned: true })));
check('an unknown mode is refused', !mentorshipSessionSchema.safeParse({ sessionDate: '2026-03-14T17:00', mode: 'CARRIER_PIGEON' }).success);
check('duration is coerced from a string', (mentorshipSessionSchema.safeParse({ sessionDate: '2026-03-14T17:00', durationMinutes: '45' }) as any).data?.durationMinutes === 45, 'string "45" must reach the service as a number');

// â”€â”€ Goals: the create/update split that was previously one schema â”€â”€
check('CREATE goal requires a title', !goalSchema.safeParse({ progressPct: 40 }).success);
check('UPDATE goal accepts status alone', ok(updateGoalSchema.safeParse({ status: 'ACHIEVED' })), 'this is what "mark done" sends');
check('UPDATE goal accepts progress alone', ok(updateGoalSchema.safeParse({ progressPct: 60 })));
check('UPDATE goal rejects an empty body', !updateGoalSchema.safeParse({}).success);
check('UPDATE goal rejects out-of-range percent', !updateGoalSchema.safeParse({ progressPct: 140 }).success);
check('UPDATE goal can clear a target date', ok(updateGoalSchema.safeParse({ targetDate: null })));

// â”€â”€ Feedback â”€â”€
check('both ratings null is refused', !mentorshipFeedbackSchema.safeParse({ comment: 'nice' }).success);
check('a single rating is enough', ok(mentorshipFeedbackSchema.safeParse({ mentorRating: 4 })));
check('9 stars is refused', !mentorshipFeedbackSchema.safeParse({ mentorRating: 9 }).success);

// â”€â”€ Office pairing â”€â”€
check('office pair needs an explicit field', !createPairSchema.safeParse({ mentorUserId: 'u', studentProfileId: 's' }).success);
check('office pair with a field is accepted', ok(createPairSchema.safeParse({ mentorUserId: 'u', studentProfileId: 's', field: 'Career Guidance' })));

// â”€â”€ Skill normalisation â”€â”€
check('skills fold case and punctuation', JSON.stringify(parseSkillList('Node.js, React , node.js')) === '["nodejs","react"]', JSON.stringify(parseSkillList('Node.js, React , node.js')));
check('an empty ask yields no skills', parseSkillList(null).length === 0 && parseSkillList('  ,  ').length === 0);

// â”€â”€ Pair projection: the shapes every screen reads â”€â”€
const basePair = {
  id: 'p1',
  field: 'Interview Prep',
  status: 'ACTIVE',
  requestedAt: new Date(),
  approvedAt: new Date(),
  completedAt: null,
  declinedReason: null,
  nextSessionAt: null,
  matchScore: 82,
  matchReasons: '["knows System design"]',
  mentorAlumniUserId: 'mentor-user',
  menteeStudentProfileId: null,
  menteeAlumniProfileId: 'ap1',
  mentorAlumniUser: {
    id: 'mentor-user',
    fullName: 'Mentor One',
    email: 'm@x.dev',
    alumniProfile: { id: 'ap9', graduationYear: 2016, currentRole: 'Staff Engineer', headline: null, location: null, skills: [] },
  },
  menteeStudentProfile: null,
  menteeAlumniProfile: {
    id: 'ap1',
    graduationYear: 2022,
    currentRole: 'SDE',
    headline: null,
    location: null,
    company: { name: 'Acme' },
    user: { id: 'mentee-user', fullName: 'Mentee Two', email: 'e@x.dev' },
    skills: [],
  },
  sessions: [
    { id: 's1', sessionDate: new Date(), planned: false, cancelledAt: null, durationMinutes: 45, mode: 'VIDEO', notes: null, agenda: null, outcome: 'ok', loggedByUserId: 'mentor-user' },
    { id: 's2', sessionDate: new Date(Date.now() + 6e8), planned: true, cancelledAt: null, durationMinutes: null, mode: 'VIDEO', notes: null, agenda: null, outcome: null, loggedByUserId: 'mentor-user' },
    { id: 's3', sessionDate: new Date(), planned: false, cancelledAt: new Date(), durationMinutes: 30, mode: 'PHONE', notes: null, agenda: null, outcome: null, loggedByUserId: 'mentor-user' },
  ],
  goals: [
    { title: 'a', detail: null, status: 'ACHIEVED', progressPct: 100, targetDate: null, achievedAt: new Date(), createdByUserId: 'x', updatedByUserId: null, createdAt: new Date() },
    { title: 'b', detail: null, status: 'IN_PROGRESS', progressPct: 50, targetDate: null, achievedAt: null, createdByUserId: 'x', updatedByUserId: null, createdAt: new Date() },
    { title: 'c', detail: null, status: 'DROPPED', progressPct: 10, targetDate: null, achievedAt: null, createdByUserId: 'x', updatedByUserId: null, createdAt: new Date() },
  ],
  feedback: [
    { id: 'f1', authorUserId: 'mentee-user', mentorRating: 5, menteeRating: null, comment: 'x', createdAt: new Date() },
    { id: 'f2', authorUserId: 'mentor-user', mentorRating: null, menteeRating: 4, comment: 'y', createdAt: new Date() },
  ],
} as any;

const shaped = mapPair(basePair);
check('alumni mentee is identified as ALUMNI', shaped.mentee.kind === 'ALUMNI', shaped.mentee.kind);
check('the alumni mentee resolves a name', shaped.mentee.name === 'Mentee Two', shaped.mentee.name);
check('planned and cancelled sessions are not "held"', shaped.sessions.held === 1, `held=${shaped.sessions.held}`);
check('held minutes exclude the cancelled row', shaped.sessions.totalMinutes === 45, `minutes=${shaped.sessions.totalMinutes}`);
check('the booking becomes nextSessionAt', !!shaped.nextSessionAt, String(shaped.nextSessionAt));
check('dropped goals are excluded from the total', shaped.goals.total === 2 && shaped.goals.achieved === 1, JSON.stringify(shaped.goals));
check('completion is 50% of LIVE goals', shaped.goals.percent === 50, String(shaped.goals.percent));
check('ratings are named apart, never merged', shaped.feedback.ofMentor === 5 && shaped.feedback.ofMentee === 4, JSON.stringify(shaped.feedback));
check('match reasons are parsed, not raw JSON', Array.isArray(shaped.matchReasons) && shaped.matchReasons[0] === 'knows System design', JSON.stringify(shaped.matchReasons));

const studentPair = mapPair({
  ...basePair,
  menteeAlumniProfileId: null,
  // The relation, not just the id, has to be null — `mapPair` reads the relation.
  menteeAlumniProfile: null,
  menteeStudentProfile: { id: 'sp1', rollNo: '21CS042', section: 'A', currentSemester: 5, user: { id: 'stu-user', fullName: 'Arjun Kumar', email: 'a@x.dev' } },
} as any);

check('student mentee is identified as STUDENT', studentPair.mentee.kind === 'STUDENT', studentPair.mentee.kind);
check('a student mentee has no goals percent of 0 when empty', mapPair({ ...basePair, goals: [] } as any).goals.percent === null, 'null, not 0 â€” "no goals" is not "no progress"');

const noFeedback = mapPair({ ...basePair, feedback: [] } as any);
check('no reviews means null ratings, not zero', noFeedback.feedback.ofMentor === null && noFeedback.feedback.ofMentee === null, JSON.stringify(noFeedback.feedback));

console.log(`\n  ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(`  failing: ${failures.join(', ')}`);
  process.exit(1);
}


