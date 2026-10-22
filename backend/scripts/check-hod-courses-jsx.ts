// HD-06 — The HOD's Courses desk: a parse check for the new screen files.
// Run: node node_modules/tsx/dist/cli.mjs scripts/check-hod-courses-jsx.ts
//
// The bundler is the real judge of JSX, and a full `expo export` cannot run here — the local
// Expo CLI is a shim that delegates to a missing global `expo-cli`. This parses each new file
// with the same Babel the Metro transformer uses, so a syntax error is caught in seconds rather
// than at the end of a build that will not run.
//
// It also resolves every RELATIVE import to a real file, which catches the bug this feature
// actually shipped elsewhere: an import path one level too high, which parses perfectly, bundles
// as an unresolved module, and fails only at runtime.
//
// It also checks that no file is a CORRUPTED single line. A screen that arrives as fifteen
// physical lines holding four hundred and ninety-one literal `\n` escape sequences parses as
// nothing at all and crashes the app on opening it.
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
const { parse } = require('@babel/parser') as {
  parse: (src: string, opts: object) => unknown;
};

const HOD = path.join(REPO, 'learnix', 'users', 'hod');

const FILES = [
  'pages/courses/courses.js',
  'pages/courses/coursesMeta.js',
  'pages/courses/coursesUi.js',
  'pages/courses/coursesDetail.js',
  'pages/courses/coursesDetailActions.js',
  'pages/courses/coursesDetailPanels.js',
  'hod.js',
];

/** Every relative specifier in a source file, as written. */
function relativeSpecifiers(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:from\s+|require\(\s*)['"](\.[^'"]+)['"]/g)) {
    out.push(m[1]!);
  }
  return out;
}

/**
 * Every NAMED import in a source file, with the module it came from.
 *
 * Used to find an import that is never used — dead weight in a file the reader is meant to
 * understand, and a hint that something was renamed on one side only.
 */
function namedImports(src: string): { name: string; from: string }[] {
  const out: { name: string; from: string }[] = [];
  const re = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(re)) {
    const from = m[2]!;
    for (const raw of m[1]!.split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0]?.trim();
      if (name) out.push({ name, from });
    }
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
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
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
    const okJs =
      fs.existsSync(`${target}.js`) || fs.existsSync(path.join(target, 'index.js'));
    if (!okFile && !okJs) {
      console.log(`  FAIL ${label} - import "${spec}" resolves to nothing`);
      bad += 1;
    }
  }
  if (bad > 0) {
    fail += 1;
    return;
  }

  // THE UNUSED IMPORT CHECK. A name imported and never used is dead weight, and it is the usual
  // symptom of a rename that only landed on one side.
  const unused = namedImports(src).filter(
    (i) => !new RegExp(`\\b${i.name.replace(/[$]/g, '\\$')}\\b`).test(src.replace(/import[^;]+;/g, '')),
  );
  if (unused.length > 0) {
    for (const u of unused) {
      console.log(`  FAIL ${label} - imports "${u.name}" from "${u.from}" and never uses it`);
    }
    fail += 1;
    return;
  }

  console.log(`  ok   ${label}`);
  pass += 1;
}

for (const rel of FILES) checkFile(path.join(HOD, rel), rel);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
