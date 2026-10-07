/**
 * Shared harness for the `verify-alumni-*` suites.
 *
 * WHY THIS EXISTS
 * ---------------
 * `verify-alumni.ts` grew to 1,168 lines covering fifteen unrelated areas in one file:
 * dashboard, directory, events, donations, mentorship, chapters, notifications,
 * profile, RBAC, privacy, networking and three rounds of chapter features. Two things
 * went wrong as a result, both of them about editing rather than about size:
 *
 *   1. A single `token` module-scoped variable, reassigned by every section that logs
 *      in as somebody else. A test asserting "the office is blocked" could run under
 *      whichever identity happened to be current — and the file's own comment admits
 *      this is how you assert the wrong thing. Nothing enforced it.
 *   2. `check`/`call`/`loginAs` were copy-paste candidates, so the fix for (1) was
 *      discipline ("MUST use OFFICE_TOKEN") rather than a type. Discipline is not a
 *      guarantee.
 *
 * The harness makes the mistake impossible: an `Actor` owns its token and passes it
 * explicitly, so there is no ambient identity for a section to get wrong.
 *
 * IT DOES NOT RUN ANYTHING
 * ------------------------
 * This module only provides plumbing. The suites are the entry points; import this,
 * do not execute it.
 */
import { prisma } from '../src/db/prisma.js';

export const BASE = process.env.BASE_URL ?? 'http://localhost:4000/api/v1';
export const PASSWORD = 'Passw0rd!';

/** Office account. The seed's Director of Alumni Relations. */
export const OFFICE_EMAIL = 'priya@learnix.dev';
/** An ordinary graduate, for privacy and permission assertions. */
export const GRADUATE_EMAIL = 'alumni.aniket.gowda@learnix.dev';
/** A second graduate, so "another person's view" is a real second person. */
export const OTHER_GRADUATE_EMAIL = 'alumni.farhan.rao@learnix.dev';

export type ApiResponse<T = any> = {
  status: number;
  data: T;
  error?: { code?: string; message?: string };
};

/**
 * An authenticated identity.
 *
 * `withToken` exists so a multi-identity call names both: `office.call('GET', …,
 * graduate.token)`. A section that needs to act as somebody else says so at the call
 * site instead of relying on which token happens to be ambient.
 */
export class Actor {
  constructor(
    readonly email: string,
    readonly token: string,
    readonly roles: string[],
    /** Kept so session-revocation can be asserted by replay, which is the only real proof. */
    readonly refreshToken?: string,
  ) {}

  get isOffice(): boolean {
    return this.roles.includes('ALUMNI_OFFICE');
  }

  /**
   * The 4th argument accepts either a raw bearer token (the identity-swap escape hatch,
   * `office.call('GET', '/x', undefined, graduate.token)`) or a header map for calls
   * that must send something besides Authorization — currently only `X-Refresh-Token`
   * on `/auth/sessions`.
   *
   * A header map never overrides Authorization. Identity is what this class exists to
   * make explicit, so letting a header bag swap it would reintroduce the ambient-token
   * bug the harness was written to remove.
   */
  async call<T = any>(
    method: string,
    path: string,
    body?: unknown,
    tokenOrHeaders?: string | Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const token = typeof tokenOrHeaders === 'string' ? tokenOrHeaders : this.token;
    const extraHeaders = typeof tokenOrHeaders === 'object' && tokenOrHeaders !== null ? tokenOrHeaders : {};
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...extraHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: T;
      error?: { code?: string; message?: string };
    };
    return { status: res.status, data: json.data as T, error: json.error };
  }

  /** Same call, but as `other`. Named so the intent is visible at the call site. */
  async callAs<T = any>(other: Actor, method: string, path: string, body?: unknown) {
    return this.call<T>(method, path, body, other.token);
  }
}

/**
 * Log in as the office and assert the role is actually there.
 *
 * The old suites took whichever token happened to be ambient, which is how "the office
 * is refused" ended up being asserted while running as a graduate. Every suite starts
 * with this, and `isOffice` is checked rather than assumed — a seed change that quietly
 * demotes the account should fail here, loudly, instead of making forty permission
 * assertions pass for the wrong reason.
 */
