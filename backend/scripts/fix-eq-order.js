// One-shot: rewrite `ok(cond, 'label')` and `eq(a, b, 'label')` calls in the exam-cell HTTP
// suites into the `(label, cond)` / `(label, actual, expected)` order the harness now uses.
// Run: node scripts/fix-eq-order.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = [
  'verify-examcell-dashboard-http.ts',
  'verify-examcell-attendance-http.ts',
];

// Matches a call whose FIRST argument is a string literal — which is exactly the wrong-order form.
const OK_CALL = /ok\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*([\s\S]*?)\);/g;
const OK_TEMPLATE = /ok\(\s*`((?:[^`\\]|\\.)*)`\s*,\s*([\s\S]*?)\);/g;
const EQ_CALL = /eq\(\s*([\s\S]*?),\s*'((?:[^'\\]|\\.)*)'\s*\);/g;

for (const file of FILES) {
  const abs = path.join(HERE, file);
  let src = fs.readFileSync(abs, 'utf8');
  const before = src;

  // `eq(actual, expected, 'label')` → `eq('label', actual, expected)`.
  // The label is the LAST string-literal argument, so the first two are captured.
  src = src.replace(
    /eq\(\s*([A-Za-z0-9_?.$\[\]'"`\- ]+?)\s*,\s*([A-Za-z0-9_?.$\[\]'"`\- ]+?)\s*,\s*('(?:[^'\\]|\\.)*')\s*\)/g,
    (_m, a, b, label) => `eq(${label}, ${a.trim()}, ${b.trim()})`,
  );

  // `ok(cond, 'label')` → `ok('label', cond)`.
  src = src.replace(OK_CALL, (_m, label, cond) => `ok('${label}', ${cond.trim()})`);
  src = src.replace(OK_TEMPLATE, (_m, label, cond) => `ok(\`${label}\`, ${cond.trim()})`);

  if (src !== before) {
    fs.writeFileSync(abs, src, 'utf8');
    console.log(`rewrote ${file}`);
  } else {
    console.log(`unchanged ${file}`);
  }
}
