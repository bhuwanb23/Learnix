# Asset Manifest — Learnix Master Film

Source of truth: `MASTER-SCRIPT.md` (approved) + `VO-SCRIPT.md` (timed).
Pipeline: **B — hybrid.** Live plates for the real world, HyperFrames builds for the digital and system worlds, Resolve/AE for the composite.

## Scope

| Track | Scenes | Share |
|---|---|---|
| **A · LIVE** — photographed campus, students, faculty | 29 | 48% |
| **B · BUILD** — HyperFrames compositions, diagrams, abstract | 32 | 52% |

Hybrid scenes (world transitions) sit in whichever track owns the dominant frame. A scene counted as LIVE means a camera has to exist for it — that is the expensive track and it is front-loaded in Acts 1–2.

---

## Blockers — read before scheduling anything

**The film's hero screens depend on product work that does not exist yet.**

Twenty-four scenes call for real Learnix interfaces. Of those, **four requirements have no buildable backing** and cannot be screenshotted until product work lands:

| Requirement | Scenes | Blocker | Appendix A ref |
|---|---|---|---|
| **AI assistant** with visible sourcing | S48, S49, S50 | `ai-ml/README.md` is 0 bytes. No service, no schema, no UI. | Roadmap |
| **Trend / threshold detection** | S46 | Notifications has reminder policies only. Trend detection does not exist. | Roadmap |
| **Scoped role dashboards** | S44 | RBAC exists in backend. The scoped dashboard projection does not. | Roadmap |
| **Hierarchical drill-down** | S43 | Admin has students CRUD. No College→Dept→Course→Class aggregation. | Roadmap |

S43, S44 and S46 total **31 seconds of screen time** and they are the proof of the product claim. S48–S50 total **25 seconds** and are the film's intelligence peak.

**Recommendation:** build these four screens as production design comps in the film's own design system, then reconcile them into the real product once it ships. Do not let the film wait on the product. But write them to the same token file the product uses, so the comp is buildable rather than pretty.

Everything else in the "real Learnix" list already has a schema behind it and can be captured from the running app.

---

## Track A — LIVE plates (29 scenes)

### Shoot A1 · Campus exterior, golden hour — **1 location, 6 setups**

S01 · S07 · S58 · S59 — **byte-identical framing required.** S01 opens the film, S07 closes Act 1, S58 rhymes it, S59 dissolves out. Shoot these four as one setup with locked camera, and verify framing identity by overlaying the plates in Resolve before leaving the location. Any drift here breaks the film's central structural device.

Also S54, S56, S57 (campus walk / closing).

| Need | Notes |
|---|---|
| Crane position, 24mm, low, slow rise | S01 and S58 must match to the pixel |
| Golden light, ~1 hour before sunset | Lock the time window. If the light moves, the rhyme is dead. |
| Wet or dusty ground for reflections | Adds depth without VFX |
| 6–10 students crossing, natural, unremarkable | Nobody performs "college". They walk. |

### Shoot A2 · Student with a phone, over-shoulder — **S02, S03, S08, S09**

The chaos act lives on a phone screen and a face above it.

| Scene | Need |
|---|---|
| S02 | Phone lock screen, three unread notifications, unlabelled. Handheld, shallow DOF. |
| S03 | Over-shoulder, two apps side by side, disagreeing numbers. Legible 12 frames only — shoot at 4K, crop in post. |
| S08, S09 | Tight on face + screen. Concern, not confusion. This is the emotional low point. |

### Shoot A3 · Faculty and staff at their desks — **S10–S16, S41**

Seven consecutive scenes. This is one room and one afternoon.

| Need | Notes |
|---|---|
| Corridor register, paper texture, digitised | S12 |
| Spreadsheet + portal, visually unrelated, roll-number mismatch visible | S10 |
| Two windows, different roster counts | S11 |
| Three document surfaces, three states for one transaction | S13 |
| Email compose / notice editor / portal admin | S14 |
| PDF, spreadsheet, email thread — three different dates | S15 |
| Nine to twelve deliberately-mismatched interfaces | S16 — this is a build, not a plate. See Track B. |

**Direction note:** Act 2 is 90 seconds of mild institutional frustration, not farce. Nobody is angry. Everybody is slightly behind. The comedy of the mismatch comes from the typography, not the performance.

### Shoot A4 · The shift — **S36, S37, S40, S42, S49, S50**

| Scene | Need |
|---|---|
| S36 | Student, phone, morning light. Calm. The film's turn. |
| S37 | Three surfaces resolving to one mark — build, plate only for the student's face |
| S40 | Faculty at a desk, unhurried, everything in one place |
| S42 | HOD or admin at a wide desk, wall behind. Authority without theatre. |
| S49, S50 | Faculty and student using the assistant. Their reaction is the performance. |

