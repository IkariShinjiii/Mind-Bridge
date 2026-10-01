# Mind Bridge

A student wellness platform for the University of San Agustin. Students complete a private
screening check-in, the app flags risk, and counselors review flagged cases and manage
appointments.

> Live app: <https://mind-bridge-omega.vercel.app>

## Table of contents

1. [Overview](#overview)
2. [Tech stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Environment setup](#environment-setup)
6. [Running locally](#running-locally)
7. [Testing](#testing)
8. [Project structure](#project-structure)
9. [Roles and access control](#roles-and-access-control)
10. [Contributing](#contributing)
11. [Deployment](#deployment)
12. [Documentation](#documentation)
13. [Notes and limitations](#notes-and-limitations)

## Overview

Mind Bridge shortens the path between a student in distress and campus psychological support.

| User | What they do |
|---|---|
| **Student** | Takes a wellness check-in (mood, stress, sleep, focus, safety), sees guidance for their risk level, books counselor appointments, uses a confidential chat, and can open the 24/7 crisis resource directory. |
| **Counselor** | Reviews flagged check-ins, manages availability, and handles appointments. Has no staff access until an admin approves the account. |
| **Admin** | Approves counselors, manages users, and sees aggregate wellness metrics. |

Key features:

- Rule-based risk scoring (low / moderate / high). A self-harm item forces an immediate-review flag.
- Role-based access (student, counselor, admin) enforced by Firestore security rules.
- Appointment booking and counselor availability management.
- Confidential student-counselor chat.
- Email alert to staff when a high-risk assessment is submitted (Cloud Function, optional).
- Accessibility target of WCAG 2.2 AA, with keyboard-safe dialogs and 44px tap targets.

Product and design intent live in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 7, Tailwind CSS 3, Framer Motion, Recharts, Lucide icons |
| Auth and data | Firebase Authentication (email/password and Google) and Cloud Firestore, called directly from the browser |
| Access control | `firestore.rules` (the only server-side gate for student data) |
| Alerts | Firebase Cloud Functions (Node 20, `firebase-functions` v6, `firebase-admin`, Nodemailer) |
| Unit tests | Vitest |
| End-to-end tests | Playwright (Firebase SDK replaced by in-memory fakes) |
| Backend tests | Vitest with the Firebase Emulator Suite (`@firebase/rules-unit-testing`) |
| UI documentation | Storybook 10 with the a11y addon |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Hosting | Vercel (client), Firebase (rules and functions) |

There is no REST server. The browser talks straight to Firebase; see
[`docs/API.md`](docs/API.md) for how operations map onto the usual endpoint and status-code model.

## Prerequisites

- **Node.js 20** and npm (CI and Cloud Functions both use Node 20)
- A **Firebase project** with Authentication (Email/Password and Google providers enabled) and
  Cloud Firestore
- For backend tests only: **Java 21** (required by the Firestore emulator)
- For deploying rules or functions only: the Firebase CLI (`npm install -g firebase-tools`)

## Installation

```bash
git clone <repository-url>
cd "Mind Bridge2"

# Frontend
cd client
npm install
```

Optional, depending on what you want to run:

```bash
# Backend rules/function tests
cd backend-tests && npm install

# Cloud Function (only needed to deploy it)
cd functions && npm install
```

## Environment setup

The client reads its Firebase web config from Vite environment variables. Create
`client/.env.local` (git-ignored, never commit it):

```
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

Find these values in the Firebase console under **Project settings > General > Your apps > Web app**.

Then set up the Firebase project once:

1. Enable **Authentication** with the Email/Password and Google providers.
2. Create a **Cloud Firestore** database.
3. Publish the security rules from `firestore.rules` (see [Deployment](#deployment)).
4. Sign up through the app, then promote your account to admin by setting `role: "admin"` on your
   document in the `users` collection (Firebase console). This is deliberately not possible from the app.

Cloud Function settings (only if you deploy the alert function):

| Name | Kind | Purpose |
|---|---|---|
| `SMTP_URL` | Secret (required) | SMTP connection string, e.g. `smtps://user:pass@smtp.host:465` |
| `SMTP_FROM` | Parameter (optional) | Sender address; must be allowed by your mail provider |
| `APP_URL` | Parameter (optional) | Dashboard link included in the email |

## Running locally

```bash
cd client
npm run dev          # http://localhost:5173
```

Other scripts (all run from `client/`):

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `client/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run storybook` | Component explorer at <http://localhost:6006> |
| `npm run build-storybook` | Static Storybook build |

## Testing

| Suite | Command | Notes |
|---|---|---|
| Unit tests | `cd client && npm test` | Scoring, validation, errors, dates, api, avatar |
| End-to-end | `cd client && npx playwright install chromium && npm run test:e2e` | Runs the app with `vite --mode e2e`, which swaps Firebase for in-memory fakes. Never touches the real project. Use `npm run test:e2e:ui` for the interactive runner. |
| Backend (rules, API, function) | `cd backend-tests && npm test` | Starts the Firestore emulator (needs Java 21) and tests `firestore.rules`, the Firestore operations and the alert function |

CI runs the unit tests and production build for the client, and the backend suite, on every push
to `main` and every pull request.

## Project structure

```
.
├── client/                     React single-page app
│   ├── src/
│   │   ├── App.jsx, main.jsx   Routes (lazy-loaded) and entry point, wrapped in an ErrorBoundary
│   │   ├── lib/                api.js (all Firestore/Auth calls), firebase.js (init),
│   │   │                       scoring.js (risk rules), validation.js (form rules),
│   │   │                       errors.js (Firebase error -> plain sentence), dates.js,
│   │   │                       avatar.js, useFocusTrap.js; *.test.js beside each
│   │   ├── context/            AuthContext (current user and role)
│   │   ├── styles/             index.css (Tailwind base), theme.css (design tokens)
│   │   ├── components/ui/      Shared pieces (Button, Card, Input, Modal, Spinner, ...) with Storybook stories
│   │   ├── components/layout/  DashboardLayout (signed-in shell: nav, account menu, skip link)
│   │   ├── pages/              Public pages (home, legal, 404) and pages/auth (login, signup)
│   │   └── features/
│   │       ├── student/        Check-in dashboard and crisis resources
│   │       ├── appointments/   Appointment list and booking flow
│   │       ├── staff/          Admin and counselor dashboard, availability, CSV export helpers
│   │       ├── settings/       User settings
│   │       └── chat/           Confidential chat dialog
│   ├── e2e/                    Playwright specs and Firebase fakes
│   ├── vercel.json             SPA rewrite for Vercel
│   └── vite.config.js          Build config and vendor chunk splitting
├── functions/                  Cloud Function: emails staff on high-risk assessments
├── backend-tests/              Emulator-based tests for rules, API operations and the function
├── docs/API.md                 Backend operations, roles and expected outcomes
├── firestore.rules             Firestore security rules
├── firebase.json               Firebase CLI config (rules and functions)
├── .github/workflows/ci.yml    Continuous integration
├── PRODUCT.md                  Users, purpose and constraints
└── DESIGN.md                   Design tokens and visual language
```

Firestore collections used: `users`, `assessments`, `appointments`, `availability`, `messages`.

## Roles and access control

- **student**: created by self-signup with an `@usa.edu.ph` account (email/password or Google).
- **counselor**: has no staff access until `approved: true` is set on their user document.
- **admin**: set `role: "admin"` on the user document by hand in the Firebase console.
- **deactivated** (`active: false`): treated as signed out.

Users cannot change their own role, approval or active flag; the rules enforce this. Because the
rules are the only protection for student data, test any change to `firestore.rules` with
`cd backend-tests && npm test` and the Rules Playground before publishing.

## Contributing

1. Branch from `main` (`git checkout -b feature/short-description`).
2. Make focused changes. Add or update tests beside the code you touch.
3. Before opening a pull request, run:
   ```bash
   cd client && npm test && npm run build
   cd ../backend-tests && npm test      # if you changed rules, api.js or functions
   ```
4. Use short, imperative commit messages that explain *why* (for example,
   `Cut initial JS from 910 kB to 82 kB by splitting vendors`).
5. Open a pull request against `main`. CI must pass.

Code conventions:

- **Cards:** every page uses the same card (`rounded-md border-2 border-[color:var(--mb-line)]
  bg-[color:var(--mb-surface)] p-5 sm:p-6`) with a `PanelHead`. Buttons are `mb-btn mb-btn-solid` /
  `mb-btn-line`, inputs are `mb-field`. Design tokens are in `styles/theme.css`.
- **Forms:** use `noValidate` and the rules in `lib/validation.js`. Errors appear next to the field
  (`role="alert"`, linked with `aria-describedby`) and focus moves to the first invalid field.
  Buttons that start async work disable themselves and show a `Spinner`.
- **Errors:** never show raw Firebase text. Pass errors through `friendlyError()` from
  `lib/errors.js`. Failed loads show a message with a retry button, not an empty list.
- **Accessibility:** target WCAG 2.2 AA. Text contrast is at least 4.5:1, input borders at least
  3:1, tap targets 44px. Dialogs use `Modal` or `useFocusTrap`.
- **Dates:** use `formatDateTime` / `toLocalInputValue` from `lib/dates.js`. Do not build
  `datetime-local` values with `toISOString()` (that is UTC and shifts the hour).
- **Secrets:** never commit `.env*` files or credentials. They are already git-ignored.

## Deployment

### Client (Vercel)

1. Import the repository in Vercel and set the **Root Directory** to `client`.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist`.
3. Add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` and `VITE_FIREBASE_PROJECT_ID` as
   environment variables.
4. In Firebase **Authentication > Settings > Authorized domains**, add your Vercel domain so
   sign-in works.

`client/vercel.json` rewrites all routes to `index.html` so client-side routing works. Pushes to
`main` deploy automatically once the project is connected.

### Firestore rules

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

Alternatively, paste `firestore.rules` into the Firebase console.

### Alert function (optional, requires the Firebase Blaze plan)

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set SMTP_URL    # e.g. smtps://user:pass@smtp.host:465
firebase deploy --only functions
```

The function `alertOnHighRisk` fires when a document is created in `assessments`, recomputes risk
on the server rather than trusting the client, and emails staff when the result is high. It is
written and tested but **not deployed yet**.

## Documentation

- [`docs/IPOO.md`](docs/IPOO.md): IPOO framework mapping, risk-scoring algorithm, security measures, objectives to code
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): system diagram, data model, security model, scaling
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Vercel and Firebase deployment, rollback, troubleshooting
- [`docs/API.md`](docs/API.md): backend operations, roles and expected outcomes
- [`PRODUCT.md`](PRODUCT.md): product purpose, users and constraints
- [`DESIGN.md`](DESIGN.md): design system and tokens
- Storybook (`npm run storybook` in `client/`): UI components and design foundations

## Notes and limitations

- Risk levels are rule-based. Have a counselor or psychologist validate the scoring before relying
  on it clinically. Mind Bridge supports campus counseling; it does not replace it or emergency services.
- The initial JS payload is about 82 kB. Firebase and charts are split into separate cached chunks
  and route pages load on demand.
- The earlier Express/JSON-file server was removed; it is in git history before commit `61bb4bd`.
