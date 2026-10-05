// Digital receipts.
// Docs: 12-alumni-relations.md §3.4
//
// ─────────────────────────────────────────────────────────────
// Why this is its own service
// ─────────────────────────────────────────────────────────────
// A receipt existed as a NUMBER (`RCP-2026-0042`) written into `receipts`, with
// nothing a donor could open. The number was useful to Accounts & Finance and
// useless to the person who gave the money.
//
// The receipt is assembled here from Donation → DonationPayment → Payment → Receipt
// rather than stored as a document. A generated PDF or image would be a second
// copy of the truth that goes stale the moment a payment is reversed.
//
// ─────────────────────────────────────────────────────────────
// Who may read one
// ─────────────────────────────────────────────────────────────
// The donor and the office. NOT other alumni, even though the donation itself is
// public. A receipt carries the donor's name and amount; the ledger shows the
// amount, and shows "Anonymous" when asked to hide the name. Widening access to
// receipts would undo exactly the privacy the anonymity flag provides.

import { prisma } from '../../../db/prisma.js';
import { unprocessable } from '../../../lib/errors.js';
import { toRupees, methodMeta, fundMeta } from './money.js';
import type { Viewer } from '../directory.service.js';

const receiptInclude = {
  paymentLinks: {
    include: {
      payment: {
        include: {
          receipt: true,
          alumniUser: { select: { fullName: true, email: true } },
        },
      },
    },
  },
  campaign: { select: { name: true, category: true } },
  alumniUser: { select: { fullName: true, email: true, alumniProfile: { select: { graduationYear: true } } } },
} as const;

/**
 * The receipt for one donation.
 *
 * Returns null (rather than throwing) when the caller may not have it, so the
 * route can answer 404 for both "no such donation" and "not yours" — a 403 would
 * confirm the donation exists.
 */
export async function receiptForDonation(institutionId: string, donationId: string, viewer: Viewer | undefined) {
  const d = await prisma.donation.findFirst({
    where: { id: donationId, institutionId },
    include: receiptInclude,
  });
  if (!d) return null;

  const isOwner = viewer?.userId === d.alumniUserId;
  if (!isOwner && !viewer?.isOffice) return null;

  // A pledge has no money behind it, so it has no receipt. Saying so explicitly
  // beats returning an empty document that looks like a receipt for nothing.
  const link = d.paymentLinks[0];
  const payment = link?.payment ?? null;
  const receipt = payment?.receipt ?? null;

  if (d.status !== 'RECEIVED' || !payment || !receipt) {
    throw unprocessable(
      d.status === 'PLEDGED'
        ? 'This gift is still awaiting confirmation — the receipt is issued once the money is recorded'
        : 'No receipt is available for this donation',
    );
  }

  // A reversed payment keeps its row and its receipt number, but it no longer
  // stands as proof of a live collection. It is marked VOID on the document rather
  // than hidden, because a donor holding an old PDF needs to see why it stopped
  // being valid.
  const isVoid = !!receipt.voidedAt || !!payment.reversedAt;

  return {
    receiptNo: receipt.receiptNo,
    issuedAt: receipt.issuedAt,
    isVoid,
    voidReason: receipt.voidReason ?? payment.reversalReason ?? null,
    payment: {
      referenceNo: payment.referenceNo,
      method: payment.method,
      methodLabel: methodMeta(payment.method).label,
      paidAt: payment.paidAt,
      reversedAt: payment.reversedAt,
      gatewayRef: payment.gatewayRef,
    },
    donation: {
      id: d.id,
      amountRupees: toRupees(d.amountMinor),
      fund: d.fund,
      fundLabel: fundMeta(d.fund).label,
      campaign: d.campaign?.name ?? 'Unrestricted gift',
      note: d.note,
      receivedAt: d.receivedAt,
      isRecurring: !!d.recurringId,
    },
    donor: {
      // The donor reading their own receipt always sees their name; so does the
      // office, for the same 80G reason the ledger keeps it. Both are legitimate
      // here — this endpoint is already restricted to those two.
      name: d.alumniUser.fullName,
      batch: d.alumniUser.alumniProfile?.graduationYear ?? null,
      email: d.alumniUser.email,
      isAnonymous: d.isAnonymous,
    },
    // Stated on the face of the document rather than left to the reader, because
    // an institution that has not been granted this cannot quietly imply it.
    tax: {
      claimable: false,
      note: '80G eligibility is not configured for this institution. Ask the Accounts office for a signed certificate.',
    },
    viewerContext: { isOffice: !!viewer?.isOffice, isMine: !!isOwner },
  };
}

/**
 * Public verification by receipt number.
 *
 * Deliberately narrow: it confirms that a receipt number is real, and reports
 * amount and date. It does NOT return a donor name, even for a non-anonymous gift,
 * because a verification link is the easiest thing in the world to share.
 */
export async function verifyReceipt(institutionId: string, receiptNo: string) {
  const receipt = await prisma.receipt.findFirst({
    where: { receiptNo },
    include: {
      payment: {
        select: {
          institutionId: true,
          amountMinor: true,
          paidAt: true,
          reversedAt: true,
          status: true,
          donationLink: { select: { donation: { select: { isAnonymous: true, status: true } } } },
        },
      },
    },
  });
  if (!receipt || receipt.payment.institutionId !== institutionId) {
    return { found: false as const };
  }

  return {
    found: true as const,
    receiptNo: receipt.receiptNo,
    issuedAt: receipt.issuedAt,
    amountRupees: toRupees(receipt.payment.amountMinor),
    paidAt: receipt.payment.paidAt,
    status: receipt.payment.reversedAt || receipt.voidedAt ? 'VOID' : 'VALID',
    voidReason: receipt.voidReason,
    // Named so a verifier knows a receipt exists but is not evidence of a live
    // payment, without being handed the donor's identity.
    isAnonymous: receipt.payment.donationLink?.donation?.isAnonymous ?? false,
  };
}
