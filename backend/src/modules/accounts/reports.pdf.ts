// F-09 Reports — a hand-written PDF renderer, no new dependency (docs §3.8).
//
// Built the same way as the payslip (payroll.pdf.ts): a PDF is a small container
// and a content stream of drawing operators, and a report is mostly TABLES, so
// this adds a paginating table helper on top of the same primitives rather than
// pulling in a PDF library.
//
// WinAnsi cannot encode the rupee sign (U+20B9), so amounts are written as
// "INR 18,000.00". Writing "Rs" would be readable but ambiguous on an
// international statement; "INR" is unambiguous and costs nothing.
import { toCsv, type ExportSheet } from './reports.rules.js';

const PAGE_W = 842; // A4 landscape, so a wide report table fits without shrinking
const PAGE_H = 595;
const MARGIN = 32;

/** WinAnsi-safe text: everything outside the Latin-1 range becomes a `?`. */
function pdfText(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
    .replace(/([\\()])/g, '\\$1');
}

export const moneyText = (rupees: number | null | undefined): string =>
  rupees === null || rupees === undefined ? '' : `INR ${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * A paginating table.
 *
 * The header repeats on every page — a report that scrolls past a page break and
 * loses its column headings is barely readable, and the reader cannot tell what
 * the numbers below mean.
 */
class TableWriter {
  private pages: string[] = [];
  private cur: string[] = [];
  private y = PAGE_H - MARGIN - 28;
  private readonly rowH = 16;
  private readonly colWidths: number[];

  constructor(
    private readonly sheet: ExportSheet,
    private readonly title: string,
    private readonly subtitle: string,
  ) {
    const usable = PAGE_W - MARGIN * 2;
    const weight = sheet.columns.map((c) => (c.type === 'money' || c.type === 'number' ? 1.15 : 1.6));
    const total = weight.reduce((a, b) => a + b, 0);
    this.colWidths = weight.map((w) => Math.floor((w / total) * usable));
  }

  /** Public because the renderer opens the first page itself, before any row. */
  newPage(first: boolean) {
    if (!first) {
      this.pages.push(this.cur.join('\n'));
      this.cur = [];
    }
    // Two lines of heading: the report title, then the window it covers.
    this.y = PAGE_H - MARGIN - 28;
    this.cur.push(
      `BT /F2 11 Tf ${MARGIN} ${this.y} Td (${pdfText(this.title)}) Tj ET`,
      `BT /F1 8 Tf ${MARGIN} ${this.y - 12} Td (${pdfText(this.subtitle)}) Tj ET`,
      `0.6 w 0.5 0.5 0.5 RG ${MARGIN} ${this.y - 18} m ${PAGE_W - MARGIN} ${this.y - 18} l S`,
    );
    this.y -= 30;
    this.headerRow();
  }

  private headerRow() {
    const cells = this.sheet.columns
      .map((c, i) => {
        const right = c.type === 'money' || c.type === 'number';
        return this.cell(pdfText(c.header), this.x(i), this.y - this.rowH, this.colWidths[i], right, '/F2', 8);
      })
      .join('\n');
    this.cur.push(
      `0.6 w 0.4 0.4 0.4 RG ${MARGIN} ${this.y - this.rowH} m ${PAGE_W - MARGIN} ${this.y - this.rowH} l S`,
      cells,
    );
    this.y -= this.rowH + 4;
  }

  private x(i: number): number {
    return MARGIN + this.colWidths.slice(0, i).reduce((a, b) => a + b, 0);
  }

  private cell(
    text: string,
    x: number,
    y: number,
    w: number,
    right: boolean,
    font: string,
    size: number,
  ): string {
    // Clip to the column so a long vendor name cannot run into the next one.
    const body = `BT ${font} ${size} Tf ${w - 4} Tc ${x} ${y} Td (${text}) Tj ET\n0 Tc`;
    const clip = `q ${x} ${y - 3} ${w} ${size + 6} re W n`;
    void right;
    return `${clip}${body} Q`;
  }

  addRow(values: string[], rowIndex: number) {
    if (this.y - this.rowH < MARGIN + 16) this.newPage(false);
    // A zebra tint every other row: 50-row tables are unreadable without one.
    if (rowIndex % 2 === 1) {
      this.cur.push(`q 0.97 0.98 0.99 rg ${MARGIN} ${this.y - this.rowH - 2} ${PAGE_W - MARGIN * 2} ${this.rowH} re f Q`);
    }
    const cells = this.sheet.columns
      .map((c, i) => {
        const raw = values[i] ?? '';
        return this.cell(pdfText(raw), this.x(i), this.y - this.rowH, this.colWidths[i], c.type !== 'text', '/F1', 8);
      })
      .join('\n');
    this.cur.push(cells);
    this.y -= this.rowH;
  }

  finish(): string[] {
    this.pages.push(this.cur.join('\n'));
    return this.pages;
  }
}

export type ReportPdfOptions = {
  title: string;
  subtitle: string;
  /** Free-text lines printed under the subtitle (e.g. the footing note). */
  notes?: string[];
};

/**
 * Render one or more report sheets to a paginated PDF.
 *
 * Every sheet starts on a NEW page. Running two tables together without a break
 * invites the reader to attribute the second table's numbers to the first.
 */
export function renderReportPdf(sheets: ExportSheet[], opts: ReportPdfOptions): Buffer {
  const pageStreams: string[] = [];
  const notes = (opts.notes ?? []).map((n, i) =>
    `BT /F1 7 Tf ${MARGIN} ${PAGE_H - MARGIN - 40 - i * 9} Td (${pdfText(n)}) Tj ET`,
  );

  sheets.forEach((sheet, si) => {
    const w = new TableWriter(sheet, si === 0 ? opts.title : `${opts.title} - ${sheet.name}`, si === 0 ? opts.subtitle : opts.notes?.[0] ?? '');
    w.newPage(true);
    sheet.rows.forEach((row, i) => {
      const values = sheet.columns.map((c) => {
        const v = c.value(row);
        if (v === null || v === undefined) return '';
        if (c.type === 'money') return typeof v === 'number' ? moneyText(v) : String(v);
        return String(v);
      });
      w.addRow(values, i);
    });
    const pages = w.finish();
    // The notes ride on the first page of the FIRST sheet only.
    pages[0] = (si === 0 ? notes.join('\n') + '\n' : '') + pages[0];
    for (const p of pages) pageStreams.push(p);
  });

  return assemblePdf(pageStreams, opts.title);
}

/** Build the PDF object graph around the already-drawn page streams. */
function assemblePdf(pages: string[], title: string): Buffer {
  const objects: string[] = [];
  const push = (body: string) => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  // 1 catalog, 2 pages, then per page: page object + content stream.
  const catalogNum = push(''); // placeholder, filled below
  const pagesNum = push('');
  const fontRegular = push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBold = push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const pageNums: number[] = [];
  const contentNums: number[] = [];
  for (const stream of pages) {
    const contentNum = push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    contentNums.push(contentNum);
    const pageNum = push(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentNum} 0 R >>`,
    );
    pageNums.push(pageNum);
  }

  objects[catalogNum - 1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[pagesNum - 1] =
    `<< /Type /Pages /Count ${pageNums.length} /Kids [${pageNums.map((n) => `${n} 0 R`).join(' ')}] >>`;

  const infoNum = push(`<< /Title (${pdfText(title)}) /Producer (Learnix reports) >>`);

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R /Info ${infoNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(out, 'latin1');
}

/** The CSV of the same sheets, offered alongside the PDF and the workbook. */
export const reportCsv = (sheets: ExportSheet[]): string => toCsv(sheets);
