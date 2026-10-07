/**
 * Shared constants for the hostel module.
 *
 * WHY THE RENT AMOUNT LIVES HERE
 * ------------------------------
 * ₹35,000/month was a bare literal in eight places across `hostel.service.ts` and
 * `seed.ts` — two of which had to agree or a newly-allocated resident would be billed a
 * different amount from the one the room detail screen displays. Constants that must not
 * disagree belong in one place, not eight.
 *
 * WHY IT IS NOT IN `FeeStructure`
 * -------------------------------
 * `FeeStructure` is keyed by `programId` + `academicYearId`: it answers "what does THIS
 * STUDENT owe this year". Hostel rent is per BED, not per programme — two students on the
 * same programme in different years can pay different rent, and a student who changes
 * programme mid-year keeps their bed. Folding it into the fee structure would either lose
 * that distinction or force rent to vary by programme, which is wrong.
 *
 * It does mean the amount is institution-wide and code-configured. Making it configurable is
 * a fee-configuration decision that belongs with the accounts module, not a hostel edit.
 */
export const HOSTEL_RENT_MONTHLY_MINOR = 3500000; // ₹35,000

/** Bed lifecycle. Mirrors the `Bed.status` comment in g1_rooms.prisma. */
export const BED_STATUSES = ['VACANT', 'ALLOCATED', 'MAINTENANCE'] as const;
export type BedStatus = (typeof BED_STATUSES)[number];

/**
 * A bed may only be withdrawn for maintenance while it is VACANT.
 *
 * Setting MAINTENANCE on an ALLOCATED bed would strand a resident: they would still hold an
 * ACTIVE allocation while their bed reported itself unusable, and `vacateBed` would then be
 * the only way out. The room detail screen also renders one row per bed with its occupant, so
 * a bed that says "maintenance" while naming a resident would be a lie on the screen.
 */
export function assertBedCanEnterMaintenance(status: string): void {
  if (status !== 'VACANT') {
    throw new Error(
      `Bed is ${status.toLowerCase()}, not vacant — vacate it before marking it under maintenance`,
    );
  }
}