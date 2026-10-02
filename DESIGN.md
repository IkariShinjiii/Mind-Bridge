---
name: Mind Bridge Design System
description: Calm Wayfinding, softened. A teal, high-contrast system for a student mental wellness service, light by default with a dark option.
colors:
  ground: "#f4f7f6"
  surface: "#ffffff"
  surface-2: "#e7eeed"
  panel: "#0d4652"
  panel-ink: "#f6faf9"
  panel-soft: "#d4e6e4"
  ink: "#10252b"
  muted: "#38505a"
  line: "#d3dedb"
  field-line: "#6f858c"
  link: "#09509a"
  focus: "#0b6bcb"
  brand-bg: "#e1f0f0"
  accent: "#2aa6a0"
  amber: "#f0b13a"
  amber-ink: "#1f1600"
  safe: "#0f5a40"
  safe-bg: "#e2f3ea"
  warn: "#664000"
  warn-bg: "#fdf1d6"
  urgent: "#8c1f14"
  urgent-bg: "#fcebe8"
  violet: "#4d3490"
  dark-ground: "#0b171b"
  dark-surface: "#112127"
  dark-panel: "#134853"
  dark-ink: "#e9f2f0"
  dark-muted: "#b4c8cc"
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
  sm: "8px"
  md: "12px"
  lg: "16px"
---

# Design System: Mind Bridge

## Overview

**Creative North Star: "Calm Wayfinding."** The product is a route to help, so the interface is plain, high-contrast and legible at a glance, and always shows where you are and what comes next. The look is soft and trustworthy rather than clinical: rounded corners, hairline borders, gentle teal-tinted shadows. Emotion is carried by clarity and steadiness, not decoration.

Light is the default (daytime use on campus), with a dark theme for late-night check-ins. The theme is switched by `data-theme` on the `.mb` wrapper and remembered in `localStorage` under `mindbridge_theme`.

## Colour

- **Primary: deep teal** (`panel`, `brand`). Filled for the main action, outlined for the secondary one, and used for navigation's active state. `accent` (bright teal) is decorative only: gradients and progress fills, never text.
- **Neutrals:** `ground` for the page, `surface` for cards, `surface-2` for inset and disabled areas, `ink` for text, `muted` for supporting text, `line` for dividers.
- **Status:** green = steady (`safe`), amber-brown = moderate (`warn`), red = priority or error (`urgent`). Risk is always also stated in words, never by colour alone.
- **Amber is for the crisis line only.** The NCMH number (1553) is always one tap away, in amber.
- **Contrast:** every text pairing (ink, muted, brand, status ink on its tint, light on panel) is at least 7:1 in both themes (WCAG AAA). Input borders (`field-line`) are 3:1 or better. Re-run the checks if a token changes.

## Typography

Two families: Barlow Semi Condensed for headings and numerals, Atkinson Hyperlegible Next for everything else.

| Level | Size | Weight | Line height |
| --- | --- | --- | --- |
| H1 page title | 32px (36px from `sm`) | 700 | 1.3 |
| H2 section | 24px | 700 | 1.4 |
| H3 subsection | 18 to 20px | 600 | 1.4 |
| Body | 16px | 400 | 1.6 |
| Small (labels, helpers) | 12 to 14px | 400 to 700 | 1.5 |

The scale lives in `tailwind.config.js` (`text-xs` to `text-4xl`), and bare `h1` to `h4` inside `.mb` get these defaults at zero specificity, so a utility class always wins. Large headings use 1.3 rather than 1.4 because a condensed display face looks loose at 1.4 on two or three lines. Body copy stops at 65 to 70ch.

## Shape, spacing and depth

