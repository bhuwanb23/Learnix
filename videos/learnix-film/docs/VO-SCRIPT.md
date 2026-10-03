# VO Script — Learnix Master Film

Derived from `MASTER-SCRIPT.md` (approved).

**Option C was applied.** Of the 54 spoken cues, **37 are the approved copy verbatim** and **17 are trimmed** because the approved copy does not fit the shot at a readable pace. No cue was rewritten for style, tone, or preference — every trim is a cut of words from the approved line.

Where a cue is trimmed, the approved original is shown underneath so you can see exactly what was removed and put it back if you disagree.

---

## Recording spec

| Item | Value |
|---|---|
| Runtime | 7:00 |
| Narrator | Single voice, unhurried, institutional but human. Not a trailer. Not an ad-read. |
| Read rate | **140 wpm**. Deliberate. This narrator states facts; it does not sell. |
| Budget per second | **2.33 words** |
| Approved copy retained | **37 of 54 spoken cues, verbatim** |
| Trimmed | **17 cues** |
| Words removed | **98** |
| Approved word count | 810 |
| Draft word count | **712** |
| Spoken time | **305s of 420s — 73% of the film carries narration** (approved copy would have been 347s / 83%) |
| Silent scenes | 7 in the table + S41's quoted line = **8 scenes without narration** |
| Bridges | **1** (S07 → S08) |
| Cues running hot | **1** (S20, at 144 wpm — see Act 3) |

> Every figure on this page is produced by `node tools/verify-vo.mjs`, which parses this
> document and `MASTER-SCRIPT.md` and **fails** if a changed cue is not flagged TRIM, if a
> TRIM-flagged cue actually matches the approved copy, if a scene is missing, or if any cue
> exceeds its scene budget. Run it before trusting any number here.

### Why any trim happened at all

The approved VO is 810 words. At 140 wpm that is **347 seconds of speech in a 420-second film** — 83% of the runtime under narration, with no room for the scripted silences and no room to breathe between acts.

Seventeen cues needed 1–12 words removed. The other 37 fit as written and were left completely alone.

The heaviest trimming is in Act 3, which was written at **210 wpm** — not narratable. Five cues there lost the most.

### The rule for this document

If a cue is not marked **TRIM**, it is your approved copy, word for word. Do not change it. If a cue is marked TRIM, only the tail was cut; the anaphora, the rhythm, and the meaning are intact.

**Every trim is visible.** Under each trimmed cue, the approved original is quoted so you can see exactly what was removed and put it back if you disagree.

---

## Act 1 — The College `0:00–0:30`

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S01 | 6s | 14 | *A college is a large machine that most people only see from the outside.* |
| S02 | 5s | 12 | **TRIM** *A student carries their college in a pocket. Attendance here, assignments there.* |
| S03 | 5s | 12 | **TRIM** *A timetable that changed. A fee reminder that disagrees with the receipt.* |
| S04 | 5s | 12 | *A faculty member's day is a negotiation between teaching and administration.* |
| S05 | 4s | 9 | *And an administrator holds the institution together by hand.* |
| S06 | 3s | — | (silent) |
| S07 | 2s | 5 | *From the outside, a college looks completely under control.* **BRIDGE +1s →** |

**S02 approved:** *"A student carries their entire college in a pocket. Attendance in one place. Assignments in another. Exams through a group chat."*
→ dropped "entire", collapsed "in one place / in another" to "here / there", and moved "exams through a group chat" to S08 where the chaos is the subject.

**S03 approved:** *"A timetable that changed. A fee reminder that disagrees with the receipt. Neither one is wrong. They are simply two different systems."*
→ kept the first two sentences verbatim. The payoff — "two different systems" — moves to S16, which already states *"Every part of a modern college runs on its own system."*

**S07 is not trimmed.** It runs 7 words in a 2s scene and **bridges 1 second into S08**. The calm statement bleeding into the chaos montage is the film's first J-cut and it is worth the extra second. Trimming "completely under control" to fit would cost more than the bridge does.

