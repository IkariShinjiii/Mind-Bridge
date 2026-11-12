# MindBridge test plan

Last updated 2026-11-13. Everything below runs locally for free; nothing touches the real Firebase project, Vercel, or
email.

## 1. Scope

In scope: the React client (`client/src`), the two Vercel alert routes (`client/api`), the Firestore rules and Cloud
Function (`backend-tests`, `functions`), the demo seed data (`client/scripts/demo-data.mjs`), accessibility (WCAG 2.1
AA) and colour contrast.

Out of scope: load testing, real email delivery, real Firebase Auth emails, penetration testing (see
`docs/SECURITY_AUDIT.md`).

Safety rules for testers: never submit a high-risk check-in on the live site (it emails staff), never run
`seed-demo.mjs` against production, never commit service-account files or passwords. E2E runs use in-memory Firebase
fakes (`client/e2e/fakes`), so they are safe by construction.

## 2. Roles

| Role | How it is stored | What they can do |
|---|---|---|
| Student | `users/{uid}.role = "student"`, `@usa.edu.ph` email | Check-in (quick or full), WHO-5, book and cancel appointments, resources, settings, data download |
| Counselor | `role = "counselor"`, needs `approved: true` | Case dashboard, notes, follow-up dates, availability, confirm/reschedule/decline/complete appointments |
| Admin | `role = "admin"` | Same app role as counselor (`normalizeRole` maps counselor to admin), plus account approval and export |
| Visitor | no session | Home, login, signup, legal pages only |

## 3. Features, coverage and gaps

Legend: U = vitest unit, E = Playwright e2e, R = rules/backend tests (`backend-tests`), M = manual only.

| Area | Covered by | Gaps / notes |
|---|---|---|
| Sign-up validation (`@usa.edu.ph`, password length, consent) | U `validation*.test`, `schemas.test`; E `auth.spec` | Real verification email link is manual (M) |
| Login, logout, deactivated account, unapproved counselor | E `auth.spec`, `account-status.spec`, `account-menu.spec` | Real Firebase Auth errors (M) |
| Route guards and redirects | E `auth.spec`, `counselor.spec`, `routing.spec` (new) | none known |
| Quick check-in scoring and risk (low 0-6, medium 7-12, high 13+ or Q7 above 0) | U `scoring*.test`, `risk.test`, `riskInvariants.test` (new, seeded random sweep); E `assessment.spec`, `risk-check.spec` | |
| PHQ-9 / GAD-7 full check-in and bands | U `clinical.test`, `riskInvariants.test`; E `assessment.spec`, `results.spec` | |
| WHO-5 | U `clinical.test`, `riskInvariants.test`; E `wellbeing.spec` | |
| Tamper resistance (stored risk lowered) | U `risk.test`, `riskInvariants.test`; R rules tests | |
| Crisis resources | E `crisis-resources.spec`, `small-screens.spec` | Hotline numbers must be re-verified by a human before the defense (M) |
| Appointment lifecycle | U `appointmentLifecycle.test`, `booking.test`; E `appointment-lifecycle.spec`, `calendar.spec` | Concurrent double-booking of one slot needs the emulator (R) |
| Counselor case dashboard, notes, follow-up | U `followUp.test`, `summary.test`, `trend.test`; E `counselor.spec`, `follow-up.spec`, `trend.spec` | |
| Availability windows | U `validation.test`; E `counselor.spec` | A window of two months is accepted; needs a product decision |
| Settings, theme, data download | E `appearance.spec`, `data-download.spec`; U `dataExport.test` | |
| Accessibility (axe WCAG 2.1 AA, light and dark) | E `accessibility.spec`, `site-audit.spec`, `small-screens.spec`; `scripts/check-contrast.mjs` | Screen-reader pass is manual (M) |
| Offline, load errors, toasts | E `offline.spec`, `load-errors.spec`, `toasts.spec` | |
| Alert routes | U `api/_alertHandler.test`, `_alertCore.test` | Real SMTP send is manual, only after the owner configures it |
| Firestore rules | R `backend-tests/rules` | Needs Java and the emulator; Node 22+ for firebase-admin 14 |
| Cloud Function alert | R `backend-tests/functions` | |

## 4. How to run each suite

Commands run from `client/` unless stated. CI uses Node 20; the dev machine has Node 24.

| Suite | Command |
|---|---|
| Everything fast (typecheck, unit, contrast, build) with a PASS/FAIL summary | `npm run test:all` |
| Same plus Playwright | `npm run test:all:e2e` |
| Skip the build | `npm run test:all -- --fast` |
| Typecheck | `npm run typecheck` |
| Unit | `npm test` (one file: `npx vitest run src/utils/risk.test.ts`) |
| Contrast | `npm run test:contrast` |
| Build | `npm run build` (needs `VITE_FIREBASE_*` env vars; dummies are fine) |
| E2E | `npx playwright test` (one spec: `npx playwright test e2e/routing.spec.ts`; UI mode: `npm run test:e2e:ui`); starts its own dev server on port 5174 |
| Rules and functions | `cd backend-tests && npm test` (emulator and Java) |
| Formatting | `npm run format:check` (about 30 files already differ on main; not part of `test:all`) |

There is no ESLint in the project; strict TypeScript is the static check.

Test data helpers: `client/src/test/factories.ts` (`makeAssessment`, `seededRandom`) for unit tests and
`client/e2e/helpers.ts` (`seed`, `logIn`, `completeCheckIn`, `readCollection`) for e2e. No app code imports either, so
neither can reach production.

## 5. Manual checklist for the defense demo

Use the demo accounts from `docs/DEMO.md`. Do any high-risk step only on a demo project with alerts off.

Before the room:
- [ ] Production site loads on the presentation laptop and on a phone in under 3 seconds.
- [ ] Demo data seeded in the demo project (owner action); student and counselor accounts log in.
- [ ] Browser zoom 100 percent, light theme, no extension banners.
- [ ] Hotspot ready as a Wi-Fi fallback.

Student flow:
- [ ] Sign-up rejects a non-`@usa.edu.ph` email and a 7-character password with a clear message.
- [ ] Log in lands on the student dashboard; typing `/admin/dashboard` bounces back.
- [ ] Quick check-in: seven questions, cannot skip, low result shows calm copy, crisis line visible.
- [ ] Full check-in: PHQ-9 then GAD-7, bands shown.
- [ ] WHO-5 below 50 shows the gentle message.
- [ ] Book an appointment (pending); cancel one.
- [ ] Settings: dark theme, download my data, profile save toast.
- [ ] Resources page: hotline numbers readable.

Counselor flow:
- [ ] Unapproved counselor sees the waiting screen; approved one sees the dashboard.
- [ ] Case list shows high risk first; open a case, add a note, set a follow-up date.
- [ ] Confirm, reschedule, decline and complete an appointment; the student sees each change.
- [ ] Add and remove an availability window; booking respects it.

Accessibility and resilience:
- [ ] Keyboard only: tab through login, check-in and dashboard; focus ring always visible; skip link works.
- [ ] 200 percent zoom and a 375px window: no horizontal scroll.
- [ ] Network off mid-session: friendly offline message, no blank screen.
- [ ] `npm run test:all:e2e` is green on the demo laptop.
