---
name: Mind Bridge Design System
description: Calm Wayfinding. A signage-style system for a student mental wellness service, light by default with a dark option.
colors:
  ground: "#f3f5f2"
  surface: "#ffffff"
  panel: "#0f4a55"
  panel-ink: "#f4f8f6"
  ink: "#14292f"
  muted: "#4c6269"
  line: "#c9d5d2"
  amber: "#f0b13a"
  amber-ink: "#2b1f00"
  safe: "#1e7a56"
  urgent: "#a3271b"
  warn: "#7a4f00"
  focus: "#0b6bcb"
  dark-ground: "#0c191d"
  dark-surface: "#122329"
  dark-panel: "#1a5560"
  dark-ink: "#e6efed"
  dark-muted: "#9fb5ba"
  dark-focus: "#ffc857"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Arial Narrow, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "6px"
---

# Design System: Mind Bridge

## Overview

**Creative North Star: "Calm Wayfinding."** The product is a route to help, so the interface is built like good hospital and campus signage: plain, high-contrast, legible at a glance, and always showing where you are and what comes next. Emotion is carried by clarity and steadiness, not decoration.

Light is the default (daytime use on campus), with a dark theme for late-night check-ins. The theme is switched by `data-theme` on the `.mb` wrapper and remembered in `localStorage` under `mindbridge_theme`.

## Rules

- **One container: the signage plate.** Teal panels (`.mb-plate`) carry the key statements. Corners stay small (6px), like routed signs. No glass, no blur, no heavy shadows.
- **Amber means urgent exit only.** The crisis line (NCMH 1553) is always visible in amber. Red is reserved for risk and errors, and risk is always also stated in words, never by color alone.
- **Type.** Barlow Semi Condensed for headings and numerals (the highway-sign look); Atkinson Hyperlegible Next for everything else. Headings are bold and tight; body copy is 16px+ at 1.6 line height with a 65-70ch measure.
- **Controls.** 48px minimum height, 2px borders, solid teal for the primary action and outlined for secondary. Focus is a 3px outline with 3px offset in every state.
- **Motion.** One authored moment (the route line drawing on the landing page). Everything respects `prefers-reduced-motion`.
- **Copy.** Plain, specific, non-clinical. Results are always described as a screening aid, not a diagnosis. No claim goes on the page that the product or its security rules do not back up.

## Implementation notes

- Tokens live in `client/src/theme.css` as `--mb-*` custom properties under `.mb`, with a dark override.
- Pages use Tailwind arbitrary values such as `text-[color:var(--mb-ink)]`. Status tints use `--mb-urgent`, `--mb-warn`, `--mb-safe`, `--mb-brand` and their `-bg` pairs; solid fills use `--mb-urgent-solid` and similar so light text stays readable in both themes.
- Public pages use `PublicShell`; signed-in pages use `DashboardLayout`. Both wrap content in `.mb`.
- The student, appointments, resources, settings and staff pages were moved onto these tokens with a scripted class migration rather than rebuilt from scratch, so their layouts still follow the earlier card-based structure.
