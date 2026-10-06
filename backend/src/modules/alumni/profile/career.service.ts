/**
 * Alumni Profile — career milestones (docs/users/12-alumni-relations.md §3.8).
 *
 * `AlumniCareerEntry` already existed and the directory already rendered it, but there
 * was NO write path: `UpdateMyProfileInput` has no `career` key, and no route touched
 * the table. So the timeline was visible to everyone and editable by nobody — a
 * graduate's promotions and lateral moves, the part of a career worth reading, could
 * never be recorded.
 *
 * FOUR RULES THIS ENFORCES
 * ------------------------
 *
 * 1. OWNERSHIP. Every read and write is scoped through `alumniProfile.userId ===
 *    viewer.userId`. A career row is addressed by id, and an id is guessable, so an
 *    unowned `updateMany` would let any graduate rewrite anybody's history. The scope
 *    is in the query, not in a post-fetch comparison, so a wrong id is a 404 rather
 *    than a fetch-then-check race.
 *
 * 2. EXACTLY ONE CURRENT ROLE. `toMonth = NULL` means "present". Two present rows
 *    renders as a career with two simultaneous jobs and makes the "current" answer
 *    ambiguous, so setting a new current role clears the previous one in the same
 *    transaction. This mirrors `AlumniProfile.currentRole`, which is a single column
 *    for the same reason.
 *
 * 3. NO BACKWARDS TIME. `fromMonth` must be strictly before `toMonth`. Equal months
 *    ("Oct 2024 – Oct 2024") are rejected too — that is a month-long role at best and
 *    a typo at worst.
 *
 * 4. MONTH PRECISION. `YYYY-MM` in, `YYYY-MM` out. The model stores DateTime, so
 *    everything is pinned to the first of the month and rendered as `MMMM YYYY`. A
 *    career entry does not have a day, and inventing one puts a false precision on
 *    somebody's job history.
 */
import { prisma } from '../../../db/prisma.js';
import { badRequest, forbidden, notFound } from '../../../lib/errors.js';
import { writeAudit } from '../../../lib/audit.js';
import type { Viewer } from '../directory.service.js';
import type { CareerEntryInput } from './profile.schemas.js';

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** `YYYY-MM` → first instant of that month, UTC. */
export function monthStart(value: string): Date {
  const m = MONTH_RE.exec(value);
  if (!m) throw badRequest(`"${value}" is not a month — use YYYY-MM`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
}

/** Inverse of `monthStart`, for rendering without a timezone shifting the month. */
export function monthLabel(value: Date | null | undefined): string | null {
  if (!value) return null;
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The profile row for the caller, or a 404. Every function here starts with this. */
async function ownProfile(viewer: Viewer) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true },
  });
  if (!profile) throw notFound('No alumni profile for this account');
  return profile;
}

/** A row addressed by id, scoped to its owner. */
async function ownedEntry(viewer: Viewer, entryId: string) {
  const entry = await prisma.alumniCareerEntry.findFirst({
    where: {
      id: entryId,
      profile: { userId: viewer.userId, institutionId: viewer.institutionId },
    },
    select: { id: true, alumniProfileId: true, title: true, toMonth: true },
  });
  if (!entry) throw notFound('That career entry is not yours');
  return entry;
}

/**
 * A company must belong to this institution, or a caller could attach themselves to
 * another college's employer by guessing an id — and the directory would then show a
 * company that does not exist here.
 */
async function assertCompanyInInstitution(institutionId: string, companyId: string | null | undefined) {
  if (!companyId) return;
  const company = await prisma.company.findFirst({
    where: { id: companyId, institutionId },
    select: { id: true },
  });
  if (!company) throw notFound('That company is not registered with this institution');
}

function assertOrdering(fromMonth: string, toMonth: string | null | undefined) {
  if (!toMonth) return;
  const from = monthStart(fromMonth).getTime();
  const to = monthStart(toMonth).getTime();
  if (to <= from) {
    throw badRequest('A role must end after it started — "toMonth" cannot be the same month or earlier');
  }
}

