# Hostel HTTP verification suites

The hostel module is verified over HTTP by two files, split so that the read half and the
mutating half never interleave:

```bash
npx tsx scripts/verify-hostel/residents.ts
npx tsx scripts/verify-hostel/rooms.ts
```

The server must be listening on `:4000` (`npm run dev`). Both suites exit with a "cannot reach"
message rather than a `fetch failed` stack trace if it is not.

## The suites

| Suite | Covers |
|---|---|
| `residents.ts` | Directory, facets, fee-status partition, search, paging, profile, sub-resources, contact CRUD, primary demotion |
| `rooms.ts` | Directory, facets, status partition, search, paging, detail, per-room history, bed maintenance, role gate |

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

`check-hostel-rooms.ts` and `check-hostel-residents.ts` run against the database directly and
prove the queries, the tenant scoping and the invariants. Neither can prove:

- that a route is wired at all (`transferBed` was fully implemented, routed, and documented as a
  room action, and **no screen had ever called it** — a fault only visible end to end)
- that a zod schema rejects the wrong shapes, and that the schema and the service agree
- what status code a client actually receives, as opposed to what the service throws
- that route declaration ORDER is right — `/rooms/:roomId` declared before a sibling static
  segment would swallow it

## Cross-tenant coverage is split, deliberately

`rooms.ts` has credentials for one institution only, so it cannot assert that institution B is
refused A's bed. That is asserted in `check-hostel-rooms.ts`, which creates two institutions and
two wardens and proves the refusal in both directions. What `rooms.ts` *can* prove is that the
room routes are institution-scoped at all, and that the id-keyed route does not resolve a room
number — the old `/rooms/:roomNumber` route used `findFirst`, which silently served an arbitrary
room whenever two blocks held the same number.

## Restores are asserted

Both suites change seeded data and put it back, then CHECK the put-back — the `verify-alumni/`
rule. A suite that leaves seeded rows changed cannot be re-run without drifting them a little
further each time, which is how a verification suite ends up corrupting the data it verifies.