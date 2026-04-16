# Design System: The Neural Overlay
> SDN Traffic Optimizer — Unified Design Language v2.0

---

## 1. Creative North Star: "The Predictive Sentinel"

This system mimics a high-end command-and-control interface where the network feels like a living organism. We achieve this through **Organic Asymmetry**, **Optical Depth**, and **Luminous States**. Data breathes. Critical states glow. Calm states recede.

---

## 2. Color System

### Base Palette (CSS Variables — required for backend binding)

```css
:root {
  /* === SURFACES === */
  --surface-base:            #0b1326;   /* bg-surface / background */
  --surface-low:             #131b2e;   /* bg-surface-container-low */
  --surface-mid:             #171f33;   /* bg-surface-container */
  --surface-high:            #222a3d;   /* bg-surface-container-high */
  --surface-highest:         #2d3449;   /* bg-surface-container-highest */
  --surface-lowest:          #060e20;   /* bg-surface-container-lowest */

  /* === PRIMARY (Neon Green) === */
  --primary:                 #4ae176;   /* bg-primary / text-primary */
  --primary-fixed:           #6bff8f;
  --primary-container:       #001d07;
  --on-primary:              #003915;
  --on-primary-container:    #009542;

  /* === SECONDARY (Slate Blue) === */
  --secondary:               #bec6e0;
  --secondary-container:     #3f465c;
  --secondary-fixed:         #dae2fd;
  --secondary-fixed-dim:     #bec6e0;
  --on-secondary:            #283044;

  /* === TERTIARY / DANGER (Alert Red) === */
  --tertiary:                #ffb3ad;
  --tertiary-container:      #390003;
  --on-tertiary-container:   #eb4141;   /* Critical/Error states */
  --error:                   #ffb4ab;
  --error-container:         #93000a;

  /* === ON-SURFACE TEXT === */
  --on-surface:              #dae2fd;
  --on-surface-variant:      #c6c6cd;
  --outline:                 #909097;
  --outline-variant:         #45464d;

  /* === BACKEND BINDING VARIABLES (DO NOT RENAME) === */
  --active-path-color:       var(--primary);         /* Topology Active Path */
  --congestion-state:        var(--on-tertiary-container); /* Congestion indicator */
  --reroute-state:           #f59e0b;                /* Amber — rerouting in progress */
  --neural-engine-status:    var(--primary);         /* Dashboard engine health */
  --node-healthy:            var(--primary);
  --node-congested:          var(--tertiary);
  --node-critical:           var(--on-tertiary-container);
  --node-standby:            var(--outline-variant);
}
```

### Status Color Map

| State      | Color Token           | Hex       | Usage |
|------------|-----------------------|-----------|-------|
| ACTIVE     | `--primary`           | `#4ae176` | Normal operation |
| NORMAL     | `--primary`           | `#4ae176` | Healthy metrics |
| WARNING    | `--tertiary`          | `#ffb3ad` | Elevated concern |
| CRITICAL   | `--on-tertiary-container` | `#eb4141` | Immediate action |
| REROUTING  | `--reroute-state`     | `#f59e0b` | Path switching |

---

## 3. Typography (Tri-Font System)

| Role       | Font         | Usage |
|------------|--------------|-------|
| Headlines  | **Manrope**  | Page titles, card headers, large KPIs |
| Body       | **Inter**    | Descriptions, nav labels, form labels |
| Labels     | **Space Grotesk** | IPs, MAC addresses, log prefixes, status chips |
| Terminal   | `monospace` (system) | Log lines, raw data output |

### Classes:
- `font-headline` → Manrope
- `font-body` → Inter
- `font-label` → Space Grotesk

---

## 4. Border Radius — STRICT: `rounded-xl` Only

All primary containers use `rounded-xl` (`0.75rem`). This is enforced globally.

```
- Cards, panels, sections → rounded-xl
- Chips, badges, pills → rounded-full
- Input fields → rounded-xl
- Buttons → rounded-xl
- DO NOT use: rounded, rounded-sm, rounded-lg, rounded-2xl, rounded-3xl
```

> Exception: Topology SVG nodes are circles — not subject to border-radius rules.

---

## 5. Spacing Scale

Based on 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `p-4` | 16px | Inner padding — solid-card |
| `p-6` | 24px | Inner padding — glass-panel |
| `p-8` | 32px | Inner padding — large sections |
| `gap-6` | 24px | Grid column gap |
| `mb-6` | 24px | Section separator (no-line rule) |
| `mb-10`| 40px | Major section break |

---

## 6. Card System

### `glass-panel` — Top-Level Containers
```css
.glass-panel {
  background: rgba(45, 52, 73, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 0 0 rgba(74, 225, 118, 0.1);
  border-radius: 0.75rem; /* rounded-xl */
}
```
Use for: top-level section containers, main content areas.

### `solid-card` — Inner Blocks
```css
.solid-card {
  background: #060e20; /* surface-container-lowest */
  border-radius: 0.75rem;
  border: 1px solid rgba(69, 70, 77, 0.1); /* outline-variant/10 */
}
```
Use for: metric cells, log rows, inner UI blocks inside glass-panel.

