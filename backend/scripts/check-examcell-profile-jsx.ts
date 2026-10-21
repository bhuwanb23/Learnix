// X-09 + X-10 — Exam cell notifications and profile: a parse check for the new screen files.
// Run: npx tsx scripts/check-examcell-profile-jsx.ts
//
// The bundler is the real judge of JSX, and a full `expo export` cannot run here — the local
// Expo CLI is a shim that delegates to a missing global `expo-cli`. This parses each new file
// with the same Babel the Metro transformer uses, so a syntax error is caught in seconds rather
// than at the end of a build that will not run.
//
// It also resolves every RELATIVE import to a real file, which catches the bug this feature
// actually shipped: an import path one level too high, which parses perfectly, bundles as an
// unresolved module, and fails only at runtime. The profile sub-screens sit FOUR directories deep
// (`pages/profile/my_permissions/my_permissions.js`), so the relative path to `services/api` is
// exactly the depth where that mistake is easy to make.
//
// It also checks that no file is a CORRUPTED single line. A screen that arrives as fifteen physical
// lines holding four hundred and ninety-one literal `\n` escape sequences parses as nothing at all
// and crashes the exam cell app on opening it.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

// `@babel/parser` is a dependency of the APP, not of the backend, and it is not added to the
// backend's package.json just to run one check. The app already has it installed (it is what
// Metro's transformer uses), so the parser is resolved from the app's own tree. Adding a second
// copy would let the two drift, and the point of this check is to judge the files with the
// parser that will actually bundle them.
const require = createRequire(path.join(REPO, 'learnix', 'package.json'));
const { parse } = require('@babel/parser') as { parse: (src: string, opts: object) => unknown };

const EXAM_CELL = path.join(REPO, 'learnix', 'users', 'exam_cell');

const FILES = [
  'pages/notifications/notifications.js',
  'pages/notifications/notificationsUi.js',
  'pages/profile/profile.js',
  'pages/profile/profileUi.js',
  'pages/profile/my_permissions/my_permissions.js',
  'pages/profile/activity/activity.js',
  'pages/profile/change_password/change_password.js',
  'pages/profile/help_support/help_support.js',
  'exam_cell.js',
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

function checkFile(abs: string, label: string) {
  if (!fs.existsSync(abs)) {
    console.log(`  FAIL ${label} - missing`);
    fail += 1;
    return;
  }
  const src = fs.readFileSync(abs, 'utf8');

  // THE CORRUPTION CHECK. A real file has more real newlines than literal `\n` escapes; a
  // corrupted one has hundreds of the latter and almost none of the former.
  const literalEscapes = (src.match(/\\n/g) ?? []).length;
  const realNewlines = (src.match(/\n/g) ?? []).length;
  if (literalEscapes > realNewlines) {
    console.log(
      `  FAIL ${label} - is a corrupted single-line file (${literalEscapes} literal \\n against ${realNewlines} real newlines)`,
    );
    fail += 1;
    return;
  }

  try {
    parse(src, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    });
  } catch (e) {
    console.log(`  FAIL ${label} - ${(e as Error).message}`);
    fail += 1;
    return;
  }

  // Parse succeeded. Now check the relative imports actually land on a file.
  let bad = 0;
  for (const spec of relativeSpecifiers(src)) {
    const target = path.resolve(path.dirname(abs), spec);
    const okFile = fs.existsSync(target);
    const okJs = fs.existsSync(`${target}.js`) || fs.existsSync(path.join(target, 'index.js'));
    if (!okFile && !okJs) {
      console.log(`  FAIL ${label} - import "${spec}" resolves to nothing`);
      bad += 1;
    }
  }
  if (bad > 0) {
    fail += 1;
    return;
  }

  console.log(`  ok   ${label}`);
  pass += 1;
}

for (const rel of FILES) checkFile(path.join(EXAM_CELL, rel), rel);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
