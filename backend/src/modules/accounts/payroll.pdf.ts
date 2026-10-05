// Payslip PDF generation for F-06.
// A payslip is a document an employee is entitled to keep, so "generation" has to
// mean an actual file with actual bytes on disk — the old sub-page offered
// "Resend payslip" which emailed nobody, and `PayrollEntry.payslipFileId` was a
// column nothing ever wrote.
//
// No PDF library is added for this: the file is a single Helvetica page, and a
// hand-written PDF is ~40 lines and has no supply-chain surface. The trade-off is
// deliberate and stated here — the Helvetica base-14 font can render WinAnsi only,
// so the ₹ sign is written as "INR" on the PDF while the app shows ₹. (The seed
// writes its receipt PDFs the same way, so both are readable by any PDF viewer.)
import { unprocessable } from '../../lib/errors.js';

export type PdfLine = { label: string; amountMinor: number };

export type PayslipDoc = {
  month: string;
  staffName: string;
  employeeNo?: string | null;
  designation?: string | null;
  departmentName?: string | null;
  bankAccountLast4?: string | null;
  earnings: PdfLine[];
  deductions: PdfLine[];
  grossMinor: number;
  deductionsMinor: number;
  netMinor: number;
  lopDays?: number;
  basis?: string | null;
  institutionName?: string | null;
  status?: string | null;
  generatedOn?: Date;
};

/** "2026-08" → "August 2026". */
function monthTitle(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Paise → "45,000.00". Money on a PDF is always two decimal places. */
const money = (minor: number) => (minor / 100).toFixed(2);

const r2 = (n: number) => Math.round(n * 100) / 100;

// PDF string literals escape `\`, `(` and `)`. Anything else non-WinAnsi (the ₹
// sign, which is a Latin-1 addition) is dropped rather than written raw, because a
// single stray high byte makes the file unopenable in some viewers.
function pdfText(s: string): string {
  return s
    .replace(/[()\\]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
    .slice(0, 110);
}

/**
 * Build the content stream: a ruled single-page slip.
 *
 * Coordinates are PDF points from the BOTTOM-left of a 595×842 (A4) page, so the
 * y axis counts DOWN as lines are added. Kept as a list of ops rather than drawn
 * text so the earnings/deductions tables and the totals block cannot disagree
 * about alignment.
 */
function contentStream(d: PayslipDoc): string {
  const ops: string[] = [];
  let y = 780;
  const left = 50;
  const right = 545;

  const text = (x: number, yy: number, size: number, s: string, bold = false) => {
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${yy} Td (${pdfText(s)}) Tj ET`);
  };
  const line = (x1: number, yy: number, x2: number) => {
    ops.push(`${x1} ${yy} m ${x2} ${yy} l S`);
  };

  text(left, y, 16, d.institutionName || 'Institution', true);
  text(right - 150, y, 12, 'PAYSLIP');
  y -= 16;
  text(left, y, 10, `For ${monthTitle(d.month)}`);
  text(right - 150, y, 10, d.status ? `Status: ${d.status}` : '');
  y -= 14;
  line(left, y, right);

  y -= 22;
  const field = (label: string, value?: string | null) => {
    if (!value) return;
    text(left, y, 10, `${label}: ${value}`);
    y -= 15;
  };
  field('Name', d.staffName);
  field('Employee No', d.employeeNo);
  field('Designation', d.designation);
  field('Department', d.departmentName);
  if (d.bankAccountLast4) field('A/C ending', d.bankAccountLast4);

  y -= 10;
  text(left, y, 12, 'EARNINGS', true);
  text(right - 130, y, 12, 'AMOUNT (INR)', true);
  y -= 6;
  line(left, y, right);
  y -= 16;
  for (const e of d.earnings) {
    text(left + 10, y, 10, e.label);
    text(right - 130, y, 10, money(e.amountMinor));
    y -= 14;
  }
  y -= 2;
  line(left, y, right);
  y -= 16;
  text(left + 10, y, 10, 'Gross', true);
  text(right - 130, y, 10, money(d.grossMinor), true);
  y -= 24;

  text(left, y, 12, 'DEDUCTIONS', true);
  text(right - 130, y, 12, 'AMOUNT (INR)', true);
  y -= 6;
  line(left, y, right);
  y -= 16;
  if (!d.deductions.length) {
    text(left + 10, y, 10, 'None');
    y -= 14;
  }
  for (const e of d.deductions) {
    text(left + 10, y, 10, e.label);
    text(right - 130, y, 10, money(e.amountMinor));
    y -= 14;
  }
  y -= 2;
  line(left, y, right);
  y -= 16;
  text(left + 10, y, 10, 'Total deductions', true);
  text(right - 130, y, 10, money(d.deductionsMinor), true);
  y -= 22;
  line(left, y, right);
  y -= 20;
  text(left + 10, y, 13, 'NET PAY', true);
  text(right - 130, y, 13, money(d.netMinor), true);

  if (d.lopDays) {
    y -= 18;
    text(left + 10, y, 9, `Loss of pay: ${d.lopDays} day${d.lopDays === 1 ? '' : 's'}`);
    y -= 12;
  }
  if (d.basis) {
    text(left + 10, y, 9, pdfText(d.basis).slice(0, 100));
    y -= 12;
  }

  y = 70;
  line(left, y, right);
  y -= 14;
  text(left, y, 8, `Generated ${(d.generatedOn ?? new Date()).toLocaleDateString('en-IN')} · computer generated, no signature required`);
  return ops.join('\n');
}

/**
 * Render a payslip to PDF bytes.
 *
 * The xref offsets are byte offsets, so the body is assembled as latin1 (one
 * byte per char) — building it as UTF-16 or counting characters would put every
 * offset in the wrong place and produce a file that some viewers open and some
 * reject.
 */
export function renderPayslipPdf(d: PayslipDoc): Buffer {
  if (!Number.isFinite(d.grossMinor) || d.grossMinor < 0) {
    throw unprocessable('Payslip gross is not a usable amount');
  }
  if (d.grossMinor - d.deductionsMinor !== d.netMinor) {
    throw unprocessable(
      `Payslip does not foot: gross ${d.grossMinor} − deductions ${d.deductionsMinor} ≠ net ${d.netMinor}`,
    );
  }
  const stream = `${contentStream(d)}\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

export const payslipFilename = (staffName: string, month: string, entryId: string) => {
  const slug = staffName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'staff';
  return `payslip-${slug}-${month}-${entryId.slice(-6)}.pdf`;
};

/** Re-exported so a caller rounding rupees to 2dp matches the PDF exactly. */
export { r2 };