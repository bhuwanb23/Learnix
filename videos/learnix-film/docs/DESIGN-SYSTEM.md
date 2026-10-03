# Design System — Learnix Master Film

Normative tokens for the 7-minute film. Everything BUILD-track consumes this file. Live plates are graded against it in Resolve, but do not fight it.

Derived from `learnix/constants/theme.js` and the captured brand fonts. **Do not introduce a new colour or typeface that is not in this document.**

---

## 1 · The one structural rule

**Act 4 is where the brand starts.** Before it, the film lives in the chaos palette — nine different wrong systems. After it, everything is Learnix.

This is the single most load-bearing idea in the film's visual design, so it gets stated before anything else:

| Boundary | Rule |
|---|---|
| S01–S23 | Chaos palette only. **No Learnix blue. No Plus Jakarta Sans in UI.** |
| S24 onward | Learnix palette. Plus Jakarta Sans enters for the first time. |
| S58 | Returns to the S01 frame, but graded warm and ordered — same image, Learnix light. |

When Act 4 arrives, the audience should feel the colour change before they understand it. That is the whole job.

---

## 2 · Colour

### 2.1 Learnix palette — Act 4 onward

Sourced directly from `theme.js`. Not approximations.

| Token | Hex | Use |
|---|---|---|
| `--primary` | `#2563eb` | **Reserved.** Brand surfaces, active states, the core, module fills. Never used in Acts 1–3. |
| `--primary-dark` | `#1d4ed8` | Depth on primary. Diagram ring segments, pressed states. |
| `--primary-light` | `#eff6ff` | Learnix UI backgrounds behind data |
| `--accent` | `#0ea5e9` | Intelligence layer only. Sourced answers, the AI layer, citations. **Never general UI.** |
| `--background` | `#f5f7f9` | End cards, light plates |
| `--surface` | `#ffffff` | UI cards |
| `--surface-muted` | `#f1f5f9` | Secondary panels |
| `--border` | `#e2e8f0` | Dividers, grid lines, diagram node edges |
| `--text` | `#0f172a` | Primary type on light |
| `--text-muted` | `#64748b` | Secondary type, labels, units |
| `--success` | `#059669` | Cleared, resolved, passing |
| `--warning` | `#d97706` | Pending, needs attention |
| `--error` | `#dc2626` | Failed, overdue, lost. **Sparingly** — it is the loudest colour in the film. |
| `--info` | `#0284c7` | Neutral system message |

### 2.2 Dark plate — system and abstract worlds

S17, S21, S23, S26, S35, S51–S53 are dark fields. The diagrams float in them.

| Token | Hex | Use |
|---|---|---|
| `--void` | `#0b1220` | Deepest background. Abstract depth, never flat black. |
| `--void-2` | `#111c2e` | Second depth plane |
| `--line` | `#1e293b` | Structural lines at rest |
| `--line-lit` | `#334155` | Structural lines when active |
| `--on-void` | `#f1f5f9` | Type on dark |
| `--on-void-muted` | `#94a3b8` | Secondary type on dark |

**Never use `#000000`.** The film's blacks are blue-black. This matters in Resolve grade and it matters in the diagrams.

### 2.3 Chaos palette — Acts 1–3

Not a palette. **Nine different wrong palettes.** Each chaos interface gets its own accent, its own neutral temperature, its own border weight. They must be plausible and they must be visibly unrelated to each other.

Constraint that makes it work: none of them may use `#2563eb`, `#0ea5e9`, or Plus Jakarta Sans. If any two chaos screens look related, the scene has failed.

Suggested assignments — deliberately disparate:

| Surface | Accent | Character |
|---|---|---|
| Register / PDF | `#78716c` warm grey | Paper. Digitised badly. |
| Legacy attendance portal | `#b45309` amber | Old admin software. Denser. |
| Assignment tracker | `#7c3aed` violet | Younger, built by a department not IT |
| Exam group chat | `#1d4ed8` blue-grey | A messaging client, not a system |
| Department spreadsheet | none — monochrome | Excel-adjacent, gridlines, no accent |
| Email thread | `#0369a1` | Standard mail client |
| Notice board | `#b91c1c` red | Aggressive. Approval-by-urgency. |
| Accounting ledger | `#166534` green | Money has always had its own colour |
| Hostel / transport board | `#c2410c` orange | Physical assets, older tooling |

The point of the spread is that no two institutional systems agree — including on colour.

---

## 3 · Typography

Brand fonts, as captured. Two families, five weights.

| Role | Family | Weight |
|---|---|---|
| Display, UI, diagrams, end cards | **Plus Jakarta Sans** | 400 / 500 / 600 / 700 |
| Body, labels, metadata, data labels | **Manrope** | 400 / 500 / 600 |
| Numerals in stats and dashboards | Plus Jakarta Sans | 700, `tabular-nums` |