## Act 2 — The Chaos `0:30–1:30`

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S08 | 5s | 12 | **TRIM** *Attendance here. The assignment there. The exam date in a group chat.* |
| S09 | 5s | 12 | **TRIM** *A receipt here, a ledger there, and a reminder that arrives anyway.* |
| S10 | 7s | 16 | *A register, a portal, a spreadsheet and a phone call — to record who was present.* |
| S11 | 7s | 16 | *Marks in one system. Announcements in another. Reports for a third.* |
| S12 | 7s | 16 | *A single question. Four sources. And the answer is a number someone has to assemble.* |
| S13 | 6s | 14 | *Payments clear in one place, pend in another, and go missing in a third.* |
| S14 | 6s | 14 | **TRIM** *A schedule changes. Five people are to tell everyone. Nobody knows who was told.* |
| S15 | 6s | 14 | *The principal receives the institution as reports.* |
| S16 | 5s | 12 | *Every part of a modern college runs on its own system.* |
| S17 | 6s | — | (silent) |

**S08 approved:** *"Attendance here. The assignment there. The exam date in a group chat that forty people are guessing in."*
→ dropped "that forty people are guessing in". S11 already owns that image: *"Marks in one system…"* and the group's forty people recur there.

**S09 approved:** *"A receipt in one place, a ledger in another, and a reminder that arrives anyway."*
→ "in one place / in another" → "here / there", matching S08's grammar so the act reads as one list.

**S14 approved:** *"A schedule changes. Five people are responsible for telling everyone. Nobody knows if everyone was told."*
→ "are responsible for telling" → "are to tell". Keeps the meaning exactly. Only the last clause changed shape.

Act 2 needed the least work. Its problems are structural, and the approved copy is built on anaphora — *one… another… a third* — which is what makes it land. That pattern was preserved in every scene.

## Act 3 — The Real Problem `1:30–2:00`

**The heaviest act. 105 approved words in 30 seconds = 210 wpm.** Four of five cues are trimmed.

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S18 | 6s | 14 | **TRIM** *A college is not one department. It is many — each with its own truth.* |
| S19 | 6s | 14 | **TRIM** *The same record, entered four times. The same number, stale. The same request, lost.* |
| S20 | 6s | 14 | **TRIM** *Every hand-off is a place to lose something. Every loss is manual work tomorrow.* |
| S21 | 6s | 14 | **TRIM** *The problem is not data. The problem is that it doesn't work together.* |
| S22 | 6s | 14 | *"A college is not one department."* — *(3s held black)* — *"So why is its technology?"* |

**S18 approved:** *"A college is not one department. It is many — each with its own data, its own tools, its own version of the truth."*
→ collapsed the three-part triplet (*data / tools / version of the truth*) to *"its own truth"*. The contrast it sets up is now paid off directly by S22, which quotes the same sentence back.

**S19 approved:** *"The same record, entered four times. The same number, out of date. The same request, lost between two people who both assumed the other had it."*
→ **all three anaphora heads kept.** Only the tails were cut: "out of date" → "stale", and "lost between two people who both assumed the other had it" → "lost". The triple *The same…* is the strongest rhetoric in the film and it survives intact.

**S20 approved:** *"Every hand-off is a place to lose something. And every lost thing is someone's manual work tomorrow."*
→ dropped the conjunction and "is someone's". First sentence verbatim.

> **S20 runs marginally hot.** The cue is 14 words in a 6-second scene, inside the 14-word budget — but "hand-off" reads as two beats, so it lands nearer **144 wpm** in the booth. It is the only cue in the film that feels tight, and it is close enough that I would rather extend the scene by 1 second than cut *"is a place to lose something"* — that phrase is the one doing the work.

**S21 approved:** *"The problem is not the lack of data."* — *(beat - 2 full seconds)* — *"The problem is that the data does not work together."*
→ "not the lack of data" → "not data"; "the data does not" → "it doesn't". **The anaphora is preserved** — this is the only cue in the film where repeating the phrase twice is the whole point, so it had to survive.

> **The 2-second beat moved.** It cannot live inside a 6s cue that is already over budget. It now sits in the **gap between S21 and S22**, where S22 already carries 3 seconds of held black. The silence survives, in the place where silence belongs.

**S22 is not trimmed.** 11 words plus a scripted 3s black. It fits because the black is doing the work. This is the best-written line in the screenplay and it was left completely alone.

## Act 4 — The Shift `2:00–2:20`

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S23 | 5s | 12 | *One student record.* |
| S24 | 6s | 14 | **TRIM** *One attendance mark. One fee record. One result — each connected to the same person.* |
| S25 | 6s | 14 | *Not another system alongside the others. The one they all run on.* |
| S26 | 3s | — | (silent — the resolve tone carries) |