export async function listCareer(viewer: Viewer) {
  const profile = await ownProfile(viewer);
  const rows = await prisma.alumniCareerEntry.findMany({
    where: { alumniProfileId: profile.id },
    orderBy: [{ fromMonth: 'desc' }],
  });
  return {
    entries: rows.map((r) => ({
      id: r.id,
      title: r.title,
      companyId: r.companyId,
      employerLabel: r.employerLabel,
      location: r.location,
      fromMonth: monthLabel(r.fromMonth),
      toMonth: monthLabel(r.toMonth),
      isCurrent: r.toMonth === null,
      isHighlight: r.isHighlight,
    })),
  };
}

export async function addCareerEntry(viewer: Viewer, input: CareerEntryInput) {
  const profile = await ownProfile(viewer);
  assertOrdering(input.fromMonth, input.toMonth);
  await assertCompanyInInstitution(viewer.institutionId, input.companyId);

  // An entry with no employer at all is a floating title. `employerLabel` is the
  // escape hatch for employers the companies table has never heard of, so requiring
  // one of the two keeps the timeline readable.
  if (!input.companyId && !input.employerLabel) {
    throw badRequest('Give an employer — either a registered company or a name');
  }

  // A new open-ended role closes the current one AT ITS START MONTH, but only if that
  // is actually after the current role began. If somebody adds a 2019 role while a 2024
  // role is still current, closing the current one at 2019 would produce a role that
  // ends before it starts — which `assertOrdering` would have caught had it run on that
  // row. Rejecting it here tells the user to close the current role first.
  if (input.toMonth === null || input.toMonth === undefined) {
    const currentRole = await prisma.alumniCareerEntry.findFirst({
      where: { alumniProfileId: profile.id, toMonth: null },
      select: { fromMonth: true },
    });
    if (currentRole) assertOrdering(monthLabel(currentRole.fromMonth), input.fromMonth);
  }

  const created = await prisma.$transaction(async (tx) => {
    if (input.toMonth === null || input.toMonth === undefined) {
      // Rule 2 — one current role. The previous one is closed AT THE NEW ROLE'S START
      // MONTH, not at "now": a role that ended when the next one began is what a CV
      // shows, and using `now` would leave a gap of months or years on a timeline
      // somebody is back-filling.
      await tx.alumniCareerEntry.updateMany({
        where: { alumniProfileId: profile.id, toMonth: null },
        data: { toMonth: monthStart(input.fromMonth) },
      });
    }
    return tx.alumniCareerEntry.create({
      data: {
        alumniProfileId: profile.id,
        title: input.title,
        companyId: input.companyId ?? null,
        employerLabel: input.employerLabel ?? null,
        location: input.location ?? null,
        fromMonth: monthStart(input.fromMonth),
        toMonth: input.toMonth ? monthStart(input.toMonth) : null,
        isHighlight: input.isHighlight ?? false,
      },
    });
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'profile.career.add',
    entityType: 'AlumniCareerEntry',
    entityId: created.id,
    after: { title: created.title },
  });

  return { id: created.id, title: created.title, fromMonth: monthLabel(created.fromMonth), toMonth: monthLabel(created.toMonth) };
}