- **Radius:** 8px (small controls), 12px (buttons, inputs, tiles), 16px (cards, dialogs). Pills (`rounded-full`) only for filters, badges and avatars.
- **Spacing:** 4, 8, 12, 16, 24, 32, 48, 64px (Tailwind steps 1, 2, 3, 4, 6, 8, 12, 16). Cards pad 24px (16px on phones for `mb-card-sm`); sections are 24px apart.
- **Depth:** three tinted shadows (`shadow-mb-sm`, `-md`, `-lg`). Cards rest on `sm`, lift to `md` on hover only when they are clickable (`mb-card-interactive`), and dialogs and toasts use `lg`.
- **Borders:** 1px `line` on cards, tiles, badges and chips. Buttons and inputs keep 2px so the boundary stays visible.

## Components

- **Buttons** (`mb-btn`): primary is solid teal with a shadow and 1px lift on hover; secondary (`mb-btn-line`) is outlined; danger (`mb-btn-danger`) is red. Disabled is flat grey with no hover response. 48px minimum height.
- **Cards** (`mb-card`, `Card`): surface, hairline border, `shadow-mb-sm`, 24px padding. `mb-tile` is the quiet inset block inside a card.
- **Inputs** (`mb-field`, `Input`): 12px radius, 2px `field-line` border, a soft 4px focus halo, red border plus an icon and message on error (the message fades in), grey and read-only look when disabled.
- **Badges and chips:** `mb-badge` (+ `-safe`, `-warn`, `-urgent`, `-brand`) are tinted status labels. `mb-chip` is the filter pill; `aria-pressed` or `aria-current="page"` makes it a filled teal pill.
- **Dialogs:** blurred dark scrim (`--mb-scrim`, near-black in dark mode so a dialog never brightens the screen), 16px radius, `shadow-mb-lg`, a 300ms scale-and-fade entrance. Escape and focus trapping are unchanged.
- **Navigation:** active item is a filled teal pill, hover is a light teal wash. The bottom bar (phones and tablets) uses the same pill.
- **Toasts:** slide in from the right in 240ms, slide out in 180ms, with a coloured left edge. Errors stay up longer than successes.
- **Loading:** `mb-skeleton` shimmer blocks for content areas, `Spinner` for buttons and fields.

## Motion

All transitions are 300ms or less: page change 260ms fade and 8px rise, button and chip colour 150ms, card lift 220ms, check-in question 240ms slide. The only long moment is the route line on the landing page. Everything respects `prefers-reduced-motion` (animations and transitions are removed, not shortened).

Entrances and exits are Framer Motion, not CSS keyframes. Every duration, curve and preset lives in `client/src/lib/motion.ts` (`pagePreset`, `fadePreset`, `dialogPreset`, `toastPreset`, `stepVariants`, `staggerParent`/`staggerChild`); use those rather than inline numbers. One `MotionConfig` and one `LazyMotion` wrap the app in `main.tsx` (and the Storybook preview), so components import `m`, not `motion`. Pass presets through `useMotionPreset` so reduced motion renders the final state with no animation. Route changes use `AnimatePresence mode="wait"` in `App.tsx`, so pages don't add their own entrance. Never leave a transform on an ancestor of a `position: fixed` element. The skeleton shimmer is the only animation still in CSS.

## Copy

Plain, specific, non-clinical. Errors say what happened and what to do next. Buttons start with a verb and name the outcome ("Create account", "Save notes"). Results are always described as a screening aid, not a diagnosis. No claim goes on the page that the product or its security rules do not back up.

## Implementation notes

- Tokens live in `client/src/styles/theme.css` as `--mb-*` custom properties under `.mb`, with a dark override. Component classes (`mb-card`, `mb-btn`, ...) are defined in the same file.
- Pages use Tailwind arbitrary values such as `text-[color:var(--mb-ink)]` for colour. Status tints use `--mb-urgent`, `--mb-warn`, `--mb-safe`, `--mb-brand` and their `-bg` pairs; solid fills use `--mb-urgent-solid` so light text stays readable in both themes.
- Public pages use `PublicShell`; signed-in pages use `DashboardLayout`. Both wrap content in `.mb`. `AuthFrame` is the centred 450px sign-in and sign-up frame.
- The scripted migration that moved the original card markup onto `mb-card` is done; new pages should use the component classes rather than rebuilding the card string.
