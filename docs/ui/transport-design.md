# Transport Module — UI Design System

## Design Philosophy

**"Clean Control Room"** — The Transport module is an operations dashboard. Every pixel should communicate status, speed, and control. No decorative elements; every visual has a functional purpose.

**Principles:**
1. **Status-first** — Color = state (green=ok, amber=attention, red=critical, gray=idle)
2. **Progressive disclosure** — Summary → detail on tap, never overwhelm
3. **Glanceable** — Key metrics readable in < 1 second
4. **Tactile** — Every interactive element has press feedback (scale + haptic)
5. **Zero dead space** — Empty states are informative, not blank

---

## Color System

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#2563eb` | Headers, active nav, CTAs |
| `primaryDark` | `#1d4ed8` | Gradient end, pressed states |
| `success` | `#059669` | On-time, active, healthy |
| `warning` | `#d97706` | Delayed, attention needed |
| `error` | `#dc2626` | Critical, overdue, low fuel |
| `info` | `#0891b2` | Neutral info, tracking |
| `surface` | `#ffffff` | Card backgrounds |
| `surfaceMuted` | `#f1f5f9` | Input backgrounds, inactive chips |
| `border` | `#e2e8f0` | Card borders, dividers |
| `text` | `#0f172a` | Primary text |
| `textMuted` | `#64748b` | Secondary text, labels |

### Status Colors (semantic mapping)
```
ON_TIME / ON_ROAD / ON_DUTY / COMPLETED / PAID  → success (#059669)
DELAYED / IN_PROGRESS / PARTIAL / SERVICE        → warning (#d97706)
CRITICAL / LOW_FUEL / UNPAID / OFF_DUTY          → error (#dc2626) or muted (#64748b)
IDLE / SCHEDULED                                 → surfaceMuted (#f1f5f9)
```

---

## Typography

| Role | Font | Size | Weight | Usage |
|------|------|------|--------|-------|
| Hero Title | PlusJakartaSans | 22-26 | ExtraBold | Page hero cards |
| Section Title | Manrope | 15-16 | Bold | Section headers |
| Card Title | Manrope | 13-14 | Bold | List item names |
| Card Meta | Manrope | 11 | Medium | Descriptions, subtitles |
| Stat Value | Manrope | 16-20 | ExtraBold | Dashboard numbers |
| Stat Label | Manrope | 10-11 | Medium | Below stat values |
| Badge/Chip | Manrope | 10 | Bold | Status chips, labels |
| Button | Manrope | 12-14 | Bold | CTA buttons |
| Caption | Manrope | 10-11 | Medium | Timestamps, small text |

---

## Spacing Scale

```
xs: 4px   — icon padding, tight gaps
sm: 8px   — card internal gaps
md: 16px  — section padding, card margins
lg: 24px  — page horizontal padding
xl: 32px  — section separators
```

---

## Border Radius

```
sm: 8px   — chips, badges
md: 12px  — buttons, inputs
lg: 16px  — cards
xl: 20px  — hero cards, modals
full: 9999 — avatars, pills
```

---

## Shadows

```
card:     { shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }
elevated: { shadowOpacity: 0.12, shadowRadius: 16, elevation: 6 }
pressed:  { shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 }
```

---

## Animation System

### Timing
| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `micro` | 120ms | ease-out | Press feedback, toggles |
| `fast` | 200ms | ease-out | Chip selection, tab switch |
| `normal` | 300ms | spring(tension:180,friction:12) | Card entrance, screen transitions |
| `slow` | 500ms | spring(tension:120,friction:14) | Hero reveal, skeleton shimmer |

### Entrance Animations (staggered)
Each card in a list enters with:
1. **Fade in**: opacity 0→1 over 300ms
2. **Slide up**: translateY 20→0 over 300ms with spring
3. **Stagger**: 60ms delay per item (index × 60ms)

### Press Feedback
- **Scale down** to 0.97 over 120ms on press-in
- **Spring back** to 1.0 over 200ms on release
- Optional haptic: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`

### Skeleton Loading
- Shimmer animation: translateX -200→400 over 1.5s, infinite
- Base color: `#e2e8f0`, shimmer: `#f1f5f9`
- Shape matches the content it replaces (circle for avatar, rect for text)