export async function updateCareerEntry(
  viewer: Viewer,
  entryId: string,
  input: Partial<CareerEntryInput>,
) {
  const entry = await ownedEntry(viewer, entryId);
  await assertCompanyInInstitution(viewer.institutionId, input.companyId);

  // Ordering is checked against the MERGED row, not the patch: changing only
  // `fromMonth` on an entry that already has a `toMonth` must still be validated.
  const current = await prisma.alumniCareerEntry.findUnique({
    where: { id: entry.id },
    select: { fromMonth: true, toMonth: true },
  });
  const fromMonth = input.fromMonth ?? monthLabel(current?.fromMonth) ?? undefined;
  const toMonth = input.toMonth === undefined ? monthLabel(current?.toMonth) : input.toMonth;
  if (fromMonth) assertOrdering(fromMonth, toMonth);

  // The demote path needs the same treatment as an explicit close, and it is easy to
  // miss: an open-ended role has `toMonth === null`, so `assertOrdering` above does
  // nothing at all for it — meaning `fromMonth` could be moved into the future and
  // leave a role that starts after it ends. Rejected here, which is the same rule
  // applied to the null case.
  if (current?.toMonth === null && input.toMonth === undefined && fromMonth) {
    if (monthStart(fromMonth).getTime() > Date.now()) {
      throw badRequest('A current role cannot start in the future');
    }
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.companyId !== undefined) data.companyId = input.companyId;
  if (input.employerLabel !== undefined) data.employerLabel = input.employerLabel;
  if (input.location !== undefined) data.location = input.location;
  if (input.isHighlight !== undefined) data.isHighlight = input.isHighlight;
  if (input.fromMonth !== undefined) data.fromMonth = monthStart(input.fromMonth);

  const wasCurrent = entry.toMonth === null;
  const toMonthTouched = input.toMonth !== undefined;
  const becomesCurrent = toMonthTouched && input.toMonth === null;

  if (toMonthTouched) {
    // `toMonth` is nullable and null means "current", so it is narrowed before
    // `monthStart` — which takes a string.
    data.toMonth = becomesCurrent ? null : monthStart(input.toMonth as string);
  }

  // Closing the CURRENT role demotes whoever is currently open, and opening one closes
  // whoever was. Either transition leaves exactly one current role.
  //
  // The check is on the TRANSITION, not on the field value: demoting must also fire
  // when the entry is already current (a no-op demote still needs to close the other
  // one), and promoting must fire when the entry was previously closed.
  //
  // BOTH statements run inside ONE transaction. They are a single logical transition:
  // the demote closes the outgoing role and the update opens the incoming one, and
  // the invariant is "exactly one current role". Running the `updateMany` first outside
  // the transaction and the `update` inside one was the wrong shape — a failure between
  // them left the profile with ZERO current roles, which is the one state the invariant
  // exists to prevent, and it is worse than a rejected write because nothing reports it.
  const updated = await prisma.$transaction(async (tx) => {
    if (wasCurrent !== becomesCurrent) {
      await tx.alumniCareerEntry.updateMany({
        where: {
          alumniProfileId: entry.alumniProfileId,
          toMonth: null,
          NOT: { id: entry.id },
        },
        // Closing someone else: the new role's start month is the natural end date of
        // the previous one, and is more truthful than "now" — a role that ended when the
        // next one started is what a CV shows. Falls back to `now` when the start month
        // is not being set in the same request.
        data: { toMonth: data.fromMonth ?? new Date() },
      });
    }
    return tx.alumniCareerEntry.update({ where: { id: entry.id }, data });
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'profile.career.update',
    entityType: 'AlumniCareerEntry',
    entityId: updated.id,
    after: { title: updated.title },
  });

  return {
    id: updated.id,
    title: updated.title,
    fromMonth: monthLabel(updated.fromMonth),
    toMonth: monthLabel(updated.toMonth),
    isCurrent: updated.toMonth === null,
  };
}

export async function removeCareerEntry(viewer: Viewer, entryId: string) {
  const entry = await ownedEntry(viewer, entryId);
  await prisma.alumniCareerEntry.delete({ where: { id: entry.id } });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'profile.career.remove',
    entityType: 'AlumniCareerEntry',
    entityId: entry.id,
    before: { title: entry.title },
  });

  return { id: entry.id, removed: true };
}