Weights clamp to `{400, 500, 600, 700, 800}`. Nothing lighter than 400 — the film is 1920×1080 and thin type dies on a projector.

### 3.1 Film type scale (1920×1080)

| Token | Size | Weight | Tracking | Leading | Use |
|---|---|---|---|---|---|
| `--t-hero` | 132px | 700 | −0.03em | 1.02 | Closing card, S59. One statement, two lines. |
| `--t-mark` | 96px | 700 | −0.02em | 1.0 | Learnix wordmark, S60 |
| `--t-display` | 64px | 600 | −0.02em | 1.1 | Diagram titles, S42 analytics headline |
| `--t-title` | 40px | 600 | −0.02em | 1.2 | Scene-level titles |
| `--t-subtitle` | 32px | 500 | −0.01em | 1.3 | Sub-headers, module names |
| `--t-body` | 24px | 400 | 0 | 1.5 | Diagram labels, explanatory copy |
| `--t-label` | 18px | 600 | 0.08em, uppercase | 1.4 | Eyebrows, module ring labels |
| `--t-data` | 20px | 500 | 0.01em | 1.4 | Stat labels, units, table cells |
| `--t-numeral` | 96px | 700 | −0.02em | 1.0 | S42 hero statistics. `tabular-nums`. |

**S59 gets 132px. It is the only time the film goes that large.** Everything else is smaller, which is what makes S59 land.

### 3.2 Legibility floor

- On-screen text in LIVE scenes must be legible for **at least 24 frames** (0.8s). S03's phone numbers are the scripted exception at 12 frames.
- Diagram labels are never below `--t-body`. If a diagram cannot fit its labels at 24px, the diagram is wrong, not the type.
- **No on-screen text during a shot where the audience must read a face.** S41, S45, S54, S56, S57 are all deliberately type-free for this reason.

---

## 4 · Motion

The film has one motion idea: **systems moving from chaotic to coordinated.** Every rule below serves that.

### 4.1 Duration at 30fps

| Motion | Frames | Use |
|---|---|---|
| Micro — state change, hover, tick | 6–8 | Ignition ticks, node settle |
| Small — element enters | 12–16 | Card in, chip fan |
| **Standard — scene element** | **20–24** | Default. Anything the audience must notice. |
| Large — structural change | 30–40 | Ring completion, aggregation, consolidation |
| Hold — card or statement | 40+ | S59 closing card |

Scene cuts in the BUILD track are **8–14 frames**, not hard cuts. Act 4's first 20 seconds use the slowest transitions in the film.

### 4.2 Easing

