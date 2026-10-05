// F-09 Reports — a real .xlsx writer, no new dependency (docs/users/06 §3.8).
//
// An .xlsx file is a ZIP archive of XML parts. Both halves are built here with
// what Node already ships (`zlib` for the compression, a hand-rolled ZIP writer
// for the container), because the project deliberately has no spreadsheet
// dependency — the payslip PDF is hand-written for the same reason.
//
// What this buys over "export CSV and call it Excel":
//   · money lands in a cell as a NUMBER with a currency format, so it sums and
//     charts in the spreadsheet instead of sitting there as the text "₹18,000"
//   · one workbook can hold several sheets (a report's summary plus its detail)
//   · Excel, LibreOffice and Google Sheets all open it
//
// ZIP entries are written with the STORE (no compression) method, which is a
// completely valid ZIP variant and keeps the writer to one code path. The parts
// are small and XML does not compress dramatically.
import { crc32 } from 'node:zlib';
import type { ExportSheet } from './reports.rules.js';
import { MONEY_FORMAT } from './reports.rules.js';

// ── ZIP ───────────────────────────────────────────────────────────────────

type ZipEntry = { name: string; data: Buffer };

/**
 * A minimal but spec-correct ZIP (PKZIP 2.0) with STORE entries.
 *
 * The local header and the central directory must agree about every field, and
 * the end-of-central-directory record must point at the directory's own offset —
 * which is why the sizes are only known after the body has been assembled.
 */
function zip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const crc = crc32(e.data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // flags: UTF-8 names
    local.writeUInt16LE(0, 8); // method: STORE
    local.writeUInt16LE(0, 10); // mod time — fixed, so the build is reproducible
    local.writeUInt16LE(0x21, 12); // mod date: 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    locals.push(local, nameBuf, e.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(e.data.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + e.data.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuf, end]);
}

// ── XML ───────────────────────────────────────────────────────────────────

/** XML text escaping. A report full of user-authored notes will contain `&` and `<`. */
const esc = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Control characters are ILLEGAL in XML 1.0 and make the whole part fail to
    // parse, so they are dropped rather than escaped.
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
};

/** Excel forbids these in a sheet name and silently corrupts the workbook. */
export const safeSheetName = (raw: string, index: number): string => {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return cleaned.length ? cleaned : `Sheet${index + 1}`;
};

/** Column letters: 0 → A, 25 → Z, 26 → AA. */
export function columnName(n: number): string {
  let name = '';
  let x = n;
  while (x >= 0) {
    name = String.fromCharCode((x % 26) + 65) + name;
    x = Math.floor(x / 26) - 1;
  }
  return name;
}

function sheetXml(sheet: ExportSheet): string {
  const cols = sheet.columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.type === 'money' ? 18 : 26}" customWidth="1"/>`)
    .join('');

  const header = `<row r="1">${sheet.columns
    .map((c, i) => `<c r="${columnName(i)}1" t="inlineStr" s="1"><is><t>${esc(c.header)}</t></is></c>`)
    .join('')}</row>`;

  const body = sheet.rows
    .map((row, r) => {
      const cells = sheet.columns
        .map((c, i) => {
          const v = c.value(row);
          const ref = `${columnName(i)}${r + 2}`;
          if (v === null || v === undefined || v === '') return '';
          // Numbers are written as numbers, with no type attribute — which is
          // exactly what makes the spreadsheet treat them as numbers.
          if (typeof v === 'number' && Number.isFinite(v)) {
            const style = c.type === 'money' ? ' s="2"' : '';
            return `<c r="${ref}"${style}><v>${v}</v></c>`;
          }
          if (typeof v === 'boolean') return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
          return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 2}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${header}${body}</sheetData></worksheet>`;
}

/**
 * Build a workbook.
 *
 * Sheet order and the `r:id` references in workbook.xml must line up exactly, or
 * the reader shows the wrong sheet for the name — so the names are computed once
 * and reused, with duplicates disambiguated because Excel also refuses two
 * sheets of the same name.
 */
export function buildXlsx(sheets: ExportSheet[]): Buffer {
  const names = sheets.map((s, i) => {
    const base = safeSheetName(s.name, i);
    const clash = names_seen(sheets, i, base);
    return clash ? `${base.slice(0, 28)} ${clash}` : base;
  });

  const entries: ZipEntry[] = [];
  entries.push({
    name: '[Content_Types].xml',
    data: Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
      'utf8',
    ),
  });
  entries.push({
    name: '_rels/.rels',
    data: Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'utf8',
    ),
  });
  entries.push({
    name: 'xl/workbook.xml',
    data: Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names
        .map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
      'utf8',
    ),
  });
  entries.push({
    name: 'xl/_rels/workbook.xml.rels',
    data: Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
        )
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      'utf8',
    ),
  });
  // s=1 bold header, s=2 money format. Cell style ids must match these indices.
  entries.push({
    name: 'xl/styles.xml',
    data: Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="${esc(MONEY_FORMAT)}"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
      'utf8',
    ),
  });
  sheets.forEach((sheet, i) => {
    entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(sheetXml(sheet), 'utf8') });
  });

  return zip(entries);
}

/** 1-based "how many earlier sheets already want this name", or 0 when free. */
function names_seen(sheets: ExportSheet[], index: number, base: string): number {
  let n = 0;
  for (let i = 0; i < index; i += 1) {
    if (safeSheetName(sheets[i].name, i) === base) n += 1;
  }
  return n;
}