### Pull-to-Refresh
- Custom spinner with bus icon rotating
- Smooth rubber-band effect

---

## Component Patterns

### AnimatedCard
```jsx
<AnimatedCard onPress={handlePress} delay={index * 60}>
  <View style={cardContent} />
</AnimatedCard>
```
Wraps content with:
- Fade + slide-up entrance animation
- Scale-down press feedback
- Card shadow that reduces on press

### SearchBar
```
┌─────────────────────────────────┐
│ 🔍  Search routes, vehicles...  │  ← rounded, surfaceMuted bg
└─────────────────────────────────┘
```
- Debounced input (300ms)
- Clear button appears when text present
- Filters list in real-time
- Height: 44px, border-radius: 12px

### StatusChip
```
┌──────────┐
│ ● On Time │  ← colored dot + text
└──────────┘
```
- Background: status color at 10% opacity
- Text: status color at full
- Pill shape (border-radius: full)
- Font: 10px Bold

### SkeletonLoader
- Mimics the shape of the content
- Shimmer sweep animation
- Used during initial load only (not refresh)

### EmptyState
```
    🚌
  No routes yet
  Create your first route to get started.
  
  [ Create Route ]  ← optional CTA button
```
- Centered illustration/icon (48px, muted color)
- Title: 14px Bold
- Subtitle: 12px Medium, textMuted
- Optional CTA button below

---

## Page Flows

### Dashboard (home tab)
```
┌─────────────────────────────┐
│ Hero Card (gradient blue)   │  ← fleet overview, GPS live badge
│  "3 of 5 buses on road"     │
│  [████████░░] 78% on-time   │
├─────────────────────────────┤
│ [Buses] [Routes] [Students] │  ← 2x2 stat grid
│ [On-Time]                    │
├─────────────────────────────┤
│ Today's Routes          →   │  ← tap to see all
│ ┌─────────────────────────┐ │
│ │ 🚌 Route 01 · 45 studs  │ │  ← card with status chip
│ │    7:30 → 8:15 · Bus A1 │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Quick Tools                  │
│ [Tracking] [Maintenance]    │  ← 2x2 module grid
│ [Fees]     [Notify]         │
├─────────────────────────────┤
│ Recent Alerts                │  ← notification feed
│ 🔴 Service due — Bus B2     │
│ ⚠️  Low fuel — Bus C3       │
└─────────────────────────────┘
```

### Routes (tab 2)
```
┌─────────────────────────────┐
│ 🔍 Search routes...          │  ← real-time filter
├─────────────────────────────┤
│ [3 Routes] [120 Students]   │  ← summary stat bar
│ [92% On-Time]               │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🟢 Route 01             │ │  ← tappable card
│ │    8 stops · 45 students│ │
│ │    7:30 → 8:15 · Bus A1 │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🟡 Route 02 (Delayed)   │ │
│ │    ...                   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```
→ Tap card → RouteDetail (stop list, enrolled students, GPS status)

### Fleet (tab 3)
```
┌─────────────────────────────┐
│ 🔍 Search vehicles...        │
├─────────────────────────────┤
│ [5 Fleet] [3 On Road] [1 Low]│
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🚌 KA-01-AB-1234        │ │
│ │    Tata · 45,000 km      │ │
│ │    [████████░░] 78% fuel │ │  ← animated fuel gauge
│ │    ● On Road             │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```
→ Tap card → VehicleDetail (service history, fuel log, documents)