| Purpose | Curve | Feel |
|---|---|---|
| Default | `cubic-bezier(0.4, 0.0, 0.2, 1)` | Neutral. The baseline. |
| Enter (settling in) | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Decelerate. Arrives and rests. |
| Exit (moving away) | `cubic-bezier(0.4, 0.0, 1, 1)` | Accelerate. Leaves. |
| Coordinated (the film's signature) | `cubic-bezier(0.34, 1.26, 0.64, 1)` | Slight overshoot. Used **only** when elements align into a structure — the ring closing at S27, modules converging at S35. This is what "becoming one system" feels like. |
| Alert | `cubic-bezier(0.4, 0.0, 0.6, 1)` | Used once, at S47 |

**The overshoot curve is the film's thesis in motion language.** It is reserved for moments of coordination and appears nowhere else. If it starts appearing on ordinary UI transitions, it stops meaning anything.

### 4.3 Choreography rules

1. **Deterministic order, never random.** S27's modules ignite one per second in a fixed sequence. Same on every render. The film is not generative.
2. **Stagger, never simultaneity.** Where a group of elements moves, they offset by 2–3 frames each. Eight modules igniting together reads as a flash; eight igniting in sequence reads as a system.
3. **No bounce, no overshoot, no spring** outside the coordinated curve. This is institutional software, not a consumer app.
4. **Camera moves are slow and always slow.** S27 orbits 15° over 11 seconds. Nothing in the film orbits faster. Fast camera motion reads as excitement, and this film is not excited.
5. **Hold before you cut.** Every scene ends with at least 8 frames of stillness before the transition. This is what makes the film feel expensive.

### 4.4 Transitions

| Type | Where | Note |
|---|---|---|
| Dissolve | 20–30 frames | Default for world changes |
| Push | 24–36 frames | Into a module or a chart |
| **Rhyme match** | S07→S08, S58→S59 | Identical framing across the cut. The film's structural device. |
| **Reveal** | S35 | Hold on the parts, then resolve to the whole |
| Build-from-parts | S60 | The mark assembles. Never fades in. |

---

## 5 · Diagram language

14 diagrams, one visual system. They must look like the same drawing of the same institution.

| Property | Spec |
|---|---|
| Node | Rounded rect, 8px radius, 1px `--border`, `--surface` fill |
| Node active | 2px `--primary`, `--primary-light` fill |
| Node critical | 2px `--warning` or `--error` |
| Edge | 1px `--line`, straight or 90° elbow. **No curves** — curves read as decorative. |
| Edge active | 2px `--primary`, with a single travelling dash |
| Label | `--t-body` Plus Jakarta Sans, `--text` |
| Module label | `--t-label`, uppercase, on the ring |
| Background | `--void`. Diagrams float. |
| Grid | Optional `--line` at 8% opacity. Never below. |

### 5.1 Multi-state diagrams

Four diagrams appear in more than one state. These are **one asset rendered three ways**, sharing node IDs so they animate into each other:

| Diagram | States | Scenes |
|---|---|---|
| 2 · ERP architecture | `core` → `full` → `consolidated` | S25, S27, S35 |
| 9 · Approval workflow | `brief` → `extended` → `policy` | S30, S32, S47 |
| 14 · Connected campus | `assembling` → `partial` → `complete` | S51, S52, S53 |
| 12 · Management analytics | `overview` → `drill` | S42, S43 |

Shared node IDs are mandatory. If the node for Finance is `fee-001` in the core state and `fees` in the full state, the S27→S35 transition will not animate and you will rebuild it.

### 5.2 The eight-module ring (Diagram 2, the film's thesis asset)

Fixed order, fixed labels, never re-sequenced. S27's VO reads this list aloud, so **diagram and VO must match character for character**:

```
1  ACADEMIC        5  FINANCE
2  STUDENT         6  PEOPLE
3  ADMINISTRATION  7  CAMPUS
4  ─────────────   8  CAREER
                     +  INTELLIGENCE over all
```

Ignition order is fixed at one module per second, S27 running 11 seconds. Eight ring segments plus the intelligence layer reading above all of it.

---

## 6 · Film grade

Live plates are graded to sit beside BUILD frames, not to look like film.

| Plate | Treatment |
|---|---|
| **Act 1, Act 10, FINAL** | Golden hour. Warm. Slightly lifted blacks. `#0b1220` floor, never crushed. |
| **Act 2, Act 3** | Neutral to cool. Flat. Deliberately lifeless — the colour of a working day. |
| **Act 4–Act 9** | Neutral, clean, `#f5f7f9` whites matched to the UI captures. |
| **S58 vs S01** | Same camera, same light. The only difference is grade and the presence of order. Do not re-grade S58 differently in camera — grade it in Resolve so the comparison is honest. |

**Rules**

- Contrast is low throughout. No crushed blacks, no blown highlights. This is an institutional film.
- Skin tones are natural. No teal-and-orange.
- Grain: minimal, applied uniformly across BUILD and LIVE in the same Resolve pass so they share a surface.
- The Learnix blue must survive the grade unchanged on any UI capture. If the grade shifts it, fix the grade — never re-shoot.

---

## 7 · Tokens as code

The authoritative file for BUILD scenes. `compositions/frames/` reads from it; nothing hardcodes a colour or a size.

```css
:root {
  /* brand */
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --primary-light: #eff6ff;
  --accent: #0ea5e9;

  /* neutral light */
  --background: #f5f7f9;
  --surface: #ffffff;
  --surface-muted: #f1f5f9;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-muted: #64748b;

  /* status */
  --success: #059669;
  --warning: #d97706;
  --error: #dc2626;
  --info: #0284c7;

  /* dark plate */
  --void: #0b1220;
  --void-2: #111c2e;
  --line: #1e293b;
  --line-lit: #334155;
  --on-void: #f1f5f9;
  --on-void-muted: #94a3b8;

  /* type */
  --font-display: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body: "Manrope", system-ui, sans-serif;

  --t-hero: 132px;
  --t-mark: 96px;
  --t-display: 64px;
  --t-title: 40px;
  --t-subtitle: 32px;
  --t-body: 24px;
  --t-label: 18px;
  --t-data: 20px;
  --t-numeral: 96px;

  /* motion */
  --dur-micro: 8;      /* frames @ 30fps */
  --dur-small: 14;
  --dur-standard: 22;
  --dur-large: 34;
  --dur-hold: 40;

  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-coordinated: cubic-bezier(0.34, 1.26, 0.64, 1);
  --ease-alert: cubic-bezier(0.4, 0, 0.6, 1);
}
```

---

## 8 · Compliance checks before any frame is approved

1. Does it use only tokens from §7?
2. Is it Plus Jakarta Sans or Manrope, weights 400–800 only?
3. Acts 1–3 — does it contain **zero** Learnix blue and zero Plus Jakarta Sans UI?
4. Is any on-screen text legible for 24+ frames?
5. Is the `--ease-coordinated` curve used **only** for coordination?
6. Does it end with 8+ frames of hold?
7. If it is a diagram — are node IDs stable against its other states?
8. Does it match a real captured screen, or is it marked `_compc`?
9. Is the black `#0b1220`, not `#000000`?
10. Does it sit correctly beside the live plate in the same grade?