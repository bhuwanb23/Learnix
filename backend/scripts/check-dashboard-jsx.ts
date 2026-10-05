// F-11 Dashboard — a parse check for the new screen files.
// Run: npx tsx scripts/check-dashboard-jsx.ts
//
// The bundler is the real judge of JSX, and a full `expo export` takes minutes
// and fails on an unrelated module. This parses each new file with the same Babel
// the Metro bundler uses, so a syntax error is caught in seconds rather than at
// the end of a build.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

// `@babel/parser` is a dependency of the APP, not of the backend, and it is not
// added to the backend's package.json just to run one check. The app already has
// it installed (it is what Metro's transformer uses), so the parser is resolved
// from the app's own tree. Adding a second copy would let the two drift, and the
// point of this check is to judge the files with the parser that will actually
// bundle them.
const require = createRequire(path.join(REPO, 'learnix', 'package.json'));
const { parse } = require('@babel/parser') as { parse: (src: string, opts: object) => unknown };
const DASH = path.join(REPO, 'learnix', 'users', 'accounts_finance', 'pages', 'dashboard');

const FILES = [
  'dashboard.js',
  'dashboardMeta.js',
  'dashboardUi.js',
  'pages/collections/collections.js',
  'pages/dues/dues.js',
  'pages/expenses/expenses.js',
  'pages/payroll/payroll.js',
  'pages/scholarships/scholarships.js',
  'pages/alerts/alerts.js',
  'pages/actions/actions.js',
];

let pass = 0;
let fail = 0;
for (const rel of FILES) {
  const file = path.join(DASH, rel);
  if (!fs.existsSync(file)) {
    console.log(`  FAIL ${rel} — missing`);
    fail += 1;
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  try {
    parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    });
    console.log(`  ok   ${rel}`);
    pass += 1;
  } catch (e) {
    console.log(`  FAIL ${rel} — ${(e as Error).message}`);
    fail += 1;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
