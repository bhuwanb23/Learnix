---
format: 1920x1080
duration: 75s
message: "One student's twenty seconds of waiting, and the eleven apps that make it resolve."
arc: BAB — before → after tease → bridge/product → step 1 → step 2 → wow → CTA
audience: college administrators and department heads evaluating an ERP; secondary audience is developers evaluating the build
mode: collaborative
music: none
---

## Locked

Approved by the user at the § 1 plan gate and again at the § 2 sketch gate (`storyboard.html` v1,
opened from `file://`). Layout, copy, brand treatment, beat order and duration are settled. Step 4
dresses these layouts; it does not redraw them.

- Arc BAB, 8 frames, 1920x1080, 75s, **fully silent** — no narration and no music
  (`music: none` + no `SCRIPT.md`). The user chose silence over adding an API key. Consequence
  accepted knowingly: reveals are paced to the held beats and the dead air, not to speech, and the
  reveal model in `## Video direction` is adapted accordingly.
- No `SCRIPT.md` is produced and none should be authored later; adding one would silently flip the
  project out of the silent marker and start a TTS step that has no credential.
- Hero prop: the locked badge, planted in 01 and paid in 07. The assignment title is held constant
  from 01 to 05 so the handoff reads as one object changing hands. The amber pending dot is the
  second callback, orphaned in 03.
- Bans: no isometric 3D campus, no floating-UI-on-gradient, no stock footage, no checkmarked
  feature list, no glow beyond the mark's ignition, no side-by-side explainer layout, no fake product
  UI beyond the DOM detail 01 rebuilds for crispness, no static endcard, no trial CTA. Motion
  failures to avoid: the slideshow and the screensaver.
- Held frames: 02 (second line), 03 (orphaned dot), 07 (four seconds), 08 (two seconds).

## Still open

- None. Music was the last open decision and it resolved to silence.

## Video direction

The invariants every frame inherits. Per-frame Scene lines carry only the delta.

**Palette system** — from `frame.md`, never invented. Canvas `bg #F5F7F9`; cards `surface #FFFFFF`
with a 1px `rgba(37,99,235,.20)` border and a `rgba(37,99,235,.04)` fill; ink `text #0F172A`; the
secondary text ladder `text-muted #64748B` → `text-light #94A3B8`; `primary #2563EB` reserved for
the single accent per frame (the active state, a counted figure, a drawn underline). Status hues are
load-bearing, not decorative: `amber #B45309` means *blocked on someone else*, `positive #059669`
means *resolved*. **No shadows anywhere** — the pack forbids them and Learnix's own cards have none.
Radii 10 / 12 / 14, pill 100.

**Type** — by role, from `frame.md`. Display and numerals: Plus Jakarta Sans 700. Body and chrome:
Manrope 400 / 600, the latter at `.08em` uppercase for eyebrows. Chrome type carries the voice here,
because there is no voiceover.

**Motion grammar** — smooth long-tail settles (`power3`; `expo.out` on fast arrivals). Overshoot is
banned as a default; the one sanctioned exception is the brand mark's glow ignition in 04, which
reads as a light switching on rather than a bounce. Entrances use explicit from-state.

**Reveal model — adapted for a silent film.** The house model paces reveals to the voiceover. There
is no voiceover, so reveals are paced to **held beats and dead air** instead, which serves the same
purpose: nothing is on screen at t=0 except what the frame opens on, and each further piece arrives
across the back half of its window rather than in the first quarter. The dead air *is* the timing —
frames 03 and 07 hold long on purpose.

**Stillness allocation.** Held reads, deliberately placed so the film is not uniformly busy:
02 holds on its second line for roughly half its length; 03 holds an orphaned dot for most of its
length; 07 holds the resolved state for four seconds; 08 holds two seconds after everything settles.
During any hold the only sanctioned aliveness is **subtle jitter** (`sine-wave-loop`, low amplitude)
on one element — never circular breathing, never a drifting camera. Where a status dot must read as
"live", its pulse is a **finite** tween, not a repeat.

