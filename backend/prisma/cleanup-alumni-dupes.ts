/**
 * One-off cleanup: remove rows created by the pre-determinism version of
 * seed-alumni.ts, so the corrected seed can rebuild them consistently.
 *
 * SCOPE (deliberately narrow — this deletes real rows):
 *   · donations whose donor is one of the seeded `alumni.*` users
 *   · the Payment/Receipt/DonationPayment write-through for those donations
 *   · event registrations where the registrant is a seeded `alumni.*` user
 *
 * PRESERVED: the pre-existing "New Library Wing" campaign and its 2 donations
 * (donor is NOT an `alumni.*` user), plus all students, staff and payments.
 *
 * Run: npx tsx prisma/cleanup-alumni-dupes.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const institution = await db.institution.findFirst({ where: { code: 'DEMO' } });
  if (!institution) throw new Error('Demo institution missing');

  const myUsers = await db.user.findMany({
    where: { institutionId: institution.id, email: { startsWith: 'alumni.' } },
    select: { id: true },
  });
  const myUserIds = myUsers.map((u) => u.id);
  console.log(`Seeded alumni users: ${myUserIds.length}`);

  const result = await db.$transaction(async (tx) => {
    const donations = await tx.donation.findMany({
      where: { alumniUserId: { in: myUserIds } },
      select: { id: true },
    });
    const donationIds = donations.map((d) => d.id);

    const links = await tx.donationPayment.findMany({
      where: { donationId: { in: donationIds } },
      select: { id: true, paymentId: true },
    });
    const paymentIds = links.map((l) => l.paymentId);

    await tx.donationPayment.deleteMany({ where: { donationId: { in: donationIds } } });
    const receipts = await tx.receipt.deleteMany({ where: { paymentId: { in: paymentIds } } });
    const payments = await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
    const deletedDonations = await tx.donation.deleteMany({ where: { id: { in: donationIds } } });

    const registrations = await tx.eventRegistration.deleteMany({
      where: { registrantUserId: { in: myUserIds } },
    });

    return {
      donations: deletedDonations.count,
      payments: payments.count,
      receipts: receipts.count,
      registrations: registrations.count,
    };
  });

  console.log('\nRemoved:');
  console.log(`  donations      ${result.donations}`);
  console.log(`  payments       ${result.payments}`);
  console.log(`  receipts       ${result.receipts}`);
  console.log(`  registrations  ${result.registrations}`);

  // Campaign totals are denormalized, so they are now stale by construction.
  for (const c of await db.fundraisingCampaign.findMany({ where: { institutionId: institution.id } })) {
    const agg = await db.donation.aggregate({
      where: { campaignId: c.id, status: 'RECEIVED' },
      _sum: { amountMinor: true },
    });
    await db.fundraisingCampaign.update({
      where: { id: c.id },
      data: { raisedMinor: agg._sum.amountMinor ?? 0 },
    });
  }
  console.log('\n✓ campaign totals recomputed');
}

main()
  .catch((e) => {
    console.error('✗ cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });