/**
 * Alumni Profile — self-service update and link handling
 * (docs/users/12-alumni-relations.md §3.8).
 *
 * `updateMyProfile` already existed in `directory.service.ts` and was already
 * correct about the thing that is easy to get wrong here: every field is read as
 * `undefined` rather than defaulted, because the endpoint is a patch and an absent key
 * must leave the column alone. Defaulting `bio` to `''` would erase an alumnus's bio
 * every time they changed their headline.
 *
 * What this module adds is the set of fields that did not exist when it was written:
 * `graduationYear`, professional links, `skills[].yearsExperience`, and
 * `privacy.showLinks`. The existing function is left in place and these are layered on
 * through a single exported wrapper, rather than moving the whole thing — because
 * `directory.service.ts` is also the module that DECIDES visibility, and a profile
 * writer that lives next to the directory reader keeps them honest about the same
 * rules.
 *
 * GRADUATION YEAR AND THE BATCH
 * -----------------------------
 * `graduationYear` is writable; `batchId` is not. The batch is the registrar's record
 * and it derives program, department and the batch's own graduation year. A graduate
 * getting their own year wrong is ordinary and fixable; a graduate re-pointing
 * themselves at a program they did not attend would corrupt the department filter the
 * directory and the mentor matcher both run on.
 *
 * So when the two disagree, the response reports BOTH and flags it rather than
 * silently picking a winner. Silently preferring the batch would make the editable
 * field a lie; silently preferring the profile year would break the filter.
 */
import { prisma } from '../../../db/prisma.js';
import { notFound } from '../../../lib/errors.js';
import { writeAudit } from '../../../lib/audit.js';
import { updateMyProfile } from '../directory.service.js';
import type { Viewer } from '../directory.service.js';
import type { UpdateProfileInput } from './profile.schemas.js';

/** The caller's own profile row, or a 404. Every function in this file starts here. */
async function ownProfileId(viewer: Viewer) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    select: { id: true },
  });
  if (!profile) throw notFound('No alumni profile for this account');
  return profile.id;
}

/**
 * Normalise the three link fields.
 *
 * An empty string is stored as NULL rather than as `''`. `nullish()` already turns
 * `null` into a clear, and a graduate who clears the field in a text input sends `''`
 * — which would otherwise persist as an empty string that renders as a broken link
 * chip. Trimmed as well, so `' https://x '` does not become an unopenable URL.
 */
function normaliseLinks(links: UpdateProfileInput['links']): {
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
} | undefined {
  if (!links) return undefined;
  const clean = (v: string | null | undefined) => {
    const t = typeof v === 'string' ? v.trim() : v;
    return t ? t : null;
  };
  return {
    linkedinUrl: clean(links.linkedinUrl),
    githubUrl: clean(links.githubUrl),
    websiteUrl: clean(links.websiteUrl),
  };
}

/**
 * Skills.
 *
 * Written as delete-then-create rather than an upsert per row because the payload is a
 * full replacement list, not a delta: "add a skill" is not expressible by PATCHing a
 * list, and a diff would need a stable identity per skill that the payload does not
 * carry. The delete and the inserts are one transaction so a failure cannot leave
 * somebody with no skills.
 *
 * `yearsExperience` is preserved per skill by matching on the normalised skill name,
 * so dropping the field from one entry does not silently reset it.
 */
/**
 * Snapshot of the years already claimed per skill, keyed case-insensitively.
 *
 * Read BEFORE anything writes, which is the whole point: `updateMyProfile` replaces the
 * skills table wholesale, so reading it afterwards finds an empty table and every
 * `yearsExperience` the graduate typed is silently lost on the next save. The map is
 * taken as an argument rather than queried inside the transaction for that reason.
 */
