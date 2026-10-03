# Learnix Master Film

A 7:00 institutional film about Learnix as the digital operating system for a college.

This is a **new project**, separate from the completed 75-second promo in `../learnix-promo`. That film is finished, rendered and delivered — it is not being modified.

---

## Status

**Phase 2 — pre-production. No footage has been shot and no audio has been recorded.**

| Item | State |
|---|---|
| Master screenplay | ✅ approved, 61 scenes, 11 movements, validated |
| VO script | ✅ written and timed, 567 words @ 140 wpm |
| Asset manifest | ✅ written, 29 LIVE / 32 BUILD scenes classified |
| Design system | ✅ tokens defined, `assets/tokens.css` is normative |
| Music brief | ✅ written, M1–M8 |
| Act 1 composition | ✅ timing gate built, `npm run check` passes |
| Acts 2–11 | ⬜ placeholder blocks at correct durations |
| Live plates | ⬜ not shot |
| Audio | ⬜ not recorded |

---

## Read in this order

1. `docs/MASTER-SCRIPT.md` — the approved film. Everything else derives from it.
2. `docs/DESIGN-SYSTEM.md` — tokens, palette, motion rules. **Normative.**
3. `docs/ASSET-MANIFEST.md` — what has to be built or shot, and what is blocked.
4. `docs/VO-SCRIPT.md` — timed narration for the recording session.
5. `docs/MUSIC-BRIEF.md` — score direction.

---

## Specs

| | |
|---|---|
| Runtime | 7:00 (420s / 12600 frames) |
| Resolution | 1920×1080 |
| Frame rate | 30fps |
| Pipeline | **B — hybrid.** HyperFrames builds the digital and system worlds; live plates carry the real world; Resolve/AE composites. |
| Language | English |

---

## The three ideas that must survive every decision

1. **Act 4 is where the brand starts.** Acts 1–3 contain zero Learnix blue and zero brand UI. Acts 1–3 are nine different wrong systems. When the brand arrives, the audience should feel the colour change before they understand it.
2. **The rhyme.** S01, S07, S58 and S59 are the same shot. S01 and S58 must be pixel-identical, and S01/S07 must be shot as one setup. If the rhyme breaks, the film has no structure.
3. **The coordinated easing curve** (`--ease-coordinated`) is reserved for moments where elements align into a structure. It appears nowhere else. Overuse destroys it.

---

## Blockers

Four UI requirements have **no buildable backing** and total 31 seconds of screen time (S43, S44, S46) plus 25 seconds for the AI assistant (S48–S50):

- AI assistant with visible sourcing
- Trend / threshold detection
- Scoped role dashboards
- Hierarchical drill-down

**Recommendation:** build them as production comps in this film's design system, marked `_compc`, and reconcile with the product later. Do not let the film wait on the product. See `docs/ASSET-MANIFEST.md` §Blockers.

---

## Commands

```bash
npm run dev      # human-operated foreground preview (blocks)
npm run check    # lint + runtime + layout + motion + contrast
npm run render   # render to MP4
```

Backgrounded preview for review handoff:

```bash
npx hyperframes preview --background
npx hyperframes preview --status
npx hyperframes preview --stop
```

---

## Conventions

- **`data-start` and `data-duration` are in SECONDS**, not frames.
- Nothing hardcodes a colour, size, duration or easing. All values come from `assets/tokens.css`.
- Sub-composition roots are styled by `#root`, never by a class — rules get scoped to `[data-composition-id]` and a root class would become an unmatchable descendant selector.
- Asset paths are **root-relative** (`assets/...`), never `../../`.
- Each composition registers exactly one paused root timeline on `window.__timelines`, keyed to its `data-composition-id`.
- Diagram assets with multiple states share a base name and stable node IDs (`d02_erp_arch_core` / `_full` / `_consolidated`). Stable node IDs are what let S27 animate into S35.
- Assets are never overwritten once a scene references them. Revisions increment `v1` → `v2`.