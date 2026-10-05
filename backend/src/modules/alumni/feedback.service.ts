// Two-way mentorship feedback.
// Docs: 12-alumni-relations.md §3.5 · §4
//
// The Events module has an equivalent, and it is worth copying its gate: only
// someone who actually attended may review. Here the gate is PARTICIPATION —
// you can only review a pair you are in, and only while it is ACTIVE. Feedback
// from an office administrator, or about a pair that ended three years ago, is
// not evidence of anything.
//
// Two explicit rating columns (mentorRating / menteeRating) rather than one
// ambiguous `rating`, so no screen can accidentally show "their rating of you"
// and "your rating of them" in the same widget.

import { prisma } from '../../db/prisma.js';
import { notFound, unprocessable } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';
import type { Viewer } from './directory.service.js';

export async function submitFeedback(
  viewer: Viewer,
  pairId: string,
  body: { mentorRating?: number; menteeRating?: number; comment?: string },
) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId: viewer.institutionId } } },
        { menteeAlumniProfile: { institutionId: viewer.institutionId } },
      ],
    },
    select: {
      id: true,
      status: true,
      mentorAlumniUserId: true,
      menteeAlumniProfile: { select: { userId: true } },
      menteeStudentProfile: { select: { user: { select: { id: true } } } },
    },
  });
  if (!pair) throw notFound('Mentorship pair not found');

  const isMentor = viewer.userId === pair.mentorAlumniUserId;
  const isMentee =
    viewer.userId === pair.menteeAlumniProfile?.userId ||
    viewer.userId === pair.menteeStudentProfile?.user.id;

  if (!(isMentor || isMentee)) {
    throw unprocessable('Only the mentor or the mentee can review this mentorship');
  }
  if (viewer.isOffice) {
    throw unprocessable('The Alumni Relations Office cannot review a mentorship it administers');
  }
  if (pair.status !== 'ACTIVE') {
    throw unprocessable(`Reviews close when a mentorship ends (this one is ${pair.status})`);
  }

  const mentorRating = body.mentorRating ?? null;
  const menteeRating = body.menteeRating ?? null;
  if (mentorRating === null && menteeRating === null) {
    throw unprocessable('Give a rating for the mentor, the mentee, or both');
  }
  for (const r of [mentorRating, menteeRating]) {
    if (r !== null && (!Number.isInteger(r) || r < 1 || r > 5)) {
      throw unprocessable('ratings must be a whole number of stars between 1 and 5');
    }
  }

  // One review per person per pair, but EDITABLE — a 1-star review written because
  // scheduling clashed should be fixable once it did not.
  const existing = await prisma.mentorshipFeedback.findFirst({
    where: { pairId, authorUserId: viewer.userId },
  });

  const data = {
    // A mentor reviewing rates the mentee; a mentee reviewing rates the mentor.
    mentorRating: isMentee ? mentorRating : (mentorRating ?? null),
    menteeRating: isMentor ? menteeRating : (menteeRating ?? null),
    comment: body.comment?.trim() || null,
  };

  const row = existing
    ? await prisma.mentorshipFeedback.update({ where: { id: existing.id }, data })
    : await prisma.mentorshipFeedback.create({
        data: { pairId, authorUserId: viewer.userId, ...data },
      });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: existing ? 'mentorship.feedback.update' : 'mentorship.feedback.create',
    entityType: 'MentorshipFeedback',
    entityId: row.id,
    before: existing ? { mentorRating: existing.mentorRating, menteeRating: existing.menteeRating } : undefined,
    after: { mentorRating: row.mentorRating, menteeRating: row.menteeRating },
  });

  return { id: row.id, pairId, updated: !!existing, ...(await summarise(pairId)) };
}

export async function deleteMyFeedback(viewer: Viewer, pairId: string) {
  const existing = await prisma.mentorshipFeedback.findFirst({
    where: { pairId, authorUserId: viewer.userId, pair: { id: pairId } },
  });
  if (!existing) throw notFound('You have not reviewed this mentorship');
  await prisma.mentorshipFeedback.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true, ...(await summarise(pairId)) };
}

export async function listFeedback(viewer: Viewer, pairId: string) {
  const pair = await prisma.mentorshipPair.findFirst({
    where: {
      id: pairId,
      OR: [
        { menteeStudentProfile: { user: { institutionId: viewer.institutionId } } },
        { menteeAlumniProfile: { institutionId: viewer.institutionId } },
      ],
    },
    select: {
      id: true,
      mentorAlumniUserId: true,
      menteeAlumniProfile: { select: { userId: true } },
      menteeStudentProfile: { select: { user: { select: { id: true } } } },
    },
  });
  if (!pair) throw notFound('Mentorship pair not found');

  // The institution check above is NOT enough. A private word a mentee wrote
  // about a mentor is not every alumnus's business, so the comments are returned
  // only to the two participants and to the office — and the office gets the
  // ratings without the text, because the office administers the pairing, it is
  // not a party to it.
  const isMentor = viewer.userId === pair.mentorAlumniUserId;
  const isMentee =
    viewer.userId === pair.menteeAlumniProfile?.userId ||
    viewer.userId === pair.menteeStudentProfile?.user.id;
  const participant = isMentor || isMentee;
  const mayReadComments = participant;

  const rows = await prisma.mentorshipFeedback.findMany({
    where: { pairId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, fullName: true } } },
  });

  return {
    ...(await summarise(pairId)),
    mayReadComments,
    reviews: rows.map((r) => ({
      id: r.id,
      mentorRating: r.mentorRating,
      menteeRating: r.menteeRating,
      // The comment itself is withheld, not blanked: a blank string reads as
      // "they wrote nothing" rather than "you may not see this".
      comment: mayReadComments ? r.comment : null,
      createdAt: r.createdAt,
      authorName: mayReadComments ? r.author.fullName : 'A participant',
      isMine: r.authorUserId === viewer.userId,
    })),
  };
}

async function summarise(pairId: string) {
  const rows = await prisma.mentorshipFeedback.findMany({
    where: { pairId },
    select: { mentorRating: true, menteeRating: true },
  });
  const ofMentor = rows.map((r) => r.mentorRating).filter((x): x is number => x != null);
  const ofMentee = rows.map((r) => r.menteeRating).filter((x): x is number => x != null);
  const avg = (xs: number[]) =>
    xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  return {
    count: rows.length,
    // What mentees said about the mentor, and what the mentor said about the
    // mentee. Named apart so neither can be mistaken for the other.
    ofMentor: avg(ofMentor),
    ofMentee: avg(ofMentee),
  };
}
