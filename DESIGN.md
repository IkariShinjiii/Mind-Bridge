---
name: Mind Bridge Design System
description: A calm, high-trust, accessible interface designed for student mental wellness and clinical triage.
colors:
  bg-root: "#030712"
  surface-primary: "#0b1329"
  surface-secondary: "#111c38"
  surface-card: "#0f172a"
  surface-highlight: "#1e293b"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  border-active: "rgba(45, 212, 191, 0.3)"
  brand-primary: "#2dd4bf"
  brand-secondary: "#38bdf8"
  brand-accent: "#14b8a6"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  status-calm: "#10b981"
  status-warning: "#f59e0b"
  status-urgent: "#f43f5e"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand-primary}"
    textColor: "#030712"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-glass:
    backgroundColor: "{colors.surface-primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Mind Bridge

## Overview

**Creative North Star: "The Calming Haven"**

Mind Bridge is a sanctuary for students navigating stress, vulnerability, and mental health challenges, paired with a reliable, structured clinical cockpit for campus counselors. The visual language evokes psychological safety, steady reassurance, and intentional clarity. 

Unlike sterile institutional portals or loud consumer apps, Mind Bridge achieves a balanced atmosphere: deeply soothing dark oceanic tones, organic ambient depth, precise human-scale typography, and quiet, high-contrast readability. Every visual element is crafted to lower cognitive stress and guide the user intuitively toward help and recovery.

### Key Characteristics
- **Calming Depth**: Atmospheric deep indigo-slate backdrops with gentle, non-distracting atmospheric lighting.
- **Empathetic Readability**: High-contrast, solid typography prioritizing clarity; no noisy gradient text gimmicks.
- **Tactile Affordances**: Generous touch targets (min 44px), smooth responsive tap states, and clear keyboard focus rings.
- **Purposeful Motion**: Calmed, spring-based micro-interactions with reduced-motion fallbacks for anxiety sensitivity.

---

## Colors

The Mind Bridge palette is grounded in restorative oceanic indigos, organic slate neutrals, and restorative aquatic accents that convey security, clinical competence, and emotional warmth.

### Primary Palette
- **Deep Navy Base (`#030712`)**: The foundational dark backdrop that eliminates screen glare and provides a grounding canvas.
- **Surface Deep Slate (`#0b1329` / `#0f172a`)**: Elevated surfaces for cards, panels, and modals, creating clear structural hierarchy.
- **Restorative Teal Accent (`#2dd4bf` / `#14b8a6`)**: The primary brand and action color, evoking renewal, balance, and mental clarity.
- **Atmospheric Sky (`#38bdf8`)**: Secondary supportive accent for info badges, links, and calendar interactions.

### Semantic Triage Roles
- **Calm / Normal (`#10b981`)**: Low risk, confirmed appointments, active verified status.
- **Moderate / Caution (`#f59e0b`)**: Mild-to-moderate wellness flags requiring supportive check-ins.
- **Urgent / High Support (`#f43f5e`)**: Urgent risk flags requiring immediate counselor outreach and crisis resource prominence.

### Contrast Rules
- Body copy is always pure crisp light slate (`#f8fafc` or `#e2e8f0`) on dark surfaces (minimum contrast ratio > 8:1).
- Secondary helper text remains high contrast (`#94a3b8`, > 5:1 contrast ratio).
- On colored button badges (e.g. Teal), text is dark charcoal/black (`#030712`) with bold weight for crisp legibility.

---

## Typography

Mind Bridge utilizes an intentional typographic pairing: **Fraunces** for warm, humanized editorial display moments and **Inter** for clinical clarity, scannable surveys, and responsive data tables.

- **Display**: Reserved for serene welcoming headers and hero titles. Serif warmth bridges human emotion with institutional trust.
- **Headlines & Titles**: Clear, semibold/bold Inter with tight tracking (`-0.015em`) for immediate scannability.
- **Body**: Highly legible Inter (`15px` / `0.9375rem`, line-height `1.55`, measure `65-75ch`), optimized for comfortable reading during surveys and counselor notes.
- **Labels & Badges**: Crisp uppercase / semibold Inter with gentle tracking (`+0.05em`) for triage tags, role pills, and timestamps.

---

## Layout

- **Viewport Containment**: Locked full-viewport app frame on mobile/desktop (`100dvh`) with clean interior scroll containers, preventing rubber-banding and background disconnections.
- **Grid Rhythm**: Consistent 8pt spatial grid (`4px`, `8px`, `16px`, `24px`, `32px`, `48px`).
- **Surface Scaffolding**: 
  - Generous top-spacing for sections (`gap-6` to `gap-8`).
  - Scannable card structures with distinct visual groupings rather than endless repetitive card grids.
  - Dedicated fixed desktop navigation / mobile bottom bar ergonomics.

---

## Elevation & Depth

- **Tonal Layering Over Heavy Shadows**: Depth is primarily established through tonal shifts from `#030712` (canvas) → `#0b1329` (panels) → `#1e293b` (interactive elements).
- **Soft Ambient Borders**: `border border-white/[0.08]` provides crisp edge definition across dark surfaces without starkness.
- **Glassmorphism Discipline**: Backdrops use subtle blur (`backdrop-blur-xl`) with opaque underlays (`bg-gray-900/80`) to ensure 100% legibility of nested text and controls.

---

## Shapes

- **Corner Radii**:
  - Modals & Hero Panels: `rounded-3xl` (`24px`) for approachable, non-threatening geometry.
  - Cards & Content Blocks: `rounded-2xl` (`16px`).
  - Buttons & Form Inputs: `rounded-xl` (`12px`).
  - Status Badges & Pills: `rounded-full` (`9999px`).

---

## Components

### 1. Buttons & Controls
- Minimum height `44px` on touch surfaces.
- Active states use subtle micro-scale (`active:scale-[0.98]`).
- Primary button: Solid teal background with dark contrasting text and hover elevation.
- Secondary button: Soft slate glass card with subtle border and text highlight.

### 2. Modals & Dialogs
- Backdrops with `bg-black/80 backdrop-blur-md` for protected focus.
- Keyboard accessibility: Escape key listener, auto body-scroll lock, explicit ARIA `role="dialog"` and `aria-modal="true"`.
- Clean header separation with prominent close button (`44px` hit target).

### 3. Forms & Check-in Surveys
- Inputs feature explicit focus rings (`ring-2 ring-teal-400 ring-offset-2 ring-offset-gray-950`).
- Survey rating selectors use tactile, high-contrast segmented pills or cards that respond immediately to selection.

### 4. Triage & Crisis Alerts
- Crisis banners use solid background tints with high contrast typography.
- Never use neon flashing decorations; maintain dignified, urgent clarity.

---

## Do's and Don'ts

### Do:
- **Do** use solid, clean typography colors with maximum legibility.
- **Do** provide immediate escape routes and 24/7 crisis access across student views.
- **Do** maintain smooth spring physics and respect `prefers-reduced-motion`.
- **Do** ensure every interactive element has a minimum `44px` touch hit-box.

### Don't:
- **Don't** use decorative gradient text or neon AI-slop color clashes (e.g. violet-to-cyan rainbow headings).
- **Don't** wash out secondary text with illegible low-contrast grays on dark surfaces.
- **Don't** trap users in modals without escape keys, outside click dismiss, and clear close buttons.
- **Don't** use generic stock placeholders or uncalibrated alert icons.