/**
 * Mark a milestone as a highlight.
 *
 * Separate from `updateCareerEntry` because "promote this one role to the top of my
 * card" is a different intent from "correct the dates", and the directory shows only
 * highlights — so a typo fix should not need to know that.
 */
export async function setCareerHighlight(viewer: Viewer, entryId: string, isHighlight: boolean) {
  const entry = await ownedEntry(viewer, entryId);
  const updated = await prisma.alumniCareerEntry.update({
    where: { id: entry.id },
    data: { isHighlight },
  });
  return { id: updated.id, isHighlight: updated.isHighlight };
}

/**
 * The office may correct somebody's timeline — a wrong month on a graduation date is
 * the kind of error the office has better information about than the graduate.
 *
 * Reuses the same write path as self-service; the only difference is the authoriser.
 * Every `ownedEntry` guard is bypassed deliberately here, and ONLY here, which is why
 * the office branch is a separate exported function rather than a flag threaded
 * through `updateCareerEntry`.
 */
export async function officeUpdateCareerEntry(
  viewer: Viewer,
  entryId: string,
  input: Partial<CareerEntryInput>,
) {
  if (!viewer.isOffice) throw forbidden('Only the Alumni Relations Office can edit another profile');
  const entry = await prisma.alumniCareerEntry.findFirst({
    where: { id: entryId, profile: { institutionId: viewer.institutionId } },
    select: { id: true, alumniProfileId: true, title: true, fromMonth: true, toMonth: true },
  });
  if (!entry) throw notFound('That career entry does not exist at this institution');

  const fromMonth = input.fromMonth ?? monthLabel(entry.fromMonth) ?? undefined;
  const toMonth = input.toMonth === undefined ? monthLabel(entry.toMonth) : input.toMonth;
  if (fromMonth) assertOrdering(fromMonth, toMonth);
  await assertCompanyInInstitution(viewer.institutionId, input.companyId);

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.companyId !== undefined) data.companyId = input.companyId;
  if (input.employerLabel !== undefined) data.employerLabel = input.employerLabel;
  if (input.location !== undefined) data.location = input.location;
  if (input.isHighlight !== undefined) data.isHighlight = input.isHighlight;
  if (input.fromMonth !== undefined) data.fromMonth = monthStart(input.fromMonth);
  if (input.toMonth !== undefined) data.toMonth = input.toMonth === null ? null : monthStart(input.toMonth);

  // The office path enforces the SAME exactly-one-current-role invariant as the owner's,
  // which it did not before: an office edit could promote a closed role with
  // `{ toMonth: null }` while the graduate's real current role stayed open, leaving two
  // open-ended rows. `listCareer` then labels both "Current", and every downstream
  // consumer that reads "what do they do now" has to guess which one is true.
  //
  // Same transaction as the self-service path, for the same reason: the demote and the
  // update are one transition and must not be able to half-apply.
  const wasCurrent = entry.toMonth === null;
  const becomesCurrent = input.toMonth !== undefined && input.toMonth === null;

  const updated = await prisma.$transaction(async (tx) => {
    if (wasCurrent !== becomesCurrent) {
      await tx.alumniCareerEntry.updateMany({
        where: {
          alumniProfileId: entry.alumniProfileId,
          toMonth: null,
          NOT: { id: entry.id },
        },
        data: { toMonth: data.fromMonth ?? new Date() },
      });
    }
    return tx.alumniCareerEntry.update({ where: { id: entry.id }, data });
  });

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'profile.career.office_update',
    entityType: 'AlumniCareerEntry',
    entityId: updated.id,
    after: { title: updated.title },
  });

  return { id: updated.id, title: updated.title, fromMonth: monthLabel(updated.fromMonth), toMonth: monthLabel(updated.toMonth) };
}

// Only the two pure date helpers are re-exported: `profile.service.ts` needs them to
// build the shape the API returns, and the test suite asserts `monthStart`/`monthLabel`
// as inverse functions without touching the database. Everything else in this file is
// reachable only through the routes.