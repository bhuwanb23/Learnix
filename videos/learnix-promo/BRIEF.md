---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "One student's twenty seconds of waiting, and the eleven apps that make it resolve."
destination: youtube
aspect: 1920x1080
language: en
audience: college administrators and department heads evaluating an ERP; secondary audience is developers evaluating the build
length: 75s
angle: handoff
narration: no
---

## Intent

A promo for **Learnix**, a multi-tenant college ERP — 12 role-specific apps sharing one
backend. The user chose **Concept C, "The Handoff"**, from a five-concept pitch round.

The video is told from the receiving end. It opens on the person *waiting*: a student
staring at a results row that says "published 21 Oct". Each app that follows is the moment
somebody else does their job — the department that has to act for that date to be real. The
student's twenty seconds of waiting is the frame; the video is about the eleven apps that
make it resolve.

This deliberately inverts the usual student-facing SaaS promo. It is not a feature tour and
not a montage. It argues that an ERP's value is invisible machinery, and it sells to the
institution rather than to the end user.

**Aspect derivation:** `destination: youtube` → `1920x1080` (16:9).

## Assets

Paths are relative to the Learnix repo root, `D:\projects\apps\Learnix`, which is the parent
of this project directory.

- `prototype/new/student/**/*.html` — 29 finished student screens (dashboard, classes,
  syllabus tracker, lecture notes, quizzes, weak topics, assignments, events, placement,
  profile). The only visually finished screens in the repo. Capturable standalone.
- `prototype/new/teachers/**/*.html` — finished teacher screens (dashboard, class, lecture
  notes, quiz, syllabus, assignment, student performance, profile).
- `learnix/dist/` — a working Expo web export (`index.html` + bundles). Serves locally and
  is the source for the ten staff role apps, which have no HTML prototypes. User confirmed
  it serves fine.
- `learnix/assets/splash-icon.png`, `learnix/assets/icon.png` — the product mark, for the
  open and close.
- `docs/diagrams/modules.svg`, `docs/diagrams/architecture.svg`, `docs/diagrams/data-flow.svg`
  — vector architecture diagrams, editable rather than raster only.

**Real figures available, all accurate:** 12 role apps · 296 API endpoints · 126 Prisma
models · 43 schema files · 132 features · 14 backend modules.

**Real domain vocabulary available for authentic on-screen text** (from
`backend/src/lib/enums.ts` and the Prisma schema): `HOD_APPROVED`, `CHANGES_REQUESTED`,
`OVERDUE_MEMBERS`, `ALL_STUDENTS`, `BORROWERS`, `Awaiting Evaluation`, `Pending Grading`.

## Customizations

- **Scene transitions are the thesis, not decoration.** The concept is named "The Handoff"
  — every station clears by handing off to the next department, so the transition *is* the
  argument. Committed to the standard set, not shader wipes: this is a 75s promo about
  institutional reliability and a showy wipe would undercut it.
- **Captured screens staged onto the timeline** as real frames, not rebuilt as HTML
  mockups. The screens are the evidence; recreating them would waste the strongest asset.
- **No voiceover.** Music bed plus on-screen type. The concept depends on a held moment of
  silence around the waiting beat, and narration would fill it. Reversible if wanted later.
- **Design spec source is Learnix's own tokens**, not a generic preset —
  `learnix/constants/theme.js` and `docs/ui/transport-design.md`. These are brand truth and
  outrank the remembered `blue-professional` preset per the documented resolution order.
  Learnix's real look is slate-and-white surfaces, `#f5f7f9` background, `#e2e8f0` borders,
  `#0f172a` ink, and a per-role accent hue (library amber `#b45309`, transport blue
  `#2563eb`, and so on per role).

## Notes

- **Do not promise AI features.** `ai-ml/` is empty scaffolding — a zero-byte README and an
  empty `docs/`. The old `docs/features.md` advertises AI summaries, weak-topic detection and
  plagiarism checking; none of it is built. The video must not imply otherwise.
- **Fonts are missing and must be fixed before capture.** `learnix/assets/fonts/` does not
  exist, so every captured screen will currently render in system fallback instead of
  Plus Jakarta Sans / Manrope. Steps are in `docs/FONT_INSTALLATION.md` (10 `.ttf` files).
  Capturing before this is fixed means re-capturing all screens.
- **Staff apps have no prototypes.** Only student and teacher have HTML screens; the other
  ten roles come from the web export. Concept C needs fewer distinct stations than B or D
  precisely because of this.
- **No third-party ERP clichés.** No isometric 3D campus, no floating-UI-on-gradient, no
  stock footage of smiling students, no checkmarked feature list. The concept was chosen
  partly to avoid exactly this.
- **Prototype screens are static HTML** with their own mock data. On-screen copy drawn from
  them is fictional sample content and must not be presented as real institutional data.
