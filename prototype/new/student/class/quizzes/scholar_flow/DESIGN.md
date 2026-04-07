# Design System Specification: High-End Student Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Academic Curator"**

This design system moves away from the utilitarian, "boxed-in" feel of traditional Learning Management Systems. Instead, it adopts an editorial, high-end dashboard aesthetic that treats a student's data as a premium gallery of achievements. 

We break the "template" look by utilizing **Intentional Asymmetry** and **Tonal Depth**. By layering surfaces of varying luminance rather than using rigid borders, we create a layout that breathes. The experience should feel like a sophisticated digital workspace—fluid, calm, and authoritative—where bold typography drives the narrative and glassmorphism provides a sense of modern transparency.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, vibrant blue, supported by a spectrum of functional secondaries. However, the "soul" of the system lies in its neutral foundation.

### The Color Tokens
*   **Primary:** `primary` (#0050d4) to `primary_container` (#7b9cff) gradient for high-impact actions.
*   **Secondary (Academic Action):** `secondary` (#702ae1) for creative tasks.
*   **Tertiary (Progress):** `tertiary` (#a23800) for high-focus or urgent alerts.
*   **Neutrals:** `surface` (#f5f7f9) to `surface_container_lowest` (#ffffff).

### The "No-Line" Rule
**Borders are strictly prohibited for sectioning.** To define boundaries, designers must use background color shifts. A `surface_container_low` card sitting on a `surface` background provides enough contrast to be felt without being seen as a "box." This creates a seamless, high-end flow.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked sheets of fine, semi-translucent paper:
1.  **Base Layer:** `surface` (#f5f7f9) – The canvas.
2.  **Section Layer:** `surface_container_low` (#eef1f3) – Defining large content areas.
3.  **Component Layer:** `surface_container_lowest` (#ffffff) – Individual cards and interactive elements.
4.  **Floating Layer:** Glassmorphic elements using `surface_variant` at 60% opacity with a `20px` backdrop blur.

### Signature Textures
Main CTAs and Hero sections must not use flat fills. Use a **Directional Lush Gradient**: `primary` (#0050d4) at 0% to `primary_dim` (#0046bb) at 100%, angled at 135°.

---

## 3. Typography
We use a dual-font strategy to balance character with readability.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Editorial Voice." Large scales and tight letter-spacing create an authoritative, premium feel. Use `headline-lg` for dashboard greetings to make the student feel centered.
*   **Body & Titles (Manrope):** Chosen for its exceptional legibility in dense data environments. It provides a clean, modern "Workhorse" font for course titles and descriptions.

**The "Bold-on-Dark" Rule:** When headers are placed over `primary` gradients or `secondary` action cards, use `on_primary` (#f1f2ff) with a `font-weight` of 700 to ensure the information feels "etched" into the interface.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural shadows.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` section to create a soft, natural lift. This simulates physical stacking.
*   **Ambient Shadows:** For floating elements (like the Bottom Navigation Bar), use a shadow color of `on_surface` at 6% opacity, with a `Y: 8px, Blur: 24px` spread. This mimics soft, natural ambient light.
*   **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use `outline_variant` (#abadaf) at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use for notification overlays. Apply `surface_container_lowest` with 70% opacity and a `16px` backdrop-blur to allow student data to bleed through subtly.

---

## 5. Components

### Cards & Layouts
*   **Radii:** Use `xl` (1.5rem / 24px) for main dashboard containers and `lg` (1rem / 16px) for inner content cards.
*   **Separation:** Forbid divider lines. Use `1.5rem` (24px) of vertical white space to separate course modules.

### Progress Indicators
*   **Circular Progress:** Use a `primary` to `primary_container` gradient stroke. The track should be `surface_container_high` at 10% opacity.
*   **Heatmap Cells:** Use `error_container` (Low), `tertiary_container` (Mid), and `secondary_container` (High). Cells must have a `md` (0.75rem) corner radius—never square.

### Action Components
*   **Buttons:** 
    *   *Primary:* Gradient fill (`primary` to `primary_dim`), `xl` roundedness, white text.
    *   *Secondary:* `surface_container_high` fill, no border, `on_surface` text.
*   **Notification Badges:** Use `error` (#b31b25) with `on_error` text. Position them offset from the icon center to break symmetry.
*   **Bottom Navigation Bar:** A floating "Island" layout. Use `surface_container_lowest` at 90% opacity, `24px` blur, and a `full` (9999px) corner radius.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins (e.g., more padding on the left than the right in hero sections) to create visual interest.
*   **Do** use `display-lg` typography for singular, high-value data points (e.g., a GPA or total credits).
*   **Do** leverage "White Space as a Divider." If two elements feel cluttered, add space, don't add a line.

### Don't
*   **Don't** use 100% black text. Always use `on_surface` (#2c2f31) to maintain a soft, premium feel.
*   **Don't** use standard 4px or 8px corners. This system thrives on the "Lush Roundness" of 12px-24px.
*   **Don't** use harsh drop shadows. If a shadow looks like a "shadow," it is too dark. It should look like a "glow" of depth.