# Design System Document: The Neural Overlay

## 1. Overview & Creative North Star
**Creative North Star: "The Predictive Sentinel"**
This design system moves away from the static, "box-heavy" look of traditional enterprise software. Instead, it adopts a high-end editorial aesthetic that mimics a sophisticated command-and-control interface. The goal is to make SDN (Software-Defined Networking) feel like a living, breathing organism. 

We achieve this through **Organic Asymmetry** and **Optical Depth**. By layering frosted glass surfaces and utilizing high-contrast typography, we create an environment where the most critical data "vibrates" with urgency while background metrics recede into a calm, dark void. This is not just a dashboard; it is a high-fidelity lens into the digital infrastructure.

## 2. Colors: Tonal Depth & Luminous Accents
Our palette is rooted in the deep shadows of the `surface` (#0b1326), using light not as a decoration, but as information.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined by background color shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation needed. If a visual break is required, use a 24px vertical margin rather than a line.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-transparent glass sheets.
*   **Base:** `surface` (#0b1326) — The deep abyss.
*   **Middle Ground:** `surface-container` (#171f33) — For main content areas.
*   **Foreground:** `surface-container-highest` (#2d3449) — For active interactive elements.
*   **The "Glass & Gradient" Rule:** Floating modals and high-level KPI cards must use Glassmorphism. Apply `surface-variant` at 60% opacity with a `backdrop-filter: blur(12px)`. This allows the "glow" of network nodes to bleed through the interface, maintaining spatial awareness.

### Signature Textures
Main CTAs and critical "Stable" metrics must use a subtle radial gradient: `primary` (#4ae176) to `on-primary-container` (#009542). This adds a "lithium-ion" glow that flat colors cannot replicate.

## 3. Typography: Editorial Authority
We utilize a tri-font system to separate intent: **Manrope** for impact, **Inter** for utility, and **Space Grotesk** for technical metadata.

*   **Display & Headlines (Manrope):** Large, airy, and authoritative. Use `display-md` for high-level network health percentages to give them a "prestige" feel.
*   **Body (Inter):** Highly legible and neutral. This is for system descriptions and configuration labels.
*   **Technical Labels (Space Grotesk):** This monospace-leaning sans-serif is reserved for IP addresses, MAC addresses, and packet IDs. It signals "Data" to the user’s subconscious.
*   **Logs (Custom Monospace):** All terminal and log outputs must use a dedicated monospace font to ensure character alignment and a "pro-tool" vibe.

## 4. Elevation & Depth: Tonal Layering
In "The Neural Overlay," depth is a function of light, not shadows.

*   **The Layering Principle:** Rather than using shadows to lift an object, use "Inner Glows." For a `primary` card, apply a 1px inner stroke of `primary-fixed` at 20% opacity to simulate a light-catching edge.
*   **Ambient Shadows:** For floating AI-insights or modals, use an extremely diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow color must never be pure black; it should be a darker tint of the `surface-container-lowest`.
*   **The "Ghost Border" Fallback:** Where containment is vital (e.g., input fields), use the `outline-variant` (#45464d) at 15% opacity. This creates a "whisper" of a boundary.
*   **Luminous States:** Active network paths should utilize a `drop-shadow` filter with the `primary` color (#4ae176) at low opacity to create a "neon pulse" effect.

## 5. Components: Precision Engineered
Components are designed to feel like hardware modules integrated into a digital HUD.

### Buttons & Interaction
*   **Primary Action:** High-contrast `primary` (#4ae176) background. No border. 16px (`lg`) corner radius. On hover, increase the "glow" using a subtle outer box-shadow of the same color.
*   **Secondary/Glass:** `surface-variant` with 40% opacity and a `backdrop-filter`. This is for "non-destructive" actions.

### Input Fields & Data Entry
*   **Style:** Background set to `surface-container-lowest`. 
*   **Focus State:** The border transitions from "Ghost" (15% opacity) to 100% `primary` opacity, accompanied by a subtle 4px outer glow.
*   **Typography:** User input should always use `label-md` (Space Grotesk) to differentiate human input from system-generated text.

### Cards & Lists
*   **Constraint:** Zero dividers. Use `margin-bottom: 12px` and `surface-container-low` vs `surface-container-high` to distinguish between list items.
*   **Metrics:** Large-scale numbers should use `display-sm` and be paired with a `label-sm` technical descriptor.

### Network Topology Nodes (Specialty Component)
*   **Active Nodes:** `primary` (#4ae176) with a 10px blur glow.
*   **Failing Nodes:** `tertiary-container` (#390003) with a pulsing animation to `on-tertiary-container` (#eb4141).

## 6. Do's and Don'ts

### Do:
*   **Do** use intentional asymmetry. A sidebar might be 280px while a right-hand "AI-Pulse" panel is 320px to break the "standard dashboard" grid.
*   **Do** use `1rem` (16px) rounding for all primary containers to soften the technical edge.
*   **Do** lean into high-contrast color pairings (e.g., Neon Green on Deep Navy) for critical data.

### Don't:
*   **Don't** use 100% opaque borders. They "trap" the data and make the UI feel cramped.
*   **Don't** use standard "Material Design" blue for links. Use `secondary-fixed-dim` (#bec6e0) for a more sophisticated, slate-toned utility look.
*   **Don't** clutter the screen. If a metric isn't changing in real-time, it belongs in a sub-layer, not the main HUD.
*   **Don't** use standard "Error Red" for everything. Use the `tertiary` tokens for nuanced warnings (Soft Red) and reserve `on-tertiary-container` for critical "System Down" states.