### Drivers (tab 4)
```
┌─────────────────────────────┐
│ 🔍 Search drivers...         │
├─────────────────────────────┤
│ [6 Drivers] [4 On Duty] [2 Off]│
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 👤 Ravi Kumar            │ │  ← circular avatar
│ │    8 yrs exp · Route 01  │ │
│ │    Lic ·123456 exp 2025  │ │
│ │    [ON DUTY] ← toggle   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Profile (tab 5)
```
┌─────────────────────────────┐
│ Gradient header              │
│    👤 (avatar)               │
│    Ravi Singh                │
│    Transport Manager         │
│    [5 Buses] [3 Routes]     │
│    [120 Students]            │
├─────────────────────────────┤
│ PREFERENCES                  │
│ ┌─────────────────────────┐ │
│ │ ⏰ Delay alerts    [ON] │ │  ← toggle switches
│ │ 🔧 Service reminders[ON]│ │
│ │ 🔥 Low fuel alerts  [ON]│ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ ACCOUNT                      │
│ ┌─────────────────────────┐ │
│ │ 🗺️ Route Master       → │ │
│ │ 📄 Fleet Reports      → │ │
│ │ 🛡️ Access & Perm      → │ │
│ │ ❓ Help & Support     → │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [  🚪 Logout  ]              │
│        v1.0.0                │
└─────────────────────────────┘
```

### Tracking (feature module)
```
┌─────────────────────────────┐
│ ┌─────────────────────────┐ │
│ │  🗺️ Live Map Placeholder│ │  ← stylized map with bus dots
│ │  3 buses broadcasting   │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ On Live Tracking             │
│ ┌─────────────────────────┐ │
│ │ 🚌 Route 01 · 45 km/h   │ │
│ │    Now at Stop 3 · ETA 8│ │
│ │    [████████░░] 65%      │ │  ← progress bar
│ │    [Flag delay]          │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ On Road — No Signal          │  ← dimmed cards
│ ┌─────────────────────────┐ │
│ │ 📡 KA-02-CD-5678        │ │
│ │    Route 02 · no ping   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Maintenance (feature module)
```
┌─────────────────────────────┐
│ [3 Open] [2 Done] [₹12,500]│
├─────────────────────────────┤
│ [Service Queue] [Fuel Log]  │  ← pill tabs
├───────────────────────── 🔥 │  ← log fuel button
│ ┌─────────────────────────┐ │
│ │ 🔧 Bus A1 · Tire Change │ │
│ │    Sep 5 · ₹4,500       │ │
│ │    [Mark Completed]      │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Fees (feature module)
```
┌─────────────────────────────┐
│ [₹2.4L Collected] [₹3L Exp]│
│ [8 Unpaid]                   │
├─────────────────────────────┤
│ Collection Rate [████░] 80% │
├─────────────────────────────┤
│ Yearly: ₹20,000  [Revise]  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 👤 Rahul · ₹20,000      │ │
│ │    [Remind] [Collect]   │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 👤 Priya · PAID ✓       │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Notifications (feature module)
```
┌─────────────────────────────┐
│ Gradient header              │
│    ← Notifications  ✓✓      │
│    3 unread                  │
├─────────────────────────────┤
│ [Inbox] [Broadcast]          │  ← underline tabs
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔴 (dot) 🚌 Delay Alert  │ │
│ │    Route 02 is delayed   │ │
│ │    5m ago · TRANSPORT    │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ BROADCAST TAB:               │
│ Subject: [___________]       │
│ Message: [___________]       │
│ Audience: [All] [Route] [Def]│
│ [📢 Broadcast Now]           │
└─────────────────────────────┘
```

---

## Bottom Navbar

```
┌──────┬──────┬──────┬──────┬──────┐
│  🏠  │  🗺️  │  🚌  │  👤  │  👤  │
│ Home │Routes│ Fleet│Drivers│Profile│
│  ●   │      │      │      │      │  ← active indicator pill
└──────┴──────┴──────┴──────┴──────┘
```
- Background: primary blue
- Icons: white (inactive: 60% opacity)
- Active: solid icon + label + animated pill indicator below
- Label appears below icon (10px, bold)
- Pill: 4px tall, 20px wide, white, springs in on tab change

---

## Search Behavior

- Appears at top of Routes, Fleet, Drivers pages
- Placeholder text is role-specific ("Search routes...", "Search vehicles...", "Search drivers...")
- Filters by name/regNo/route/students (case-insensitive, includes match)
- 300ms debounce
- Clear button (×) when text present
- Empty search result: "No results for 'xyz'" with clear button

---

## Responsive Behavior

- All pages use `flex: 1` with `ScrollView` or `FlatList`
- Horizontal padding: 16px on all list pages
- Cards: full width minus padding (no fixed widths)
- Stat rows: `flex: 1` with 4px horizontal margin
- Max content width: 600px (centered on tablets)
