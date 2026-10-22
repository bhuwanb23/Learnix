/**
 * The full regression sweep.
 *
 * Every `check-*`, `verify-*` and `audit-*` suite in `scripts/`, run in turn, with the tally
 * collected. The point is not the tally — it is that a change to the courses desk cannot have
 * quietly broken the exam cell, the hostel or the accounts desk.
 *
 * IT WALKS THE SUBDIRECTORIES TOO, because some suites were split BY FEATURE and moved into
 * `scripts/verify-alumni/` and `scripts/verify-hostel/`. A sweep that only reads the top level
 * would skip them, and "the sweep is green" would be a claim about a suite set that is smaller
 * than the one it names.
 *
 * THE LIVE-SERVER SUITES, AND THE RATE LIMITER
 * --------------------------------------------
 * Some suites talk to a running server on port 4000 rather than starting their own, and the
 * auth limiter is 300 requests a minute. Ninety-odd suites in a row exhaust it, and the suites
 * that fail are not broken — they are told "429 Too Many Requests" and the assertion count
 * collapses to zero.
 *
 * So the sweep RESTARTS the server and RETRIES a suite once when it fails in that way. A suite
 * that fails on its own merits is left failing: the retry is for the limiter, and it only
 * happens on a limiter-shaped failure.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/run-all-suites.ts
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..');
const PORT = 4000;

/**
 * Every suite file, at any depth, relative to `scripts/`.
 *
 * The match is on the RELATIVE PATH, not the file name: some suites were split BY FEATURE and
 * moved into `scripts/verify-alumni/` and `scripts/verify-hostel/`, where the files are named
 * `dashboard.ts`, `profile-http.ts` and so on. A sweep that only looked at the file names would
 * skip them, and "the sweep is green" would be a claim about a suite set smaller than the one it
 * names.
 */
function findSuites(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) findSuites(abs, out);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      const rel = path.relative(HERE, abs).split(path.sep).join('/');
      if (/^(check|verify|audit)-/.test(rel)) out.push(rel);
    }
  }
  return out;
}

// ── The live server ─────────────────────────────────────────────────────────

let server: ReturnType<typeof spawn> | null = null;

function startServer() {
  stopServer();
  server = spawn(
    process.execPath,
    [path.join('node_modules', 'tsx', 'dist', 'cli.mjs'), 'src/server.ts'],
    { cwd: BACKEND, detached: false, stdio: 'ignore' },
  );
  server.unref();
}

function stopServer() {
  if (server) {
    try {
      server.kill();
    } catch {
      /* already gone */
    }
    server = null;
  }
}

/** The limiter's shape: a 429, or a refused connection. */
function isLimiterFailure(out: string): boolean {
  return (
    /429/.test(out) ||
    /Too Many Requests/.test(out) ||
    /Cannot reach http/.test(out) ||
    /ECONNREFUSED/.test(out) ||
    /Assertion failed: !\(handle->flags/.test(out)
  );
}

function runSuite(name: string) {
  const r = spawnSync(
    process.execPath,
    [path.join('node_modules', 'tsx', 'dist', 'cli.mjs'), path.join('scripts', name)],
    { cwd: BACKEND, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 },
  );
  return { code: r.status ?? -1, out: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

const suites = findSuites(HERE).sort();
const results: { name: string; code: number; passed: number; failed: number; note: string }[] = [];

startServer();
await new Promise((r) => setTimeout(r, 8000));

for (const name of suites) {
  let { code, out } = runSuite(name);

  // THE RETRY. A limiter-shaped failure is not a broken suite, so the server is restarted and
  // the suite is run again — ONCE, and only for that shape of failure.
  if (code !== 0 && isLimiterFailure(out)) {
    startServer();
    await new Promise((r) => setTimeout(r, 8000));
    const retry = runSuite(name);
    if (retry.code === 0) {
      out = `${out}\n--- retried after a server restart ---\n${retry.out}`;
      code = 0;
    } else {
      out = `${out}\n--- retried after a server restart ---\n${retry.out}`;
      code = retry.code;
    }
  }

  const pm = out.match(/(\d+)\s+passed,\s*(\d+)\s+failed/);
  const passed = pm ? Number(pm[1]) : 0;
  const failed = pm ? Number(pm[2]) : 0;
  const note = failed > 0
    ? out
        .split('\n')
        .filter((l) => l.trim().startsWith('!') || l.trim().startsWith('- '))
        .slice(0, 4)
        .map((l) => l.trim())
        .join(' | ')
    : '';
  results.push({ name, code, passed, failed, note });
  const mark = code === 0 ? 'ok  ' : 'FAIL';
  console.log(
    `  ${mark} ${name.padEnd(46)} ${String(passed).padStart(5)} passed` +
      (failed > 0 ? `, ${failed} failed` : ''),
  );
}

stopServer();

const totalPassed = results.reduce((s, r) => s + r.passed, 0);
const totalFailed = results.reduce((s, r) => s + r.failed, 0);
const broken = results.filter((r) => r.code !== 0);

console.log(`\n${suites.length} suites · ${totalPassed} passed · ${totalFailed} failed`);
if (broken.length) {
  console.log(`\n${broken.length} suite(s) exited non-zero:`);
  for (const b of broken) {
    console.log(`  ${b.name} (exit ${b.code})`);
    if (b.note) console.log(`    ${b.note}`);
  }
}