**Negative list.** No off-brand texture; no isometric 3D campus; no floating-UI-on-gradient; no stock
footage; no checkmarked feature list; no glow beyond the mark's ignition; no side-by-side explainer
layout; no fake product UI beyond the DOM detail 01 rebuilds for crispness; no static endcard; no
trial CTA. Both motion failure modes are banned by name: **the slideshow** (everything dumped in the
first quarter, then frozen) and **the screensaver** (elements floating independently).

**Caption band** — bottom ~17% reserved in every frame's plan even though captions are disabled, so
bottom-edge composition stays consistent across the film.

**Asset integrity rule for this project.** Screens are real 1920px-wide captures, every one of them
*taller* than 16:9 (ratios 0.89–1.62). A capture is never magnified past 1:1 — anything opened as a
macro must be rebuilt in DOM so it survives magnification, and anything taller than the frame is
scaled into its window rather than cropped. Panned or scrolled surfaces clip at the card **and** mark
the moving layer `data-layout-allow-overflow`, or `check` will report overflow errors.

---

## Frame 1 — The Wait

- scene: Tight on a single status pill reading "Submitted (Pending Grade)"; the frame slowly pulls back to reveal the whole assignment screen around it.
- voiceover:
- duration: 11s
- transition_in: cut
- status: animated
- src: compositions/frames/01-the-wait.html
- type: hook
- persuasion: Pain validation
- beat: tension
- blueprint: zoom-out-workspace-reveal (Adapt)
- asset_candidates: assets/screen-under-review.png — student assignment screen, status card reading "Submitted (Pending Grade)", plus a locked badge lower-right, 1920x1198, hero asset
- focal: assets/screen-under-review.png
- roles: screen-under-review.png = focal (the locked wide; never magnified)
- sfx:

Adapt: keep the single continuous decelerating pull-back and the post-lock act, and keep the hard rule
that the camera's only scale motion is outward. Change one thing — the opening macro is a DOM-rebuilt
status card rather than a magnified crop of the capture, because a 1920px raster cannot survive the
4× magnification the shape opens at. The capture is used for the wide, where it is at 1:1.

Scene 1 (0.0–2.5s): full-bleed extreme close-up of the DOM status card — amber dot, "Submitted",
"(Pending Grade)" — filling the frame edge to edge with no chrome, no surrounding card, no page. The
dot pulses on a **finite** tween (`svg-icon-enrichment`); the pull-back is already running underneath
and the camera never waits. Centered, single dominant element by weight and scale.
Scene 2 (2.5–5.0s): the continuing pull resolves an intermediate level — the assignment title and the
instructor's "5–7 business days" note resolve around the pill as partial letterforms still filling
frame, so the viewer re-scopes once without learning the container. Text is static in world space and
the camera's pull produces the descent (`viewport-change`).
Scene 3 (5.0–8.0s): the signature move — one continuous decelerating zoom-out completes with strong
exponential deceleration (`expo.out` class, via `viewport-change` aimed at the measured status-card
centre after `fonts.ready`). The real capture resolves beneath the DOM world and the frame **LOCKS**.
Scene 4 (8.0–11.0s): element-level payoff on the locked wide, camera now dead. The locked-badge row
resolves last, a one-way alpha settle (`gsap-effects`), and the rest of the screen holds at reduced
contrast so the eye lands on the badge. Nothing else moves.

narrativeRole: Opens on the viewer's own experience rather than on the product. Every person who has submitted schoolwork recognises this exact state. The subject is deliberately withheld — no logo, no name, no feature list.

keyMessage: You submitted it. Now it is someone else's move.

The zoom-out IS the argument. We open tight enough that the status pill is the only thing on screen, then one continuous decelerating pull-back reveals that this pending state has a locked badge, an instructor note, and a stated policy attached to it. The student is not looking at a feature; they are looking at a queue position they cannot move. No cuts — the discomfort comes from the widening context.

## Frame 2 — Five to Seven Business Days

