// Unused-import and undefined-JSX-component scan for the X-02 Timetable screens.
//
// Run: node scripts/check-timetable-locals.js
//
// Two failure modes, both invisible to the parse sweep in
// `check-timetable-jsx.ts` because both are SYNTACTICALLY valid:
//
//   1. AN IMPORTED NAME THAT IS NEVER USED. How a rename half-happens — the
//      call site is rewritten and the import is left behind, so the reader is
//      left believing a symbol is in play when it is not.
//
//   2. A JSX COMPONENT USED BUT NEVER IMPORTED OR DECLARED. This one does not
//      fail at build time; it throws `Element type is invalid` the first time
//      that line renders, on a phone. It is exactly how the first draft of the
//      slots screen shipped an undeclared `venueTarget` and a
//      `KeyboardAlwaysApproach` that did not exist.
//
// WHY THIS USES THE PARSER AND NOT REGEXES.
//
// The first version of this file stripped comments and strings with regular
// expressions and then counted identifier occurrences. That approach reports
// `<View>` as unused, because a hand-rolled string stripper cannot tell an
// apostrophe inside JSX text from a string delimiter, so one unbalanced quote
// silently swallows the rest of the file. Babel already knows the difference,
// and it is already a dependency of the app. A check built on a parser that
// gets comments and strings right is strictly better than one built on a
// guess about them.
//
// The AST walk is conservative: it reports only a DEFINITE problem. A false
// positive costs a look; a false negative ships a crash.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const TT = path.join(REPO, 'learnix', 'users', 'exam_cell', 'pages', 'timetable');

const require = createRequire(path.join(REPO, 'learnix', 'package.json'));
const { parse } = require('@babel/parser');

const FILES = [
  'timetable.js',
  'timetableMeta.js',
  'timetableUi.js',
  'pages/calendar/calendar.js',
  'pages/exams/exams.js',
  'pages/allocation/allocation.js',
  'pages/slots/slots.js',
  'pages/rooms/rooms.js',
  'pages/duty/duty.js',
  'pages/students/students.js',
  'pages/conflicts/conflicts.js',
];

/** Names React and React Native provide without an import. */
const AMBIENT_JSX = new Set([
  'React', 'Fragment',
  'View', 'Text', 'StyleSheet', 'ScrollView', 'FlatList', 'SectionList',
  'TouchableOpacity', 'TouchableHighlight', 'Pressable', 'TextInput',
  'Alert', 'Modal', 'RefreshControl', 'KeyboardAvoidingView', 'Platform',
  'ActivityIndicator', 'Image', 'Animated', 'Dimensions', 'SafeAreaView',
  'StatusBar', 'Switch', 'Picker', 'Linking',
]);

const OPTS = {
  sourceType: 'module',
  plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
};

let pass = 0;
let fail = 0;

