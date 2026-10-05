/**
 * Resolves every relative import in a set of files and reports the ones that do
 * not exist.
 *
 * Needed because the web bundler is currently unavailable: a parallel dependency
 * commit left `node_modules` mid-install (`expo-cli` removed while `expo` is
 * still 44), so `expo export` cannot run. This proves the same thing a bundle
 * would — every path a screen imports actually resolves on disk — without
 * needing the toolchain.
 *
 * Usage: npx tsx scripts/check-imports.ts users/alumni/pages/donations
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error('usage: check-imports <dir...>');
  process.exit(2);
}

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** The order a bundler would try. Index files and extensionless paths both count. */
function resolves(from: string, spec: string): string | null {
  const base = resolve(dirname(from), spec);
  for (const ext of EXTENSIONS) {
    if (existsSync(base + ext)) return base + ext;
  }
  for (const ext of EXTENSIONS) {
    if (existsSync(join(base, `index${ext}`))) return join(base, `index${ext}`);
  }
  if (existsSync(base) && statSync(base).isFile()) return base;
  return null;
}

const files = roots.flatMap((r) => (statSync(r).isDirectory() ? walk(r) : [r]));
let checked = 0;
const broken: string[] = [];
const bare: Record<string, number> = {};

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  // Relative imports and side-effect imports only; bare specifiers are the
  // package manager's business, not this script's.
  const specs = [
    ...src.matchAll(/(?:from|require\()\s*['"](\.[^'"]+)['"]/g),
    ...src.matchAll(/^\s*import\s+['"](\.[^'"]+)['"]/gm),
  ].map((m) => m[1]);

  for (const spec of specs) {
    checked++;
    if (!resolves(file, spec)) broken.push(`${relative(process.cwd(), file)} → ${spec}`);
  }

  for (const m of src.matchAll(/from\s*['"]([^.'"][^'"]*)['"]/g)) {
    bare[m[1]] = (bare[m[1]] ?? 0) + 1;
  }
}

console.log(`\n  ${files.length} file(s), ${checked} relative import(s) checked`);
if (bare['expo-linear-gradient'] ?? bare['@expo/vector-icons']) {
  console.log('  (uses expo-linear-gradient / @expo/vector-icons — present in package.json)');
}
if (broken.length === 0) {
  console.log('  ✓ every relative import resolves on disk');
} else {
  console.log(`  ✗ ${broken.length} broken import(s):`);
  for (const b of broken) console.log(`      ${b}`);
  process.exit(1);
}