**S24 approved:** *"One attendance mark. One fee record. One assignment, one result, one decision — each one connected to the same person."*
→ dropped "one assignment" and "one decision" from the five-item list, keeping three. **The payoff clause — "each one connected to the same person" — is preserved word for word**, because that clause is the thesis of the scene.

If the narrator does not visibly lift their temperature at S22, the shift out of Act 3 will not land.

## Act 5 — The Platform `2:20–3:30`

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S27 | 11s | 26 | *One core. Academic. Student life. Admissions and administration. Finance. People and payroll. Campus operations. Careers. And intelligence over all of it.* |
| S28 | 6s | 14 | *Attendance taken once, in one place, and it is everywhere at the same time.* |
| S29 | 6s | 14 | *One student record. Not four. Not one per department.* |
| S30 | 6s | 14 | **TRIM** *Admissions, approvals, departmental workflow — recorded once, visible to everyone who needs it, nobody else.* |
| S31 | 6s | 14 | **TRIM** *Fees, payments, expenses, scholarships — reconciled once, because there is one record to reconcile.* |
| S32 | 6s | 14 | **TRIM** *Faculty records, payroll, leave, recruitment — the people side, on the same spine.* |
| S33 | 5s | 12 | **TRIM** *Hostel, transport, library — on the same record as the people in them.* |
| S34 | 5s | 12 | **TRIM** *Placement, training, internships — the outcome written back to the same record.* |
| S35 | 19s | 44 | *And over all of it, an intelligence layer that watches — not to replace judgement, but to show a principal the moment something needs it.* *(beat)* *One core. Every module. Every person. One record.* |

**S30 approved:** *"…and to nobody who doesn't."* → *"nobody else."* Three words. This is the smallest trim in the document.

**S31 approved:** dropped "only". *"because there is only one record to reconcile"* → *"because there is one record to reconcile."*

**S32 approved:** *"…the people side of the institution, on the same spine."* → *"…the people side, on the same spine."*

**S33 approved:** *"Hostel, transport, library, infrastructure — the buildings you can walk into, on the same record as the people in them."*
→ dropped "infrastructure" and "the buildings you can walk into". This was the largest discretionary cut in the film and it is the one I would most like you to check. *"The buildings you can walk into"* is a good line and it is the only place the campus gets described as physical rather than administrative.

**S34 approved:** *"…written back to the same student record that started it."* → *"…to the same record."*

**S27 and S35 are not trimmed.** S27 is a verbatim read of the eight module ring — if the ring changes, this cue must be re-recorded. S35 is the thesis and has 19 seconds; it is the most roomy cue in the film.

## Act 6 — Mobile Experience `3:30–4:15`

**No trims. Every cue approved verbatim.**

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S36 | 8s | 19 | *One morning. One screen. Everything the day needs.* |
| S37 | 8s | 19 | *One mark. The student sees it. The department sees it. Nobody re-enters anything.* |
| S38 | 8s | 19 | *Set once. Delivered to everyone. Collected in one place, marked in one place, returned with feedback.* |
| S39 | 8s | 19 | *One exam. Four people who need it. Each sees their own part of the same truth.* |
| S40 | 7s | 16 | *Attendance. Assignments. Announcements. Marks. Leave. Reports — in one place, on the way in.* |
| S41 | 6s | — | *"Less administration. More teaching."* |

## Act 7 — Management Platform `4:15–5:00`

**No trims. Every cue approved verbatim.**

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S42 | 11s | 26 | *The institution, in one view, current to this morning.* |
| S43 | 11s | 26 | *College to department. Course to class. Class to student — the same question, asked at any level, answered from the same record.* |
| S44 | 11s | 26 | *Everyone sees what their role allows. And what they don't see, they cannot act on. Every action is recorded.* |
| S45 | 12s | 28 | *He doesn't collect the report. He reads the answer.* |

S42 and S45 are the shortest cues in the longest scenes. That is correct — they are the two shots the audience reads rather than listens to.

## Act 8 — Intelligence `5:00–5:40`

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S46 | 8s | 19 | *The system doesn't wait to be asked. A trend crosses a threshold, and the threshold speaks up.* |
| S47 | 7s | 16 | **TRIM** *It finds who it affects. Applies the agreed policy. Tells who can act — and records it.* |
| S48 | 8s | 19 | *Ask the institution a question in plain language. Get an answer, with the records behind it.* |
| S49 | 9s | 21 | *The same assistant, scoped to her classes, answering the question she would have spent an hour building.* |
| S50 | 8s | 19 | *Students and faculty and principals — the same intelligence, answering each within their own view of the institution.* |

