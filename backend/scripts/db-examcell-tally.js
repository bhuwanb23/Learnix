// One-shot: report the live counts of the tables the exam-cell dashboard reads.
// Run: node scripts/db-examcell-tally.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DB = path.resolve(HERE, '..', 'prisma', 'schema', 'dev.db');
const prisma = new PrismaClient({ datasources: { db: { url: `file:${DB}` } } });

const group = async (label, fn) => {
  try {
    console.log(`${label}: ${JSON.stringify(await fn())}`);
  } catch (e) {
    console.log(`${label}: ERR ${e.message}`);
  }
};

try {
  await group('EXAM STATUS', () =>
    prisma.exam.groupBy({ by: ['status'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.status, x._count._all]))),
  );
  await group('SLOT STATUS', () =>
    prisma.examSlot.groupBy({ by: ['status'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.status, x._count._all]))),
  );
  await group('EVAL STATUS', () =>
    prisma.evaluation.groupBy({ by: ['status'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.status, x._count._all]))),
  );
  await group('MODERATION', () =>
    prisma.evaluation.groupBy({ by: ['moderationStatus'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.moderationStatus, x._count._all]))),
  );
  await group('SCRIPT STATUS', () =>
    prisma.evaluationPaper.groupBy({ by: ['scriptStatus'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.scriptStatus, x._count._all]))),
  );
  await group('RESULT STATUS', () =>
    prisma.result.groupBy({ by: ['status'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.status, x._count._all]))),
  );
  await group('CHEATING STATUS', () =>
    prisma.cheatingCase.groupBy({ by: ['status'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.status, x._count._all]))),
  );
  await group('HALLTICKET STATUS', () =>
    prisma.hallTicket.groupBy({ by: ['status'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.status, x._count._all]))),
  );
  await group('EXAM ATTENDANCE', () =>
    prisma.examAttendance.groupBy({ by: ['state'], _count: { _all: true } })
      .then((r) => Object.fromEntries(r.map((x) => [x.state, x._count._all]))),
  );
  await group('COUNTS', async () => ({
    exams: await prisma.exam.count(),
    slots: await prisma.examSlot.count(),
    evaluations: await prisma.evaluation.count(),
    papers: await prisma.evaluationPaper.count(),
    results: await prisma.result.count(),
    cheatingCases: await prisma.cheatingCase.count(),
    hallTickets: await prisma.hallTicket.count(),
    students: await prisma.studentProfile.count(),
    enrolments: await prisma.enrollment.count(),
    attendance: await prisma.examAttendance.count(),
  }));
} finally {
  await prisma.$disconnect();
}
