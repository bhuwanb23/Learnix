/** One-off repair: clear test rows left by a SIGPIPE-killed verify run. */
import { prisma } from '../src/db/prisma.js';

async function main() {
  const inst = await prisma.institution.findFirst({ where: { code: 'DEMO' } });
  if (!inst) throw new Error('no demo');

  // Test payments are the ones made in the last hour by the verify script.
  const cutoff = new Date(Date.now() - 6 * 3600 * 1000);
  const suspects = await prisma.payment.findMany({
    where: { institutionId: inst.id, createdAt: { gte: cutoff } },
    include: { receipt: true, allocations: { include: { due: true } } },
  });
  console.log(`Suspect payments in the last 6h: ${suspects.length}`);
  for (const p of suspects) {
    console.log(
      `  ${p.referenceNo} ${p.receipt?.receiptNo} ₹${p.amountMinor / 100} rev=${!!p.reversedAt} ` +
        `allocs=${p.allocations.map((a) => `${a.due.title.slice(0, 20)}=${a.amountMinor / 100}`).join(',')}`,
    );
  }

  const dupeRef = await prisma.payment.groupBy({ by: ['institutionId', 'referenceNo'], _count: { id: true } });
  console.log('duplicate refs:', dupeRef.filter((g) => g._count.id > 1).length);

  const neg = await prisma.feeDue.findMany({ where: { paidMinor: { gt: 0 }, status: 'UNPAID' } });
  console.log(`dues with paidMinor>0 but UNPAID: ${neg.length}`);
  for (const d of neg) console.log(`  "${d.title}" paid=${d.paidMinor / 100} amount=${d.amountMinor / 100}`);

  const over = await prisma.feeDue.findMany({
    where: { status: 'CLEARED' },
    include: { allocations: true },
  });
  console.log(`cleared dues: ${over.length}`);
}
main().finally(() => prisma.$disconnect());