export async function officeLogin(): Promise<Actor> {
  const actor = await login(OFFICE_EMAIL);
  if (!actor.isOffice) {
    console.error(`\n  ${OFFICE_EMAIL} does not hold ALUMNI_OFFICE (roles: ${actor.roles.join(', ') || 'none'}).`);
    console.error('  Office-only assertions would silently pass as a graduate. Fix the seed.\n');
    process.exit(1);
  }
  return actor;
}

async function login(email: string): Promise<Actor> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { accessToken?: string; refreshToken?: string; user?: { roles?: string[] } };
  };
  const token = json.data?.accessToken;
  if (!token) throw new Error(`login failed for ${email} — is the server on ${BASE}?`);
  // The refresh token is kept on the Actor because session-revocation assertions need it.
  // Revoking a session cannot be observed through the access token — a JWT that has already
  // been issued stays valid until it expires — so "was this session really killed?" can only
  // be answered by replaying the refresh token. Discarding it at login made that untestable,
  // and it was tested wrongly instead (by asserting the next access-token call returned 401).
  return new Actor(email, token, json.data?.user?.roles ?? [], json.data?.refreshToken);
}

export { login as loginAs };

/** A tally shared across one suite's sections. */
export class Tally {
  pass = 0;
  fail = 0;
  readonly failures: string[] = [];

  check(label: string, ok: boolean, detail = ''): boolean {
    if (ok) {
      this.pass++;
      console.log(`  \u2713 ${label.padEnd(48)} ${detail}`);
    } else {
      this.fail++;
      this.failures.push(label);
      console.log(`  \u2717 ${label.padEnd(48)} ${detail}`);
    }
    return ok;
  }

  /** Print the tally and exit. Always ends the process. */
  finish(title: string): never {
    const rule = '\u2550'.repeat(58);
    console.log(`\n${rule}`);
    console.log(`  ${title}`);
    console.log(`  ${this.pass} passed, ${this.fail} failed`);
    if (this.failures.length) console.log(`  failing: ${this.failures.join(', ')}`);
    console.log(rule);
    process.exit(this.fail === 0 ? 0 : 1);
  }
}

export function banner(title: string) {
  const rule = '\u2550'.repeat(58);
  console.log(`\n${rule}\n  ${title}\n${rule}`);
}

export function section(n: number | string, title: string) {
  console.log(`\n\u2500\u2500 ${n}. ${title}`);
}

/** Unique-per-run marker for scratch rows, so a re-run never collides with its own leftovers. */
export function stamp() {
  return String(Date.now() % 100000000);
}

/**
 * Assert the server is up and the seeded accounts exist.
 *
 * Called at the top of every suite so the failure message is "start the server"
 * rather than a stack trace from `fetch failed` thirty lines later.
 */
export async function requireServer(): Promise<void> {
  try {
    const actor = await login(OFFICE_EMAIL);
    if (!actor.token) throw new Error('no token');
  } catch (e) {
    console.error(`\n  Cannot reach ${BASE}.\n  ${(e as Error).message}`);
    console.error('  Start the server first: npm run dev\n');
    process.exit(1);
  }
}

/**
 * Every suite runs through this rather than calling `main()` itself.
 *
 * It closes the Prisma connection before exiting. Without it, a suite that ends in
 * `tally.finish()` — which calls `process.exit` — leaves the connection pool open and
 * the next suite in the same shell can inherit a stale pool. It also prints a pointer to
 * the sibling suites, so someone who just ran one half of a split file finds the other
 * half instead of assuming they have covered everything.
 */
export async function runSuite(title: string, main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (e) {
    // The title goes in the crash banner, not just the success banner. A stack trace
    // with no suite name on it is the ambiguity this split exists to remove — half the
    // point of separate files is knowing WHICH file threw.
    console.error(`\n  ${title} threw:`);
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }
}

export { prisma };