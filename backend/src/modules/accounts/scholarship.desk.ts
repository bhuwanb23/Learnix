// F-08 Scholarships — the write side of the desk (docs/users/06 §3.7).
//
// Split from scholarship.service.ts only for file size; it imports the read side
// rather than duplicating it, so there is still one definition of every rule.
import { prisma } from '../../db/prisma.js';
import { conflict, notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import {
  STATUS_META,
  assertTransition,
  documentChecklist,
  evaluateEligibility,
  type EligibilityRule,
} from './scholarship.rules.js';
import {
  amountPreviewFor,
  docsOf,
  eligibilityFactsFor,
  getApplication,
  isoDay,
  rulesOf,
} from './scholarship.service.js';

/** Load an application for mutation, with its scheme and student. */
async function loadApp(institutionId: string, applicationId: string) {
  const app = await prisma.scholarshipApplication.findFirst({
    where: { id: applicationId, institutionId },
    include: { scholarship: true, documents: true, studentProfile: { select: { id: true, userId: true, rollNo: true, status: true } } },
  });
  if (!app) throw notFound('Application not found');
  return app;
}

async function logEvent(
  applicationId: string,
  fromStatus: string | null,
  toStatus: string,
  actorUserId: string,
  note?: string | null,
) {
  await prisma.scholarshipApplicationEvent.create({
    data: { applicationId, fromStatus, toStatus, actorUserId, note: note ?? null },
  });
}

// ── applying ───────────────────────────────────────────────────────────────

/**
 * Record a new application.
 *
 * The scheme must be OPEN — a closed window refuses new applications but keeps
 * every existing one readable, which is the difference between closing a
 * scholarship and erasing it.
 */
export async function applyToScheme(
  institutionId: string,
  actorUserId: string,
  input: {
    scholarshipId: string;
    studentProfileId: string;
    declaredAnnualIncomeRupees?: number | null;
    declaredGender?: string | null;
    statement?: string | null;
  },
) {
  const scheme = await prisma.scholarship.findFirst({ where: { id: input.scholarshipId, institutionId } });
  if (!scheme) throw notFound('Scholarship scheme not found');
  if (scheme.status !== 'OPEN') {
    throw conflict(`"${scheme.name}" is ${scheme.status} and is not accepting applications`);
  }

  const today = new Date();
  if (scheme.opensAt && scheme.opensAt > today) throw conflict(`Applications open on ${isoDay(scheme.opensAt)}`);
  if (scheme.closesAt && scheme.closesAt < today) throw conflict(`Applications closed on ${isoDay(scheme.closesAt)}`);

  const student = await prisma.studentProfile.findFirst({
    where: { id: input.studentProfileId, user: { institutionId, deletedAt: null } },
    select: { id: true, rollNo: true, status: true },
  });
  if (!student) throw notFound('Student not found in this institution');
  if (student.status !== 'ACTIVE') {
    throw conflict(`${student.rollNo} is ${student.status} and cannot hold a scholarship`);
  }

  const existing = await prisma.scholarshipApplication.findUnique({
    where: { scholarshipId_studentProfileId: { scholarshipId: scheme.id, studentProfileId: student.id } },
  });
  // A rejected or withdrawn student may apply again; a live application blocks
  // a duplicate so the same person cannot hold two grants on one scheme.
  if (existing && !['REJECTED', 'WITHDRAWN'].includes(existing.status)) {
    const label = STATUS_META[existing.status as keyof typeof STATUS_META]?.label ?? existing.status;
    throw conflict(`${student.rollNo} already has a ${label} application for this scheme`);
  }

  const required = docsOf(scheme);
  const declaredMinor =
    input.declaredAnnualIncomeRupees === null || input.declaredAnnualIncomeRupees === undefined
      ? null
      : Math.max(0, Math.round(input.declaredAnnualIncomeRupees * 100));

  const created = existing
    ? await prisma.scholarshipApplication.update({
        where: { id: existing.id },
        data: {
          status: 'APPLIED',
          declaredAnnualIncomeMinor: declaredMinor,
          declaredGender: input.declaredGender?.toUpperCase() ?? null,
          statement: input.statement?.trim() || null,
          requestedMinor: 0,
          grantedMinor: 0,
          disbursedMinor: 0,
          eligibilityJson: '{}',
          reviewedAt: null,
          reviewedByUserId: null,
          decisionReason: null,
          approvedAt: null,
          approvedByUserId: null,
          rejectedAt: null,
          rejectedByUserId: null,
          rejectedReason: null,
          disbursedAt: null,
          disbursedByUserId: null,
        },
      })
    : await prisma.scholarshipApplication.create({
        data: {
          institutionId,
          scholarshipId: scheme.id,
          studentProfileId: student.id,
          declaredAnnualIncomeMinor: declaredMinor,
          declaredGender: input.declaredGender?.toUpperCase() ?? null,
          statement: input.statement?.trim() || null,
        },
      });

  // The checklist is a FIXED list the student fills in, created up front rather
  // than growing as they upload — "what is still missing" must be answerable
  // before anything has been attached.
  for (const code of required) {
    await prisma.scholarshipApplicationDocument.upsert({
      where: { applicationId_code: { applicationId: created.id, code } },
      create: { applicationId: created.id, code },
      update: {},
    });
  }

  // A re-application starts with a clean checklist. Carrying a verified income
  // proof across from the rejected attempt would let the new one skip the very
  // verification that rejected it.
  if (existing) {
    await prisma.scholarshipApplicationDocument.deleteMany({
      where: { applicationId: created.id, code: { notIn: required.length ? required : ['__none__'] } },
    });
    await prisma.scholarshipApplicationDocument.updateMany({
      where: { applicationId: created.id },
      data: { status: 'PENDING', fileId: null, note: null, verifiedAt: null, verifiedByUserId: null },
    });
  }

  await logEvent(created.id, existing?.status ?? null, 'APPLIED', actorUserId, 'Application received');

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'scholarship.apply',
    entityType: 'ScholarshipApplication',
    entityId: created.id,
    after: { scheme: scheme.name, student: student.rollNo, reApplied: Boolean(existing) },
  });

  return getApplication(institutionId, created.id);
}