for (const rel of FILES) {
  const file = path.join(TT, rel);
  if (!fs.existsSync(file)) {
    console.log(`  FAIL ${rel} — missing`);
    fail += 1;
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');

  let ast;
  try {
    ast = parse(src, OPTS);
  } catch (e) {
    console.log(`  FAIL ${rel} — does not parse: ${e.message}`);
    fail += 1;
    continue;
  }

  /** Imported bindings → the specifier text, for a useful message. */
  const imported = new Map();
  /** Every name bound anywhere in the module (declarations, params, etc.). */
  const declared = new Set();
  /** Identifiers actually referenced in a value position. */
  const referenced = new Set();
  /** JSX component names used as an element type. */
  const jsxUsed = new Set();

  const body = ast.program.body;
  for (const node of body) {
    if (node.type === 'ImportDeclaration') {
      for (const spec of node.specifiers) {
        if (spec.type === 'ImportDefaultSpecifier') imported.set(spec.local.name, spec.local.name);
        else if (spec.type === 'ImportNamespaceSpecifier') imported.set(spec.local.name, spec.local.name);
        else imported.set(spec.local.name, spec.imported.name ?? spec.local.name);
      }
    }
  }

  // Full AST walk. `estraverse` is not a dependency, so this is a hand-rolled
  // walker over the two node shapes that matter plus a generic recursion that
  // skips the keys Babel adds for source positions.
  const SKIP = new Set(['loc', 'start', 'end', 'leadingComments', 'trailingComments', 'innerComments', 'extra']);
  (function walk(node, parent, key) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child, parent, key);
      return;
    }
    if (typeof node.type !== 'string') return;

    // An Identifier in a member-expression position (`styles.foo`) is a
    // PROPERTY, not a reference, and must not count as a use.
    const isMemberProp = parent && parent.type === 'MemberExpression' && key === 'property';
    const isObjKey = parent && parent.type === 'ObjectProperty' && key === 'key' && !parent.computed;
    const isJsxAttrName = parent && (parent.type === 'JSXAttribute');
    const isImportSpec = parent && parent.type.startsWith('Import');

    if (node.type === 'Identifier' && !isMemberProp && !isObjKey && !isJsxAttrName && !isImportSpec) {
      if (key === 'id' && parent && /Function(Class)?Declaration/.test(parent.type)) {
        declared.add(node.name);
      } else {
        referenced.add(node.name);
      }
    }

    if (node.type === 'JSXIdentifier') {
      const owner = parent;
      if (owner && owner.type === 'JSXOpeningElement' && key === 'name') {
        jsxUsed.add(node.name);
        // A JSX element name IS a reference to the imported binding. Without
        // this line every component in every file reads as an unused import,
        // because `<View>` is a JSXIdentifier and never an Identifier.
        referenced.add(node.name);
      }
    }

    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      declared.add(node.id.name);
    }
    if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name);
    if (node.type === 'ClassDeclaration' && node.id) declared.add(node.id.name);
    if (node.type === 'FunctionExpression' && node.id) declared.add(node.id.name);
    if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
      for (const p of node.params) collectPattern(p, declared);
    }
    if (node.type === 'CatchClause' && node.param) collectPattern(node.param, declared);
    for (const p of node.params ?? []) collectPattern(p, declared);

    for (const k of Object.keys(node)) {
      if (SKIP.has(k)) continue;
      walk(node[k], node, k);
    }
  })(ast.program, null, null);

  const problems = [];

  // ── 1. Unused imports ────────────────────────────────────────────────
  //
  // `React` is exempt. This app runs the CLASSIC JSX runtime — every screen in
  // the repo imports it and Babel compiles JSX to `React.createElement` — so
  // the binding is required in scope even though no line names it. Flagging it
  // would be correct about the AST and wrong about this codebase, and a check
  // that cries wolf on all eleven files is a check that gets ignored.
  const unused = [...imported.keys()]
    .filter((name) => name !== 'React')
    .filter((name) => !referenced.has(name));
  if (unused.length) problems.push(`imported but never used: ${unused.join(', ')}`);

  // ── 2. JSX components used but never bound ───────────────────────────
  const undefinedJsx = [...jsxUsed].filter(
    (name) => !imported.has(name) && !declared.has(name) && !AMBIENT_JSX.has(name),
  );
  if (undefinedJsx.length) {
    problems.push(`used in JSX but never imported or declared: ${undefinedJsx.join(', ')}`);
  }

  if (problems.length) {
    for (const p of problems) console.log(`  FAIL ${rel} — ${p}`);
    fail += 1;
    continue;
  }
  const detail = `${imported.size} imports, all used`;
  console.log(`  ok   ${rel}${detail === '0 imports, all used' ? '' : ` (${detail})`}`);
  pass += 1;
}

/** Every identifier a binding pattern introduces. */
function collectPattern(node, into) {
  if (!node) return;
  if (node.type === 'Identifier') { into.add(node.name); return; }
  if (node.type === 'AssignmentPattern') { collectPattern(node.left, into); return; }
  if (node.type === 'RestElement') { collectPattern(node.argument, into); return; }
  if (node.type === 'ObjectPattern') {
    for (const prop of node.properties) {
      if (prop.type === 'ObjectProperty') collectPattern(prop.value, into);
      else if (prop.type === 'RestElement') collectPattern(prop.argument, into);
    }
    return;
  }
  if (node.type === 'ArrayPattern') {
    for (const el of node.elements) collectPattern(el, into);
    return;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);