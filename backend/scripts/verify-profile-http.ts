/**
 * MOVED to `scripts/verify-alumni/profile-http.ts`.
 *
 * This is a pointer, not a stub that silently passes. Deleting the file would leave
 * `npx tsx scripts/verify-profile-http.ts` failing with a module-not-found error that says
 * nothing about where the suite went; throwing names the new path on the first line of
 * output. The old invocation is still in the docs and in muscle memory, and the failure
 * mode being ambiguous is exactly what the suite split was meant to fix.
 *
 * It moved because the alumni suites are now split BY FEATURE under
 * `scripts/verify-alumni/`, each holding its own explicit identities. `verify-alumni.ts`
 * was 1,168 lines with a module-scoped `token` that every section reassigned, so "the
 * office is blocked" could run under whichever identity was ambient.
 *
 * See `scripts/verify-alumni/README.md` for the suite list.
 */
throw new Error(
  'This suite moved to scripts/verify-alumni/profile-http.ts — see scripts/verify-alumni/README.md',
);