- scene: Bare canvas. Two policy lines from the product's own instructor note type in one after the other and sit there, unresolvable.
- voiceover:
- duration: 9s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/02-five-to-seven.html
- type: pain_point
- persuasion: Pain validation
- beat: anxiety
- blueprint: kinetic-type-beats (Adapt)
- asset_candidates:
- focal:
- roles:
- sfx:

Adapt: keep the flat field, the fixed centre anchor, the camera lock and the arrive-hold-clear law;
keep type as the subject. Change the sub-shape from a fixed-line token swap to the multi-beat
statement build, because these are two different sentences rather than one line with a swapping slot.

Scene 1 (0.0–1.8s): bare canvas, nothing but the field. Line one — "Our instructors will review your
analysis and provide feedback soon." — arrives centre-anchored via **per-word staggered reveal**
(`dynamic-content-sequencing`) on a smooth long-tail settle. Rule-of-thirds left-weighted, generous
margins, no other element present.
Scene 2 (1.8–4.4s): line one clears on a **hard-cut word-swap** (`discrete-text-sequence`, no fade or
roll) and line two takes its place the same way — "Grade typically released within **5–7 business
days** after submission deadline." The accent phrase takes a left-to-right drawn underline
(hand-drawn marker sweep, as the blueprint's accent move) as it lands, so the eye is sent to the
number that is the actual complaint.
Scene 3 (4.4–9.0s): line two holds alone. A **keyword glow** lands on "5–7
business days" on attack-decay-rest, then the frame settles and stays still for the remaining four
seconds. Nothing breathes and nothing drifts — the held read is the beat.

narrativeRole: Names the cost of the wait in the product's own words, so the pain is sourced rather than asserted. This is the agitation beat — but stated flatly, because the facts are already bad enough and hype would undercut them.

keyMessage: The wait is not a bug. It is written down, in advance, and nobody can skip it.

Copy is quoted from the captured screen, not written fresh: "Our instructors will review your analysis and provide feedback soon." and "Grade typically released within 5–7 business days after submission deadline." The second line stays on screen alone for the last two seconds — the silence is the beat. Typography only, no screenshot.

## Frame 3 — The Tease

- scene: A result screen flashes up for roughly a second — a grade, a marked-up submission, feedback present — then cuts away before it can be read.
- voiceover:
- duration: 7s
- transition_in: squeeze
- status: animated
- src: compositions/frames/03-the-tease.html
- type: benefit_highlight
- persuasion: Future pacing
- beat: desire
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: assets/screen-result.png — same assignment after grading, grade and feedback present, 1920x1199
- focal: assets/screen-result.png
- roles: screen-result.png = focal (shown at 1:1, then gone)
- sfx:

Adapt: keep the surface as the hero and the screen-cycling mechanic. Cut the shot to its shortest
possible expression — the surface appears, holds barely long enough to register, and leaves. The
blueprint's "holds on the final screen" is deliberately violated; that hold is the whole point.

Scene 1 (0.0–1.4s): the surface arrives hard and flat — no slide-in, no settle, no accent shape
behind it. The graded result capture at 1:1 inside a clipped window, unreadable in the time given.
Centered, filling most of the frame. It does not move while it is there.
Scene 2 (1.4–7.0s): the surface is gone on a hard cut. **Only the amber pending dot from frame 01
remains**, orphaned at frame centre with no card, no screen, no context around it — the status
indicator separated from the thing it was reporting. It pulses on a finite tween
(`svg-icon-enrichment`), roughly twice more, then stills. Five and a half seconds of held emptiness
as the beat's whole mechanism. No type, no explanation, no camera.

narrativeRole: The "after" of BAB, deliberately withheld. The viewer sees that resolution exists, is refused for a beat, and carries that gap into the bridge. This beat exists to create appetite, not information.

keyMessage: The other side of this wait is real, and you have not seen it yet.

Deliberately short and deliberately unsatisfied — a one-second flash on a held crop of the graded state, then cut. Do not let the viewer read the grade. Do not add a caption explaining it. The withholding is the mechanism; a viewer who is not slightly annoyed here will not care about frame 6.

## Frame 4 — The Owner

- scene: Clean brand canvas. The Learnix mark assembles and resolves; one line sets up the turn in the argument.
- voiceover:
- duration: 8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/04-the-owner.html
- type: product_intro
- persuasion: Feature-to-benefit translation
- beat: clarity
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/mark-tile-primary.png — white Learnix mark on #2563eb rounded tile, use this because the raw mark is white-on-transparent and invisible on a light canvas
- focal: assets/mark-tile-primary.png
- roles: mark-tile-primary.png = focal (fixed, front-facing, present from t=0)
- sfx:

Adapt: keep the mark fixed and front-facing from t=0 and keep the guide-ring ignition as the frame's
one moment of glow. Drop the background crossfade to a dark gradient — this film's canvas stays light
throughout, and a dark beat here would break the world the next four frames live in.

Scene 1 (0.0–1.4s): clean `bg` field. Faint concentric guide rings sit under a flat top-down view and
**pulse and expand from centre**, stroke by stroke. Camera locked. The mark is
already present at centre, fixed, front-facing, at rest.
Scene 2 (1.4–3.2s): the rings settle outward and the mark's **glow ignites** — a slow bloom
(`ambient-glow-bloom`) behind the tile, reading as a light switching on. This is the one sanctioned
overshoot in the film and it is a light, not a bounce. Nothing else moves.
Scene 3 (3.2–5.6s): beneath the mark, the line sets up the turn — "The wait has an owner." — arriving
via **per-word staggered reveal** (`dynamic-content-sequencing`) on a long-tail settle. Centered
stack, mark dominant by scale, line subordinate by weight.
Scene 4 (5.6–8.0s): hold. Mark and line still, no wordmark — that is saved for frame 08.

narrativeRole: The bridge. The product arrives not as a feature list but as the answer to the question frames 1–3 raised: this wait belongs to somebody, and that somebody is a system.

keyMessage: The wait is not nobody's. It is the handoff between departments.

The turn is the pivot of the whole video, so it gets a clean zoom-through rather than a crossfade — a genuine section change. Type resolves to a single claim: the pending state has an owner. Brand mark only, no wordmark yet; the wordmark is saved for frame 8.

## Frame 5 — Step 1: The Handoff

- scene: The teacher's grading view takes over the frame; the same submission is now someone else's screen, with a rubric and a decision to make.
- voiceover:
- duration: 13s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-the-handoff.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: relief + control
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: assets/screen-teacher-grading.png — teacher grading surface for the same assignment, 1920x1828, tallest in the set, needs scale-not-crop; assets/screen-teacher-performance.png — teacher's read on student performance, 1920x1415
- focal: assets/screen-teacher-grading.png
- roles: screen-teacher-grading.png = focal (scaled into the window at 1:1 or smaller — 1.05 ratio, so scale, never crop); screen-teacher-performance.png = supporting
- sfx:

Adapt: keep the static-tour variant — surface establishes, screens cycle, camera **fully static** with
all motion at element level. Do not give this frame any camera move: it is the longest beat in the
film and a drifting camera behind thirteen seconds of rubric would undo it.

Scene 1 (0.0–1.8s): the surface establishes — a clipped app window **slides in from the left edge and
settles** (`spring-pop-entrance`, soft, no overshoot) onto the styled backdrop, the real teacher
capture scaled to fit inside it. The assignment title is already present and identical to frame 01 —
that constant is what makes the handoff legible. A "Teacher view" chip pops in beside it
(`spring-pop-entrance`). Asymmetric 70/30 with a side headline slot. Camera static.
Scene 2 (1.8–5.4s): the window **scale-swaps** down (`scale-swap-transition`) to make room as the
rubric rows push up into the lower third one at a time — the back-half sequential reveal, staggered
(`spring-pop-entrance`, soft). Two rows unscored, deliberately empty. The side headline reveals by
**staggered fade + slide-up** (`discrete-text-sequence`).
Scene 3 (5.4–9.2s): the second criterion resolves to a scored state on a **discrete whole-state swap**
(`discrete-text-sequence`) — dot to `positive`, value present, label to scored. The other two rows stay
empty, so the contrast does the arguing; no caption explains it. Camera static, no push on the commit.
Scene 4 (9.2–13.0s): the side headline **swaps** to the thesis line — "One submission. Two screens."
(`discrete-text-sequence`, out-up / in-up). Then hold to the end, stillness, the window and its one
scored row reading clean and still. The supporting teacher-performance capture stays undimmed in the
side slot.

narrativeRole: The first concrete proof, and the frame the whole concept was chosen for. The identical artifact is now on a different person's screen with authority attached. This is the handoff, shown rather than described.

keyMessage: One submission, two screens, two different powers.

The screen swap must be legible as the SAME artifact moving between people — hold the assignment title constant across the cut so the match is unmistakable. Paced across the full 13 seconds: the teacher's surface arrives, the rubric rows settle in, one row resolves to a decision. This is the longest beat in the video and should feel unhurried; it is the thesis, not an interstitial.

## Frame 6 — Step 2: The Chain

- scene: The single pending status from frame 1 expands into the real submission state machine, each state lighting in sequence, then the wider system counts up behind it.
- voiceover:
- duration: 13s
- transition_in: crossfade
- status: animated
- src: compositions/frames/06-the-chain.html
- type: social_proof
- persuasion: Statistical proof
- beat: confidence
- blueprint: dataviz-countup (Adapt)
- asset_candidates: assets/diagram-modules.svg — vector module map, 12 domains; assets/screen-student-dashboard.png — student home, the surface the resolved state returns to
- focal: assets/diagram-modules.svg
- roles: diagram-modules.svg = supporting (dimmed backing, never the subject); screen-student-dashboard.png = supporting
- sfx:

Adapt: keep the signature traversal — the camera pushes THROUGH instrument to instrument and lands on
one hero metric, one instrument per beat. Change the instrument set: the hero is the real submission
state machine, not a chart. The scale figures are the hero metric the traversal lands on, so they stay
as backing and never become the argument.

Scene 1 (0.0–3.2s): the data field. The `PENDING` pill is the first instrument, seated centre-left at
the same position the status pill held in frame 01 — the callback that tells the viewer this is the
same state, now named. Camera begins its traversal (`multi-phase-camera`). An eyebrow reads as chrome:
the literal enum name, set in Manrope caps.
Scene 2 (3.2–6.8s): the camera **pushes THROUGH** to the right (`multi-phase-camera`, steady travel)
and the second and third instruments resolve in sequence — `UNDER_REVIEW`, then `GRADED` — each state
lighting on a **discrete swap** (`discrete-text-sequence`) with its accent tint, one per beat, never
all three at once. Arrow connectors draw as the traversal passes them (`svg-path-draw`).
Scene 3 (6.8–9.8s): the traversal lands on the hero metric row — three figures ticking to 12, 296 and
126 on **value-scaled counters** (`counting-dynamic-scale`), each with its label beneath in chrome
type. The module diagram sits behind at reduced contrast as backing texture, never legible enough to
compete. Camera settles and stops.
Scene 4 (9.8–13.0s): hold on the resolved chain and the hero metric, stillness. Nothing re-pushes; the
counts do not re-tick. Low-amplitude **subtle jitter** at most on the leading figure.

narrativeRole: Answers the viewer's unspoken next question — "fine, but who else is involved?" — by showing that the chain is a real, shared, enforced state machine rather than one teacher remembering to grade.

keyMessage: The status you are stuck behind is a defined state, and something is always moving it.

States are the product's own, from `backend/src/lib/enums.ts` — `SUBMISSION_STATUS = PENDING → UNDER_REVIEW → GRADED` — with `EXAM_STATUS` reaching `RESULTS_PUBLISHED`. These are real enum values from the shipped backend, not invented for the video; the frame is strongest precisely because the vocabulary is too specific to be marketing. Scale figures are restrained and appear only here, as backing rather than as the argument: 12 role apps, 296 endpoints, 126 models. Do not let these become the subject of the frame.

## Frame 7 — Resolve

- scene: Return to the student's screen. The pending state is gone, the grade is present, and the badge that was locked in frame 1 is now unlocked.
- voiceover:
- duration: 9s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/07-resolve.html
- type: benefit_highlight
- persuasion: Friction reduction
- beat: relief
- blueprint: device-surface-showcase (Adapt)
- asset_candidates: assets/screen-result.png — the graded result from frame 3, now given time to read; assets/screen-quiz-result.png — analytical result surface, 1920x1188
- focal: assets/screen-result.png
- roles: screen-result.png = focal (at 1:1 or smaller — 1.62 ratio, the most 16:9-friendly after the heroes); screen-quiz-result.png = supporting
- sfx:

Adapt: keep the static-tour variant and the fixed camera; the whole point of this frame is that it
reuses frame 01's exact crop language so the difference reads as state, not as a new screen.

Scene 1 (0.0–1.8s): the surface establishes in the same window geometry and the same crop as frame
01's locked wide — no slide flourish this time, it simply is there (plain quiet fade, quieter
than 05's entrance, because this beat resolves rather than announces). Camera static.
Scene 2 (1.8–4.2s): the status row swaps amber to `positive` on a **discrete state swap**
(`discrete-text-sequence`) — dot, label to "Graded", feedback noted. One beat, no flourish.
Scene 3 (4.2–5.2s): the callback, resolving **last**: the badge row **unlocks** (`spring-pop-entrance`,
low overshoot — this is the one place a little life is earned) and the "Unlocked" chip draws its check
(`svg-path-draw`).
Scene 4 (5.2–9.0s): four seconds of held quiet. The resolved state reads clean and still with no type
over it — the stillness is the payoff and it is the longest stillness in the film.

narrativeRole: Pays frame 3's withheld beat and closes the loop opened in frame 1. The screen is the same one, and the difference is the entire point of the video.

keyMessage: This is the same screen. This is what eleven apps were doing.

The callback must be exact: same screen, same crop language as frame 1, opposite state. The locked badge from frame 1 reappears unlocked — that is the single strongest proof available and it was planted two frames after the hook. Give the viewer four full seconds of the resolved state with no type over it. The quiet is the payoff.

## Frame 8 — Learnix

- scene: Clean end card. Mark and wordmark resolve; one closing line.
- voiceover:
- duration: 5s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/08-learnix.html
- type: branding
- persuasion: Rule of three
- beat: confidence + trust
- blueprint: logo-assemble-lockup (Adapt)
- asset_candidates: assets/mark-tile-primary.png — brand mark on primary blue tile
- focal: assets/mark-tile-primary.png
- roles: mark-tile-primary.png = focal
- sfx:

Adapt: use the settled-reveal variant — the lockup is already centred at t=0 and the decorations leave
rather than arrive. This is the inverted clear, and it is the right shape for an end card on a film
that has been resolving since frame 01.

Scene 1 (0.0–1.4s): the lockup is already centred — mark and wordmark present and settled at t=0, no
build. Behind and around it the three count figures from frame 06 **drift slowly outward** as
satellites (`svg-icon-enrichment`, very low amplitude, finite) — the INVERTED clear, the numbers
leaving so the mark stays.
Scene 2 (1.4–3.0s): the wordmark completes — a **per-word staggered reveal** (`dynamic-content-sequencing`)
finishing the lockup on a long-tail settle. Mark fixed, no glow bloom, no overshoot.
Scene 3 (3.0–5.0s): hold two seconds on the completed lockup with the closing line beneath. Camera
locked, nothing moves, no exit move — this is the film's final frame and it ends by holding.

narrativeRole: Brand resolution. Three real numbers and no adjectives, because the video has already made its argument and the close should not oversell it.

keyMessage: Learnix. Twelve role apps. One system.

Closing type is three lines and no adjectives: the mark, the wordmark, and "12 role apps · 296 endpoints · one system." No "sign up", no URL, no CTA button — the audience is institutional buyers, not trial users, and a trial CTA would misread who this is for. Hold the card for a full two seconds after everything resolves; do not cut on motion.
