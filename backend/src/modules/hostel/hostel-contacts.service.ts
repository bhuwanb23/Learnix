/**
 * Hostel resident emergency contacts — guardians and emergency contacts.
 * Docs: 08-hostel.md §3.3
 *
 * WHY THIS IS SEPARATE FROM `hostel-residents.service.ts`
 * -------------------------------------------------------
 * That file holds the directory, the enriched profile, the residence timeline and the
 * absence list. Contacts are the one surface here whose rows do NOT carry a block in their
 * ancestry — a contact hangs off `studentProfileId`, a bare id — so they need their own
 * tenant guard, their own validation and their own audit trail. Splitting them keeps the
 * guard next to the only code that depends on it, instead of one import away.
 *
 * THE TENANT GUARD IS THE POINT
 * ------------------------------
 * Every other read in the residents module reaches the institution through
 * `allocation → bed → room → block`. A contact row cannot, so a caller who guessed a
 * `studentProfileId` belonging to another college could otherwise read or overwrite that
 * student's family phone numbers. `assertResidentInInstitution` re-checks on every read
 * and every write, and the HTTP suite asserts the refusal.
 *
 * `isPrimary` IS ENFORCED IN CODE, NOT BY THE SCHEMA
 * ---------------------------------------------------
 * "At most one primary per student per KIND" is not expressible in SQLite via Prisma, and
 * a plain `@@unique([studentProfileId, kind, isPrimary])` would be wrong in a way that
 * looks right: it would also forbid two non-primary guardians, which is the normal case.
 * So promoting a contact demotes its sibling of the same kind, inside one transaction.
 */
import { prisma } from '../../db/prisma.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { writeAudit } from '../../lib/audit.js';

export const CONTACT_KINDS = ['GUARDIAN', 'EMERGENCY'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

/**
 * Guardians and emergency contacts, primary first then by name.
 */
export async function listContacts(institutionId: string, studentProfileId: string) {
  await assertResidentInInstitution(institutionId, studentProfileId);
  const rows = await prisma.hostelResidentContact.findMany({
    where: { studentProfileId },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });
  return rows.map(shapeContact);
}

export function shapeContact(c: any) {
  return {
    id: c.id,
    kind: c.kind,
    name: c.name,
    relation: c.relation,
    phone: c.phone,
    alternatePhone: c.alternatePhone,
    email: c.email,
    isPrimary: c.isPrimary,
  };
}

export async function upsertContact(
  institutionId: string,
  studentProfileId: string,
  input: {
    id?: string;
    kind: string;
    name: string;
    relation: string;
    phone: string;
    alternatePhone?: string | null;
    email?: string | null;
    isPrimary?: boolean;
  },
  actorUserId: string,
) {
  await assertResidentInInstitution(institutionId, studentProfileId);

  const kind = String(input.kind ?? '').toUpperCase();
  assertContactKind(kind);

  const name = String(input.name ?? '').trim();
  if (!name) throw badRequest('A contact needs a name');
  const phone = String(input.phone ?? '').trim();
  if (!phone) throw badRequest('A contact needs a phone number');
  // Relation is required rather than defaulted. "Father" is the first thing a warden
  // scanning a call sheet reads, and an unlabelled number is worse than no number.
  const relation = String(input.relation ?? '').trim();
  if (!relation) throw badRequest('A contact needs a relation');

  const wantsPrimary = input.isPrimary === true;
  const data = {
    kind,
    name,
    relation,
    phone,
    alternatePhone: input.alternatePhone?.trim() || null,
    email: input.email?.trim() || null,
  };

  const saved = await prisma.$transaction(async (tx) => {
    if (input.id) {
      const existing = await tx.hostelResidentContact.findFirst({
        where: { id: input.id, studentProfileId },
      });
      // Scoped to THIS student's contacts, so an id belonging to somebody else is a 404
      // rather than a write that quietly re-parents their contact onto this student.
      if (!existing) throw notFound('That contact does not belong to this resident');
      if (wantsPrimary) {
        await tx.hostelResidentContact.updateMany({
          where: { studentProfileId, kind: existing.kind, id: { not: existing.id } },
          data: { isPrimary: false },
        });
      }
      return tx.hostelResidentContact.update({
        where: { id: existing.id },
        data: { ...data, ...(wantsPrimary ? { isPrimary: true } : {}) },
      });
    }

    // A new primary demotes the existing primary of the SAME KIND. Guardian and emergency
    // primaries are independent: making a mother the primary guardian must not un-primary
    // the family doctor.
    if (wantsPrimary) {
      await tx.hostelResidentContact.updateMany({
        where: { studentProfileId, kind },
        data: { isPrimary: false },
      });
    }
    return tx.hostelResidentContact.create({
      data: { ...data, studentProfileId, isPrimary: wantsPrimary },
    });
  });

  await writeAudit({
    actorUserId,
    institutionId,
    action: input.id ? 'hostel.contact.update' : 'hostel.contact.create',
    entityType: 'HostelResidentContact',
    entityId: saved.id,
    after: { kind: saved.kind, relation: saved.relation, isPrimary: saved.isPrimary },
  });

  return shapeContact(saved);
}

export async function deleteContact(
  institutionId: string,
  studentProfileId: string,
  contactId: string,
  actorUserId: string,
) {
  await assertResidentInInstitution(institutionId, studentProfileId);
  const existing = await prisma.hostelResidentContact.findFirst({
    where: { id: contactId, studentProfileId },
  });
  if (!existing) throw notFound('That contact does not belong to this resident');
  await prisma.hostelResidentContact.delete({ where: { id: existing.id } });

  await writeAudit({
    actorUserId,
    institutionId,
    action: 'hostel.contact.delete',
    entityType: 'HostelResidentContact',
    entityId: existing.id,
    before: { kind: existing.kind, relation: existing.relation },
  });

  return { id: existing.id, deleted: true };
}

/**
 * The student must belong to this institution.
 *
 * Exported because the profile read composes contacts alongside allocations, and it must
 * apply the same check rather than relying on the allocation's block chain to cover a row
 * that has no such chain.
 */
export async function assertResidentInInstitution(
  institutionId: string,
  studentProfileId: string,
): Promise<void> {
  const prof = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, institutionId },
    select: { id: true },
  });
  if (!prof) throw notFound('Resident not found at this institution');
}

/** Shared with the route schema so the two cannot disagree about accepted kinds. */
export function assertContactKind(value: unknown): asserts value is ContactKind {
  if (typeof value !== 'string' || !(CONTACT_KINDS as readonly string[]).includes(value)) {
    throw badRequest(`kind must be one of ${CONTACT_KINDS.join(' | ')}`);
  }
}