### Shoot A5 · Management — **S43, S44** *(optional — may build entirely)*

If the drill-down and RBAC comps are built in the design system, these two scenes do not need a plate at all. Recommend **building**, and reserving a single plate of a principal's hands on a keyboard as a texture element at S43.

### Cast requirements

| Role | Scenes | Notes |
|---|---|---|
| Arjun Kumar — student | S02, S03, S36, S38, S50 | The audience's proxy. Camera-facing only where scripted. |
| Prof. Anita Sharma — faculty | S10–S13, S40, S49 | Competence, not warmth. She is busy and good at it. |
| Priya Nair — student | S37, S38 | Shared with Arjun in the lifecycle scene. |
| Dr. V. Raghavan — HOD | S42, S43 | Institutional authority. Underplays. |
| Walk-ons — finance, placement, exam cell | S10, S31, S39 | Background presence only. No lines. |

**Total shoot:** 5 setups, 2–3 days, ideally one golden-hour morning + one overcast day. The film's entire real-world presence is under 3 minutes of runtime, so this is a small shoot by design.

---

## Track B — BUILD (32 scenes)

All HyperFrames. No camera. This is where most of the film's craft lives.

### B1 · Chaos-world interface design (9 scenes)

S08, S09, S10, S11, S12, S13, S14, S15, S16.

These are **not** Learnix screens and must never look like Learnix. Each is a different product with different chrome, different type, different colour language. The mismatch is the subject of the scene.

Design them as 9–12 deliberately mediocre UIs. Rules:

- Each gets its own type family, its own accent, its own spacing logic
- All of them are *plausible* — none is a cartoon. Nobody made these badly on purpose; they were made by different people at different times
- Same data appears across all of them and never agrees
- Density is high. These are working tools, not landing pages
- No Learnix blue anywhere. Reserve `#2563eb` entirely for Act 4 onward

### B2 · System-world diagrams (14 required, 24 scene placements)

| # | Diagram | Scenes | Status |
|---|---|---|---|
| 1 | Fragmented college systems | S18–S19 | Build |
| 2 | Centralised ERP architecture | S25, S27, S35 | **Three states:** core only → full eight-module ring → consolidated. One asset, three renders. |
| 3 | Student workflow | S29, S38 | Brief, then full lifecycle |
| 4 | Faculty workflow | S40 | Six tasks |
| 5 | Admission workflow | S30 | Build — roadmap surface |
| 6 | Attendance workflow | S28, S37 | Brief, then full |
| 7 | Examination workflow | S39 | Four audiences |
| 8 | Fee workflow | S31 | Build |
| 9 | Approval workflow | S30, S32, S47 | Brief, extended, policy variant — **three states** |
| 10 | Data flow | S20, S37 | Leak map, then branching record |
| 11 | AI intelligence layer | S48, S49 | Build — roadmap surface |
| 12 | Management analytics | S42, S43 | Overview, then hierarchical drill |
| 13 | Role-based access | S44 | Scoped visibility — build — roadmap surface |
| 14 | Connected-campus ecosystem | S51–S53 | Assembling → complete. **Three states.** |

