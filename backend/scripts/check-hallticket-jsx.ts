// X-04 Hall tickets — a parse check for the new screen files.
// Run: npx tsx scripts/check-hallticket-jsx.ts
//
// The bundler is the real judge of JSX, and a full `expo export` cannot run
// here — the local Expo CLI is a shim that delegates to a missing global
// `expo-cli`. This parses each new file with the same Babel the Metro
// transformer uses, so a syntax error is caught in seconds rather than at the
// end of a build that will not run.
//
// It also resolves every RELATIVE import to a real file, which catches the bug
// the Accounts F-11 build shipped in all seven of its sub-screens: an import
// path one level too high, which parses perfectly, bundles as an unresolved
// module, and fails only at runtime. These screens sit three directories deep
// (`pages/eligibility/eligibility.js`), so the relative path to `services/api`
// is four levels up — exactly the depth where that mistake is easy to make.
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

const HT = path.join(REPO, 'learnix', 'users', 'exam_cell', 'pages', 'hall_tickets');

const FILES = [
  'hall_tickets.js',
  'hallTicketMeta.js',
  'hallTicketUi.js',
  'pages/eligibility/eligibility.js',
  'pages/generation/generation.js',
  'pages/tickets/tickets.js',
  'pages/schedule/schedule.js',
  'pages/centre/centre.js',
  'pages/requests/requests.js',
  'pages/publication/publication.js',
];

/** Every relative specifier in a source file, as written. */
function relativeSpecifiers(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:from\s+|require\(\s*)['"](\.[^'"]+)['"]/g)) {
    out.push(m[1]!);
  }
  return out;
}

let pass = 0;
let fail = 0;
for (const rel of FILES) {
  const file = path.join(HT, rel);
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
  } catch (e) {
    console.log(`  FAIL ${rel} — ${(e as Error).message}`);
    fail += 1;
    continue;
  }

  // Parse succeeded. Now check the relative imports actually land on a file.
  // The bug this catches parses clean, bundles as an unresolved module, and only
  // fails when that line first runs on a phone.
  let bad = 0;
  for (const spec of relativeSpecifiers(src)) {
    const target = path.resolve(path.dirname(file), spec);
    const okFile = fs.existsSync(target);
    const okJs = fs.existsSync(`${target}.js`) || fs.existsSync(path.join(target, 'index.js'));
    if (!okFile && !okJs) {
      console.log(`  FAIL ${rel} — import "${spec}" resolves to nothing`);
      bad += 1;
    }
  }
  if (bad > 0) {
    fail += 1;
    continue;
  }

  console.log(`  ok   ${rel}`);
  pass += 1;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
