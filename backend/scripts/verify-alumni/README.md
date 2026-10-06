# Alumni HTTP verification suites

`verify-alumni.ts` was one 1,168-line file covering fifteen unrelated areas, with a single
module-scope `token` that every section reassigned. That is not a size complaint — it is a
correctness one. A section asserting "a graduate cannot manage an event" could run under
whichever identity happened to be current, and the file's own comments admitted that was
how you assert the wrong thing.

These suites are the split. Each logs in for itself and holds its identities as `Actor`
objects, so an ambient-token mistake is not expressible. Run any of them alone:

```bash
npx tsx scripts/verify-alumni/<suite>.ts
```

The server must be listening on `:4000` (`npm run dev`); every suite exits with a
"cannot reach" message rather than a `fetch failed` stack trace if it is not.

## The suites

| Suite | Covers | Notes |
|---|---|---|
| `directory.ts` | Dashboard, directory list/detail, RBAC, facets & filters, chapter reads | Read-only. No fixture to unwind, so no ordering dependency. |
| `events.ts` | Event list, scopes, facets, detail, attendance-is-not-CONFIRMED | Read-only half. |
| `events-writes.ts` | Agenda CRUD, registration lifecycle, attendance, QR check-in, feedback, cancellation | Mutates seeded rows; every mutation is undone and the undo is asserted. |
| `privacy-networking.ts` | Privacy gate, connections, matches, `/alumni/me` writes | Changes privacy and restores it. Needs two real identities. |
| `profile-http.ts` | Self-service profile: unredacted read, skills, career, achievements, verification, links, privacy, sessions | Replaces the old `§9 Profile` block. |

## What moved where, and why

**`§9 Profile` moved out entirely.** It asserted that `GET /alumni/profile` returned
`{ fullName, roles, programStats }` — a summary card that a literal route of the same
name *shadowed* the real profile sub-router with. The assertion was covering an endpoint
that the profile screens never called. `profile-http.ts` asserts the actual self-service
contract instead.

**Read and write halves are separate files.** `events-writes.ts` leaves `checkedInAt`
changed for a moment; `events.ts` asserts on attendance figures. Keeping them apart means
the read suite can be re-run repeatedly without first running a suite that mutates the
seed.

**Restores are asserted, not assumed.** The old suite set a seeded graduate's headline
and skills on every run and never put them back, so re-running it drifted the seed each
time. The new suites restore and then check the restore.

## Still to split

`verify-alumni.ts` retains the sections that have not been extracted yet, as literal
copies of the old code:

- donations (record / re-record / restore)
- mentorship (the full lifecycle)
- chapters v2 (regions, leadership, initiatives, and the scratch-chapter teardown)
- notifications and broadcast

The scratch-chapter teardown in particular is worth extracting carefully: it cascades a
chapter presidency away and has to put the successor back, and a botched extraction would
leave a seeded chapter without its officer.

When those are extracted, `verify-alumni.ts` should shrink to a thin runner that imports
each suite in turn, rather than being deleted outright — so `npx tsx scripts/verify-alumni.ts`
keeps working as the "run everything" entry point.