async function snapshotYearsBySkill(profileId: string) {
  const existing = await prisma.alumniSkill.findMany({
    where: { alumniProfileId: profileId },
    select: { skill: true, yearsExperience: true },
  });
  return new Map(existing.map((s) => [s.skill.trim().toLowerCase(), s.yearsExperience] as const));
}

async function replaceSkills(
  profileId: string,
  skills: NonNullable<UpdateProfileInput['skills']>,
  yearsBySkill: Map<string, number | null>,
) {

  // Explicit row type rather than letting it be inferred: `level` comes from
  // `s.level ?? 'INTERMEDIATE'`, and with an inferred literal type the empty-array
  // branch widens to `never[]`, which `createMany` then rejects.
  //
  // Deduped HERE rather than with `skipDuplicates`, which Prisma does not support on
  // SQLite — passing it is a type error, and silently relying on it would be worse.
  // The unique key is (profile, skill) and the comparison is case-insensitive because
  // "React" and "react" are the same skill; the FIRST occurrence wins, so the order the
  // graduate typed them in is what decides which level is kept.
  const seen = new Set<string>();
  const rows: {
    alumniProfileId: string;
    skill: string;
    level: string;
    yearsExperience: number | null;
  }[] = [];

  for (const s of skills) {
    const name = s.skill.trim();
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      alumniProfileId: profileId,
      skill: name,
      level: s.level ?? 'INTERMEDIATE',
      yearsExperience: s.yearsExperience ?? yearsBySkill.get(key) ?? null,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.alumniSkill.deleteMany({ where: { alumniProfileId: profileId } });
    if (rows.length > 0) {
      await tx.alumniSkill.createMany({ data: rows });
    }
  });
}

/**
 * The patch, extended.
 *
 * Delegates to the directory's own `updateMyProfile` for the fields it already owns,
 * then applies the new ones. Doing it in this order means the established, reviewed
 * implementation stays the single place that handles headline/bio/location/role/
 * company/chapter/privacy, rather than being reimplemented here and drifting.
 */
export async function updateProfile(viewer: Viewer, input: UpdateProfileInput) {
  const profileId = await ownProfileId(viewer);

  // Snapshot BEFORE delegating: `updateMyProfile` replaces the skills table wholesale, so
  // anything read afterwards is empty.
  const yearsBySkill =
    input.skills !== undefined ? await snapshotYearsBySkill(profileId) : new Map<string, number | null>();

  // Awaited for its side effects only: the directory function writes the columns and
  // returns a redaction-shaped profile, but this function answers with `getProfileSelf`
  // instead, because the edit screen must see unredacted values (see that function).
  //
  // `skills` is deliberately NOT forwarded here. The directory version would write the
  // list without `yearsExperience`, and then `replaceSkills` below would read that
  // already-clobbered table. Forwarding nothing and doing the whole write in one place
  // is what keeps the years intact.
  await updateMyProfile(viewer, {
    ...(input.headline !== undefined ? { headline: input.headline } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.currentRole !== undefined ? { currentRole: input.currentRole } : {}),
    ...(input.companyId !== undefined ? { companyId: input.companyId } : {}),
    ...(input.chapterId !== undefined ? { chapterId: input.chapterId } : {}),
    ...(input.privacy !== undefined ? { privacy: input.privacy } : {}),
  });

  const data: Record<string, unknown> = {};
  if (input.graduationYear !== undefined) data.graduationYear = input.graduationYear;
  const links = normaliseLinks(input.links);
  if (links) Object.assign(data, links);

  if (Object.keys(data).length > 0) {
    await prisma.alumniProfile.update({ where: { id: profileId }, data });
  }
  // Skills need a transaction of their own (delete + createMany), so they run after the
  // column update rather than inside the same `data` object.
  if (input.skills !== undefined) {
    await replaceSkills(profileId, input.skills, yearsBySkill);
  }

  await writeAudit({
    actorUserId: viewer.userId,
    institutionId: viewer.institutionId,
    action: 'profile.update',
    entityType: 'AlumniProfile',
    entityId: profileId,
    after: {
      changed: [
        ...(input.graduationYear !== undefined ? ['graduationYear'] : []),
        ...(links ? Object.keys(links) : []),
        ...(input.skills !== undefined ? ['skills'] : []),
      ],
    },
  });

  return getProfileSelf(viewer);
}

