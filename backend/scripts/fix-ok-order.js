// One-shot: rewrite the remaining `ok(cond, 'label')` calls into the `(label, cond)` order.
// The first pass handled the `eq` calls and the `ok('label', ...)` ones; this handles the
// `ok(<expression>, 'label')` ones, where the expression can contain parentheses.
// Run: node scripts/fix-ok-order.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = [
  'verify-examcell-dashboard-http.ts',
  'verify-examcell-attendance-http.ts',
];

/** Split a call's arguments on top-level commas. */
function splitArgs(src, open) {
  const args = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (let i = open + 1; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      current += ch;
      if (ch === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) return { args, end: i };
      depth -= 1;
    }
    if (ch === ',' && depth === 0) {
      args.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  return { args, end: -1 };
}

for (const file of FILES) {
  const abs = path.join(HERE, file);
  let src = fs.readFileSync(abs, 'utf8');
  const before = src;

  let i = 0;
  while (i < src.length) {
    const at = src.indexOf('ok(', i);
    if (at < 0) break;
    const { args, end } = splitArgs(src, at + 2);
    if (end < 0 || args.length !== 2) {
      i = at + 3;
      continue;
    }
    const [first, second] = args;
    const firstTrim = first.trim();
    const secondTrim = second.trim();
    // ALREADY IN THE RIGHT ORDER: the first argument is a string literal.
    if (
      (firstTrim.startsWith("'") && firstTrim.endsWith("'")) ||
      (firstTrim.startsWith('`') && firstTrim.endsWith('`'))
    ) {
      i = end + 1;
      continue;
    }
    // The wrong order: the SECOND argument is the string literal.
    const isLabel =
      (secondTrim.startsWith("'") && secondTrim.endsWith("'")) ||
      (secondTrim.startsWith('`') && secondTrim.endsWith('`'));
    if (!isLabel) {
      i = end + 1;
      continue;
    }
    const rebuilt = `ok(${secondTrim}, ${firstTrim})`;
    src = src.slice(0, at) + rebuilt + src.slice(end + 1);
    i = at + rebuilt.length;
  }

  if (src !== before) {
    fs.writeFileSync(abs, src, 'utf8');
    console.log(`rewrote ${file}`);
  } else {
    console.log(`unchanged ${file}`);
  }
}