// ── required-document tracking ─────────────────────────────────────────────

const DOCUMENT_STATUSES = ['UPLOADED', 'VERIFIED', 'REJECTED'] as const;

export async function recordDocument(
  institutionId: string,
  actorUserId: string,
  applicationId: string,
  code: string,
  input: { status: string; fileId?: string | null; note?: string | null },
) {
  if (!DOCUMENT_STATUSES.includes(input.status as never)) {
    throw unprocessable(`Unknown document status "${input.status}"`, [
      { code: 'BAD_DOCUMENT_STATUS', message: `Supported: ${DOCUMENT_STATUSES.join(', ')}` },
    ]);
  }

  const app = await loadApp(institutionId, applicationId);
  const required = docsOf(app.scholarship);

  if (!required.includes(code)) {
    throw unprocessable(`"${code}" is not a required document for "${app.scholarship.name}"`);
  }
  // A decided application is a historical document. Re-editing its checklist
  // afterwards would let an award be re-justified once the money had moved.
  if (app.status === 'DISBURSED' || app.status === 'REJECTED') {
    throw conflict('This application is closed; its documents can no longer be changed');
  }
  if (input.status !== 'UPLOADED' && !input.fileId) {
    throw unprocessable('Attach the document before marking it verified or rejected');
  }
  if (input.fileId) {
    const file = await prisma.file.findFirst({ where: { id: input.fileId, institutionId }, select: { id: true } });
    if (!file) throw notFound('Uploaded file not found');
  }
  if (input.status === 'REJECTED' && !input.note?.trim()) {
    throw unprocessable('Say why the document was rejected — the student has to be able to fix it');
  }

  const row = await prisma.scholarshipApplicationDocument.upsert({
    where: { applicationId_code: { applicationId, code } },
    create: {
      applicationId,
      code,
      status: input.status,
      fileId: input.fileId ?? null,
      note: input.note?.trim() || null,
      verifiedByUserId: input.status === 'VERIFIED' ? actorUserId : null,
      verifiedAt: input.status === 'VERIFIED' ? new Date() : null,
    },
    update: {
      status: input.status,
      fileId: input.fileId ?? null,
      note: input.note?.trim() || null,
      verifiedByUserId: input.status === 'VERIFIED' ? actorUserId : null,
      verifiedAt: input.status === 'VERIFIED' ? new Date() : null,
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'scholarship.document',
    entityType: 'ScholarshipApplicationDocument',
    entityId: row.id,
    after: { code, status: input.status, fileId: input.fileId ?? null },
  });

  return getApplication(institutionId, applicationId);
}

/** Record a raw upload against a checklist slot, as PENDING-verification. */
export async function uploadDocument(
  institutionId: string,
  actorUserId: string,
  applicationId: string,
  code: string,
  file: { id: string; originalName: string },
) {
  return recordDocument(institutionId, actorUserId, applicationId, code, {
    status: 'UPLOADED',
    fileId: file.id,
    note: file.originalName,
  });
}

// ── approval workflow ──────────────────────────────────────────────────────

export async function startReview(institutionId: string, actorUserId: string, applicationId: string, note?: string | null) {
  const app = await loadApp(institutionId, applicationId);
  assertTransition(app.status, 'UNDER_REVIEW');

  await prisma.scholarshipApplication.update({
    where: { id: app.id },
    data: { status: 'UNDER_REVIEW', reviewedAt: new Date(), reviewedByUserId: actorUserId, decisionReason: note?.trim() || null },
  });
  await logEvent(app.id, app.status, 'UNDER_REVIEW', actorUserId, note);
  await writeAudit({ actorUserId, institutionId, action: 'scholarship.review', entityType: 'ScholarshipApplication', entityId: app.id, before: { status: app.status }, after: { status: 'UNDER_REVIEW' } });
  return getApplication(institutionId, app.id);
}

/**
 * APPROVE — the transition the old code faked.
 *
 * Three gates, all enforced here rather than in the UI, because a desk that
 * only greys out a button will find another way:
 *
 *  1. Eligibility, evaluated live against the student's own record.
 *  2. Every REQUIRED document verified — an unverified scan is evidence, not a
 *     decision, and an award released against one is the fraud case this
 *     sub-feature exists to prevent.
 *  3. Something to give: an approved award is capped at the student's actual
 *     outstanding balance, so approving a student who owes nothing would create
 *     a grant that can never be disbursed.
 */
export async function approveApplication(
  institutionId: string,
  actorUserId: string,
  applicationId: string,
  note?: string | null,
) {
  const app = await loadApp(institutionId, applicationId);
  assertTransition(app.status, 'APPROVED');

  const rules: EligibilityRule[] = rulesOf(app.scholarship);
  const facts = await eligibilityFactsFor(app.studentProfileId, {
    annualIncomeMinor: app.declaredAnnualIncomeMinor,
    gender: app.declaredGender,
  });
  const eligibility = evaluateEligibility(rules, facts);

  if (!eligibility.canApprove) {
    throw unprocessable(`This student does not meet the eligibility rules — ${eligibility.summary}`, [
      ...eligibility.failed.map((l) => ({ code: 'RULE_FAILED', message: `${l.label}: needs ${l.required}, has ${l.actual}` })),
      ...eligibility.unknown.map((l) => ({ code: 'RULE_UNKNOWN', message: `${l.label}: ${l.actual}` })),
    ]);
  }

  const required = docsOf(app.scholarship);
  const checklist = documentChecklist(
    required,
    app.documents.map((d) => ({ code: d.code, status: d.status, fileId: d.fileId } as never)),
  );
  if (!checklist.complete) {
    const missing = checklist.documents.filter((d) => !d.satisfied).map((d) => d.label);
    throw unprocessable(`${missing.length} required document${missing.length === 1 ? '' : 's'} still to verify: ${missing.join(', ')}`, [
      { code: 'DOCUMENTS_INCOMPLETE', message: missing.join(', ') },
    ]);
  }

  const preview = await amountPreviewFor(
    institutionId,
    {
      id: app.scholarship.id,
      amountMode: app.scholarship.amountMode,
      awardPercent: app.scholarship.awardPercent,
      fixedAmountMinor: app.scholarship.fixedAmountMinor,
      budgetMinor: app.scholarship.budgetMinor,
      capacity: app.scholarship.capacity,
    },
    app.studentProfileId,
  );

  if (preview.grantedMinor <= 0) {
    const why =
      preview.warnings[0] ??
      (preview.outstandingMinor <= 0
        ? 'This student owes nothing, so there is no bill for the award to reduce'
        : 'The computed award is nil, so there is nothing to approve');
    throw unprocessable(why, [{ code: 'NIL_AWARD', message: 'Review the scheme amount and the outstanding balance' }]);
  }

  // The stored snapshot is what the decision was made ON. Re-running the rules
  // later against data that has since changed must not rewrite the record of
  // why this was approved.
  await prisma.scholarshipApplication.update({
    where: { id: app.id },
    data: {
      status: 'APPROVED',
      requestedMinor: preview.requestedMinor,
      grantedMinor: preview.grantedMinor,
      eligibilityJson: JSON.stringify({
        decidedAt: new Date().toISOString(),
        decidedBy: actorUserId,
        summary: eligibility.summary,
        lines: eligibility.lines,
        facts,
      }),
      decisionReason: note?.trim() || null,
      approvedAt: new Date(),
      approvedByUserId: actorUserId,
      reviewedAt: new Date(),
      reviewedByUserId: actorUserId,
    },
  });

  await logEvent(app.id, app.status, 'APPROVED', actorUserId, note?.trim() || eligibility.summary);

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: app.studentProfile.userId,
      type: 'SCHOLARSHIP',
      title: `Scholarship approved: ${app.scholarship.name}`,
      body: `Your application has been approved. Award: ₹${Math.round(preview.grantedMinor / 100).toLocaleString('en-IN')}.`,
      sourceModule: 'accounts',
    },
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'scholarship.approve',
    entityType: 'ScholarshipApplication',
    entityId: app.id,
    before: { status: app.status },
    after: { status: 'APPROVED', grantedMinor: preview.grantedMinor, requestedMinor: preview.requestedMinor },
  });

  return getApplication(institutionId, app.id);
}