/**
 * The caller's own profile, unredacted.
 *
 * A separate read from `directory.getProfileDetail` on purpose: that one applies the
 * OWNER'S privacy settings, which is correct for the directory and wrong here. You
 * must be able to see your own email when the switch that hides it is off — otherwise
 * "hide my email" is indistinguishable from "delete my email".
 */
export async function getProfileSelf(viewer: Viewer) {
  const profile = await prisma.alumniProfile.findFirst({
    where: { userId: viewer.userId, institutionId: viewer.institutionId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, status: true } },
      chapter: { select: { id: true, city: true } },
      company: { select: { id: true, name: true, sector: true } },
      batch: {
        select: {
          id: true,
          name: true,
          startYear: true,
          graduationYear: true,
          program: {
            select: {
              id: true,
              code: true,
              name: true,
              level: true,
              department: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
      skills: { orderBy: [{ level: 'desc' }, { skill: 'asc' }] },
      career: { orderBy: { fromMonth: 'desc' }, include: { company: { select: { name: true } } } },
      achievements: { orderBy: [{ isVerified: 'desc' }, { year: 'desc' }, { createdAt: 'desc' }] },
      privacy: true,
    },
  });
  if (!profile) throw notFound('No alumni profile for this account');

  const batchYear = profile.batch?.graduationYear ?? null;
  const profileYear = profile.graduationYear;
  // Only flagged when BOTH exist and differ. A graduate whose profile year is set and
  // whose batch is unknown is not a conflict — there is nothing to disagree with.
  const yearMismatch = batchYear !== null && profileYear !== null && batchYear !== profileYear;

  return {
    id: profile.id,
    user: profile.user,
    headline: profile.headline,
    bio: profile.bio,
    location: profile.location,
    // Was ACCEPTED by `updateProfile` but never returned by the read, so the field was
    // write-only: the edit screen saved a job title, reloaded, and found the input empty
    // with no error anywhere. Anything the patch schema accepts has to come back here,
    // or a save silently loses data.
    currentRole: profile.currentRole,
    engagementStatus: profile.engagementStatus,
    company: profile.company,
    chapter: profile.chapter,
    links: {
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      websiteUrl: profile.websiteUrl,
    },
    academic: {
      // batchId is READ-ONLY here — reported, never accepted as input.
      batchId: profile.batch?.id ?? null,
      batchName: profile.batch?.name ?? null,
      startYear: profile.batch?.startYear ?? null,
      batchGraduationYear: batchYear,
      graduationYear: profileYear,
      program: profile.batch?.program ?? null,
      yearMismatch,
      // Which value the directory filters on. Broadcast audiences group by
      // `graduationYear`, so this is the one that matters and it is worth naming.
      authoritativeYear: batchYear ?? profileYear,
    },
    skills: profile.skills.map((s) => ({
      id: s.id,
      skill: s.skill,
      level: s.level,
      yearsExperience: s.yearsExperience,
    })),
    career: profile.career.map((c) => ({
      id: c.id,
      title: c.title,
      companyId: c.companyId,
      companyName: c.company?.name ?? c.employerLabel,
      location: c.location,
      fromMonth: c.fromMonth,
      toMonth: c.toMonth,
      isCurrent: c.toMonth === null,
      isHighlight: c.isHighlight,
    })),
    achievements: profile.achievements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      kind: a.kind,
      issuer: a.issuer,
      year: a.year,
      url: a.url,
      isVerified: a.isVerified,
      verifiedAt: a.verifiedAt,
    })),
    privacy: profile.privacy,
  };
}