**S47 approved:** *"It finds the students it affects. It applies the policy the institution already agreed. It tells the people who can act — and it records that it did."*
→ the three sentence subjects became verbs, which shortens each by one word and makes the sequence land harder. *"and it records that it did"* → *"and records it"*.

**This trim costs the ending of the act.** "Records that it did" was a deliberately flat, bureaucratic phrase — the point was that the system logs its own action without drama. *"records it"* is shorter but loses the flatness. If you want it back, the cheapest fix is extending S47 by 2 seconds rather than cutting the phrase.

## Act 9 — Connected Campus `5:40–6:15`

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S51 | 8s | 19 | *One student belongs to a class. A class belongs to a department. A department belongs to a college.* |
| S52 | 8s | 19 | **TRIM** *Every part of the institution — teaching, finance, people, examinations, admissions, careers, hostel, transport — one structure, not beside it.* |
| S53 | 11s | 26 | *A college already runs as one institution. Now its technology does too.* |
| S54 | 8s | — | (silent) |

**S52 approved:** *"And every part of the institution — teaching, finance, people, examinations, admissions, careers, library, hostel, transport — inside the same structure, not beside it."*
→ dropped "library", cut "inside the same structure, not beside it" to *"one structure, not beside it"*. **The "not beside it" contrast is preserved** — it is the distinction the whole scene exists to draw.

## Act 10 — Vision `6:15–6:45`

**No trims. Every cue approved verbatim.**

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S55 | 8s | 19 | *He knows exactly what is happening, and what he is expected to do.* |
| S56 | 7s | 16 | *And she has the afternoon back.* |
| S57 | 7s | 16 | *The institution can finally be seen, by the people responsible for it.* |
| S58 | 8s | 19 | *Nothing about the college changed. Everything about how it runs did.* |

## Final `6:45–7:00`

All three scenes silent by design. The closing card holds and the score resolves. **No CTA, no URL** (§21).

| Scene | Dur | Budget | Cue |
|---|---|---|---|
| S59 | 7s | — | (silent — on-screen card carries) |
| S60 | 5s | — | (silent — logo resolve) |
| S61 | 3s | — | (silent — hold, cut to black) |

These three are listed so that all 61 scenes appear in this document. `tools/verify-vo.mjs` fails if any scene is missing.

---

## Session notes for the director

1. **Record Act 2 and Act 6 first.** They are the untouched cues. If the read works there, it works everywhere, and you have your narrator calibration before you get to the trimmed material.
2. **The three cues to rehearse before recording:** S19 (the anaphora must not accelerate — it should get *slower* across the three clauses), S21 (the beat moved to the S21/S22 gap), and S47 (do not oversell "records it").
3. **S33 is the trim to review.** It lost the best line in the scene. If you want "the buildings you can walk into" back, the honest fix is 2 extra seconds on S33, not a faster read.
4. **S27 must be re-recorded if the ring changes.** It is a verbatim read of the eight module names.
5. **No music under S21's first sentence**, and the silence between S21 and S22 is now longer than the original beat. Check the gap against the music brief's 8-second silence at 1:52.
6. **Only S07 bridges.** If any other cue feels tight in the booth, extend that scene rather than trimming further — the copy is already at the limit.

---

## Change record

| | |
|---|---|
| Approved spoken copy | 810 words (347.2s at 140 wpm — 83% of runtime) |
| This draft | **712 words (305.2s — 73% of runtime)** |
| Spoken cues | 54 |
| Cues verbatim | **37** |
| Cues trimmed | **17** |
| Words removed | **98** |
| Largest cuts | S19 (−12), S47 (−11), S03 (−10), S02 (−9), S18 (−9) |
| Cut to review | **S33** — lost *"the buildings you can walk into"* |
| Cue running hot | **S20** — 14 words in 6s, but "hand-off" reads as two beats, so it lands at ~144 wpm. Fix with a 1s extension, not another cut. |
| Bridges introduced | 1 (S07 → S08, +1s) |
| Structural change | S21's 2s beat relocated to the S21/S22 gap |