export async function rejectApplication(
  institutionId: string,
  actorUserId: string,
  applicationId: string,
  reason: string,
) {
  if (!reason?.trim() || reason.trim().length < 5) {
    throw unprocessable('Give a reason — the student has to know why, and "rejected" is not a reason');
  }
  const app = await loadApp(institutionId, applicationId);
  assertTransition(app.status, 'REJECTED');

  await prisma.scholarshipApplication.update({
    where: { id: app.id },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectedByUserId: actorUserId, rejectedReason: reason.trim(), grantedMinor: 0, requestedMinor: 0 },
  });
  await logEvent(app.id, app.status, 'REJECTED', actorUserId, reason.trim());

  await prisma.notification.create({
    data: {
      institutionId,
      recipientUserId: app.studentProfile.userId,
      type: 'SCHOLARSHIP',
      title: `Scholarship application declined: ${app.scholarship.name}`,
      body: reason.trim(),
      sourceModule: 'accounts',
    },
  });

  await writeAudit({ actorUserId, institutionId, action: 'scholarship.reject', entityType: 'ScholarshipApplication', entityId: app.id, before: { status: app.status }, after: { status: 'REJECTED', reason: reason.trim() } });
  return getApplication(institutionId, app.id);
}

export async function withdrawApplication(institutionId: string, actorUserId: string, applicationId: string, reason?: string | null) {
  const app = await loadApp(institutionId, applicationId);
  assertTransition(app.status, 'WITHDRAWN');

  await prisma.scholarshipApplication.update({ where: { id: app.id }, data: { status: 'WITHDRAWN', grantedMinor: 0 } });
  await logEvent(app.id, app.status, 'WITHDRAWN', actorUserId, reason?.trim() || 'Withdrawn');
  await writeAudit({ actorUserId, institutionId, action: 'scholarship.withdraw', entityType: 'ScholarshipApplication', entityId: app.id, before: { status: app.status }, after: { status: 'WITHDRAWN' } });
  return getApplication(institutionId, app.id);
}