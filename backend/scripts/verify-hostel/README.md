# Hostel HTTP verification suites

The hostel module is verified over HTTP by four files, split so that the read half and the
mutating half never interleave:

```bash
npx tsx scripts/verify-hostel/residents.ts
npx tsx scripts/verify-hostel/rooms.ts
npx tsx scripts/verify-hostel/gate-passes.ts
npx tsx scripts/verify-hostel/visitors.ts
```

The server must be listening on `:4000` (`npm run dev`). Every suite exits with a "cannot reach"
message rather than a `fetch failed` stack trace if it is not.

## The suites

| Suite | Covers |
|---|---|
| `residents.ts` | Directory, facets, fee-status partition, search, paging, profile, sub-resources, contact CRUD, primary demotion |
| `rooms.ts` | Directory, facets, status partition, search, paging, detail, per-room history, bed maintenance, role gate |
| `gate-passes.ts` | Both sides of the desk: student request/withdraw, warden inbox/detail/overdue, decide, exit, return, the 400-vs-422 split, and the two-sided role boundary |
| `visitors.ts` | The same two-sided shape for a visit: resident authorisation, warden confirmation, entry/exit, the barred list, `PUT /visitors/policy` persistence, and the gate refusing a barred visitor |

## `visitors.ts` needs a third identity, and so does `gate-passes.ts`

Both files hold three: the warden, an ordinary student (to prove the warden area is refused), and
a **resident** whose own list the suite reads and writes. Neither can assert the split with two.

For the resident, `gate-passes.ts` picks someone the seed gives **no passes**; `visitors.ts` does
the same and asserts it, because the one-open-pass rule would otherwise turn every write into a 409
and the suite would exit green having tested nothing. That assertion has to be about *open* passes
rather than *no* passes — reaching a terminal state is not a restore, so closed rows accumulate
legitimately and demanding zero rows would fail on the suite's own second run.

## A suite whose result depends on the time of day is not a suite

`visitors.ts` hit this twice, and both are worth knowing about before writing another:

- The authorisation window was `now + 3h … now + 5h`, which passes all afternoon and fails after
  20:00, because 23:00→01:00 spans local midnight and this hostel has `dayVisitsOnly` on. The
  service was right; the fixture was wrong. It now anchors to a fixed **local** hour, using the
  institution's own UTC offset.
- A `Date.now()`-relative instant is fine for a **corrected** gate time (`at:`), which is a warden
  correcting a mis-key, and wrong for an **authorisation window**, which is subject to the day
  rule.

`check-hostel-visitors.ts` made the same correction for the same reason, and sets
`dayVisitsOnly: false` for its workflow section so the day rule can be tested on purpose rather
than by accident of the hour.

## `gate-passes.ts` is the only one that logs in as a student

Residents and rooms are warden-only surfaces, so their suites hold one identity. A gate pass is
created by a **student** and decided by a **warden**, across two different routers with two
different role gates. The load-bearing property is that a student cannot reach the decision
route and a warden cannot reach the creation route, so this suite holds three identities:

- the chief warden, for the inbox and the decision
- an ordinary student, to prove the warden area is refused
- a student chosen because the seed gives them **no gate passes at all**, to drive a full
  lifecycle without tripping the one-open-pass rule

That last one is asserted, not assumed. If the seed ever gives that student a pass, every write
below would 409 and the suite would still exit green while testing nothing. Closed passes are
allowed to accumulate, so the precondition is "no **open** pass" rather than "no passes" — each
run deliberately leaves one `RETURNED` and one `CANCELLED` row behind, both of which block
nothing, so the suite is re-runnable indefinitely.

## Why this is a directory

It started as one `verify-hostel-http.ts`. Growing the rooms half into it would have pushed it
past 700 lines, but size is the lesser problem: the two halves want different kinds of fixture.

`residents.ts` writes CONTACT rows and deletes exactly those. `rooms.ts` exercises the whole
allocation lifecycle — allocate, transfer, withdraw a bed, return it, vacate — and restores
occupancy afterwards. Interleaved in one file, a failure partway through could leave the hostel
in a state the next section's assertions could not interpret, and a person reading a failure
would have to work out which half's fixture had been disturbed.

Each suite logs in for itself and holds its identity in an `Actor`, so an ambient-token mistake
is not expressible — the same discipline `verify-alumni/` established.

## What only HTTP can prove

`check-hostel-rooms.ts`, `check-hostel-residents.ts` and `check-hostel-gate-passes.ts` run
against the database directly and prove the queries, the tenant scoping and the invariants. None
can prove:

- that a route is wired at all (`transferBed` was fully implemented, routed, and documented as a
  room action, and **no screen had ever called it** — a fault only visible end to end)
- that a zod schema rejects the wrong shapes, and that the schema and the service agree
- what status code a client actually receives, as opposed to what the service throws
- that route declaration ORDER is right — `/rooms/:roomId` declared before a sibling static
  segment would swallow it, and so would `/gate-passes/:id` over `/gate-passes/overdue`
- **that a mutation returns the shape the rest of the API reads.** Every gate-pass mutation
  originally returned a hand-rolled stub — `{ id, status }` — while every read returned the full
  shaped pass. Nothing in the database was wrong and no DB-level assertion could see it; only a
  response body carrying `lifecycle` exposed that a client could not render the result of the
  action it had just performed.

## Cross-tenant coverage is split, deliberately

`rooms.ts` has credentials for one institution only, so it cannot assert that institution B is
refused A's bed. That is asserted in `check-hostel-rooms.ts`, which creates two institutions and
two wardens and proves the refusal in both directions. What `rooms.ts` *can* prove is that the
room routes are institution-scoped at all, and that the id-keyed route does not resolve a room
number — the old `/rooms/:roomNumber` route used `findFirst`, which silently served an arbitrary
room whenever two blocks held the same number.

The same split applies to gate passes: the HTTP suite proves the routes are institution-scoped
and that the role gates hold, while `check-hostel-gate-passes.ts` creates two institutions to
prove the refusal in both directions — including that a request only pages the warden in its
**own** institution. `UserRole` carries no `institutionId` of its own, so a role-only lookup
pages every hostel warden in the deployment, which is a cross-tenant disclosure of one
student's trip and is invisible from a single-institution HTTP run.

## Restores are asserted

Both suites change seeded data and put it back, then CHECK the put-back — the `verify-alumni/`
rule. A suite that leaves seeded rows changed cannot be re-run without drifting them a little
further each time, which is how a verification suite ends up corrupting the data it verifies.

`gate-passes.ts` satisfies this without a restore step: it creates no seeded row and edits none,
it only drives its own new passes to terminal states. Section 8 asserts the terminal state, so a
run that died mid-lifecycle is visible rather than silently left open.

`visitors.ts` goes further and **deletes** its own rows, because a visitor fixture is easier to
accumulate: it records the id of everything it created and removes those ids (plus the
notifications whose deep-link payload mentions them) in a `.finally`, so a run that throws still
restores. It also rewrites the visitor policy twice — once to prove the rules are writable, once
to put them back — and asserts the restore took.