### `inner-glow` — Active State Enhancement
```css
.inner-glow {
  box-shadow: inset 0 1px 0 0 rgba(74, 225, 118, 0.1);
}
```

---

## 7. Status Badges / Labels

```html
<!-- ACTIVE -->
<span class="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-label text-primary font-bold tracking-widest uppercase">ACTIVE</span>

<!-- NORMAL -->
<span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-label font-bold uppercase">NORMAL</span>

<!-- WARNING -->
<span class="px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-[10px] font-label font-bold uppercase">WARNING</span>

<!-- CRITICAL -->
<span class="px-3 py-1 rounded-full bg-on-tertiary-container/10 text-on-tertiary-container text-[10px] font-label font-bold uppercase">CRITICAL</span>

<!-- REROUTING -->
<span class="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-label font-bold uppercase">REROUTING</span>
```

---

## 8. Log System (Terminal-Style, Unified)

```html
<!-- Log Container -->
<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
  <!-- Terminal Header Bar -->
  <div class="px-4 py-3 bg-surface-container-high flex items-center justify-between">
    <div class="flex gap-1.5">
      <div class="w-2.5 h-2.5 rounded-full bg-on-tertiary-container/40"></div>
      <div class="w-2.5 h-2.5 rounded-full bg-primary/40"></div>
      <div class="w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim/40"></div>
    </div>
    <span class="font-label text-xs font-bold text-slate-400 uppercase">SYSTEM LOGS</span>
  </div>
  <!-- Log Body -->
  <div class="p-6 font-mono text-xs leading-relaxed overflow-y-auto">
    <div class="flex gap-4">
      <span class="text-slate-600 shrink-0">[14:20:01]</span>
      <span><span class="text-blue-400 font-bold">INFO:</span> Log message</span>
    </div>
  </div>
</div>

<!-- Log Level Colors (strict) -->
<!-- INFO    → text-blue-400 -->
<!-- WARN    → text-yellow-400 -->
<!-- ERROR   → text-on-tertiary-container (#eb4141) -->
<!-- SUCCESS → text-primary (#4ae176) -->
<!-- EXEC    → text-primary -->
```

---

## 9. Grid Layout — GLOBAL STANDARD

All pages use `grid-cols-12` as the base grid:

```html
<div class="grid grid-cols-12 gap-6">
  <section class="col-span-12 lg:col-span-8"> ... </section>
  <section class="col-span-12 lg:col-span-4"> ... </section>
</div>
```

---

## 10. Elevation / Depth Rules (No-Line Rule)

- **NEVER** use `border` as a visual divider
- Use `margin-bottom: 24px` instead of `<hr>` or borders
- Use background tonal shifts for separation:
  - `surface-container-lowest` → `surface-container-low` → `surface-container` → `surface-container-high`
- Ghost borders only for input fields: `border border-outline-variant/15`
- Active paths: `filter: drop-shadow(0 0 8px var(--active-path-color))`

---

## 11. Interactivity Patterns

```css
/* Standard hover transition */
.nav-item { transition: all 300ms ease-in-out; }

/* Active sidebar item */
.nav-active {
  background: rgba(74, 225, 118, 0.1);
  color: #4ae176;
  border-right: 4px solid #4ae176;
}

/* Primary button glow on hover */
.btn-primary:hover {
  box-shadow: 0 0 15px rgba(74, 225, 118, 0.4);
}

/* Toggle switch — checked state */
peer-checked:bg-primary

/* Neon glow for SVG elements */
.neon-pulse { filter: drop-shadow(0 0 8px #4ae176); }
.error-pulse { filter: drop-shadow(0 0 8px #eb4141); }
```

---

## 12. Do's and Don'ts

### ✅ DO:
- Use `rounded-xl` for all containers
- Use tonal layering for visual separation (not borders)
- Use `Manrope` for all large text/KPIs
- Use `Space Grotesk` for technical labels, IPs, status chips
- Use `--active-path-color` CSS variable for topology paths
- Use `--neural-engine-status` variable for engine status binding

### ❌ DON'T:
- Use `rounded-2xl`, `rounded-3xl`, or `rounded-lg` for main containers
- Use plain `border-t`, `border-b`, `divide-y` for section separation
- Use "Error Red" (#ef4444) — use `on-tertiary-container` (#eb4141)
- Use Material blue for links — use `secondary-fixed-dim` (#bec6e0)
- Use `React`, `Vue`, `Angular` — Vanilla JS + HTML + TailwindCSS only

---

## 13. Backend Integration Readiness

All DOM elements that will receive live data MUST use `data-bind` attributes:

```html
<!-- Example bindings -->
<p data-bind="neural-engine-status" data-unit="text">NORMAL</p>
<p data-bind="active-path-color" data-unit="color">--</p>
<p data-bind="congestion-state" data-unit="percentage">12.4%</p>
<p data-bind="reroute-state" data-unit="count">08</p>
<p data-bind="system-latency" data-unit="ms">0.42ms</p>
```

Flask integration point:
```python
# POST /api/status → returns JSON matching data-bind keys
# GET  /api/topology → returns node/edge graph JSON
# GET  /api/logs → returns log stream (SSE or polling)
```