Four diagrams carry roadmap surfaces (5, 11, 13, and 12's drill state). They must be built to the same fidelity as the real ones — the audience cannot tell, and must not be able to.

### B3 · Abstract system states (7 scenes)

S17, S21, S22, S23, S26, S51, S53 — the connective tissue. Field, depth, light, motion. No UI, no type except where scripted. These scenes are what make the diagrams feel like they belong to a place rather than a slide.

### B4 · End cards (3 scenes)

S59 closing card · S60 logo resolve · S61 hold.

**S60 must build the mark from parts**, per the brand motion language. Not a fade-in, not a scale. The mark assembles from its own constituent elements, and the resolve tone that lands here is the same one introduced at S26.

### B5 · Real Learnix screens (24 placements, 17 distinct requirements)

Status verified against `backend/prisma/schema` and `prototype/new`:

| Screen | Scenes | Schema backing | Prototype | Capture status |
|---|---|---|---|---|
| Teacher attendance | S28 | `b5_attendance` | ✅ teachers/class | **Ready** |
| Student profile | S29 | `a2_profiles` | ✅ student/profile | **Ready** |
| Accounts / fees | S31 | `e1_fees`, `e2_payments` | ❌ | Capture from app |
| Faculty app | S40 | multiple | ✅ teachers/* | **Ready** |
| Exam cell + student exam | S39 | `c2_exams`, `c3_results` | partial (student: quiz, result) | Capture both |
| Student assignment + submission | S38 | `b6_assignments` | ✅ student/assignment | **Ready** |
| Student lifecycle | S38 | composite | ✅ student/* | **Ready** |
| Hostel / transport / library | S33 | `g1_g2`, `h1-h3`, `f1_f2` | ❌ | Capture three screens |
| Placement | S34 | `d1`, `d2`, `d3` | ✅ student/placement | **Ready** |
| Management dashboard | S42 | `a1_tenancy`, `b1_structure` | ❌ | Capture — **hero screen** |
| Alerts / analytics | S45 | — | ❌ | **Blocked** — needs trend detection |
| Analytics | S46 | — | ❌ | **Blocked** — needs trend detection |
| Notifications / policy | S47 | `k1_messaging` | ❌ | Capture |
| AI assistant (student) | S50 | ❌ | ❌ | **Blocked** — no service |
| AI assistant (faculty) | S48, S49 | ❌ | ❌ | **Blocked** — no service |
| Drill-down | S43 | partial | ❌ | **Blocked** — no aggregation endpoint |
| RBAC surfaces | S44 | `a3_rbac` | ❌ | **Blocked** — no scoped UI |

**7 requirements ready now** (teacher attendance, student profile, faculty app, assignment/submission, lifecycle, placement, plus exam-cell partial).
**6 capturable from the running app** (fees, exam cell, hostel/transport/library, notifications, management dashboard).
**4 blocked on product build** (trend detection ×2, AI assistant ×2, drill-down, RBAC scoped UI).

Existing captures already copied into `assets/ui/real/`: 13 screens (student ×4, teacher ×7, results ×4) plus `diagram-architecture.svg` and `diagram-modules.svg`. **Reuse these before capturing anything new.**

---

## Naming and folder convention

```
assets/
  live/          A1_campus_golden_ext.{mov,prf}
                 A2_phone_os_shot.{mov,prf}
  ui/real/       ui_student_profile_v1.png
                 ui_fees_accounts_v1.png
                 ui_ai_assistant_compc_v1.png      ← comps carry _compc
  ui/chaos/      chaos_attendance_portal_v1.png    ← deliberately off-brand
                 chaos_register_pdf_v1.png
  diagrams/      d02_erp_arch_core.{svg,html}
                 d02_erp_arch_full.{svg,html}
                 d02_erp_arch_consolidated.{svg,html}
  abstracts/     abs_field_depth_v1.{html,webm}
  cards/         card_close_v1.html
                 card_logo_resolve_v1.html
```

- `v1` increments on every revision. Never overwrite an asset a scene already referenced.
- `_compc` marks a production comp standing in for unbuilt product. When the real screen ships, capture it and re-shoot the scene — do not silently swap.
- Diagrams with multiple states are separate files sharing a base name. **Diagram 2 and 9 and 14 each need three.**

---

## Build order

Ranked by dependency, not by scene number.

| Order | Work | Why first |
|---|---|---|
| 1 | Design tokens + type scale | Everything downstream consumes them. See `DESIGN-SYSTEM.md`. |
| 2 | Chaos-world UI kit (B1) | 9 scenes, no dependencies, and it establishes the anti-brand language Act 4 then breaks |
| 3 | Diagram 2 — ERP architecture, three states | Most reused asset in the film, and S27 is the film's thesis beat |
| 4 | Captures of the 7 ready screens | Free — the app already exists |
| 5 | Remaining diagrams 1, 3–14 | Ordered by scene appearance |
| 6 | Comps for the 4 blocked screens | Design to the token file so they are buildable |
| 7 | Abstracts (B3) | Needs the diagram language settled first |
| 8 | End cards (B4) | Needs the mark |
| 9 | **Shoot A1–A4** | Schedule once A1 framing is locked, so the build can assume plate dimensions |
| 10 | Assemble Act 1 as a test | **The gate.** If Act 1 does not land, nothing after it matters. |
| 11 | Acts 2–10 | |

---

## Open questions for production

1. **Do we comp the four blocked screens, or wait for product?** Recommendation: comp. The film has a delivery date; the product does not. But this needs a decision, not a default.
2. **Is A5 (S43, S44) shot or built?** Recommendation: build. Saves half a day of shooting and S43's plate has little to contribute.
3. **Do we need the football at all?** The screenplay mentions one. Confirm before the day.
4. **Who signs off on the four roadmap comps?** They are the most politically sensitive frames in the film — they show a product that does not exist yet.