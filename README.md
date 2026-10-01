# Mind Bridge

Student wellness platform for University of San Agustin: students take a
screening check-in, the app flags risk, and counselors review cases and
manage appointments.

## Stack

- **Client:** React + Vite + Tailwind (`client/`), deployed on Vercel
- **Auth + data:** Firebase Authentication and Cloud Firestore (accessed
  directly from the browser)
- **Access control:** `firestore.rules` (this is the only thing protecting
  student data, so test changes in the Rules Playground before publishing)
- **Alerts:** `functions/` holds a Cloud Function that emails staff when a
  new assessment is high risk

## Project layout

```
client/src/
  App.jsx, main.jsx      routes (lazy-loaded) and entry point, wrapped in an ErrorBoundary
  lib/                   api.js (all Firestore/Auth calls), firebase.js (init),
                         scoring.js (risk rules), validation.js (form rules),
                         errors.js (Firebase error -> plain sentence), dates.js (date formatting),
                         avatar.js, useFocusTrap.js (dialog keyboard handling); *.test.js beside each
  context/               AuthContext (current user and role)
  styles/                index.css (Tailwind base), theme.css (design tokens, see DESIGN.md)
  components/ui/         shared pieces: Modal, PanelHead, Spinner, PageLoader, ErrorBoundary,
                         PublicShell, AuthFrame (Field), CookieConsent
  components/layout/     DashboardLayout (signed-in app shell: nav, account menu, skip link)
  pages/                 public pages (home, legal, 404) and pages/auth (login, signup)
  features/student/      check-in dashboard and crisis resources
  features/appointments/ appointments list and the booking flow
  features/staff/        admin and counselor dashboard, availability, CSV export helpers
  features/settings/     user settings
  features/chat/         confidential chat dialog
functions/               Cloud Function for high-risk email alerts (not deployed yet)
firestore.rules          access control
```

## Conventions

- **Cards:** every page uses the same card: `rounded-md border-2 border-[color:var(--mb-line)]
  bg-[color:var(--mb-surface)] p-5 sm:p-6`, with a `PanelHead` (title + one line, underlined with a 2px
  rule). Page headers are `text-3xl sm:text-4xl` with a Back button on sub-pages. Buttons are
  `mb-btn mb-btn-solid` / `mb-btn-line`, inputs are `mb-field`.
- **Forms:** forms use `noValidate` and the rules in `lib/validation.js`. Errors appear next to the
  field (`role="alert"`, linked with `aria-describedby`) and focus moves to the first invalid field.
  Buttons that start async work disable themselves and show a `Spinner` with an "-ing" label.
- **Errors:** never show raw Firebase text. Pass the error through `friendlyError()` from `lib/errors.js`.
  Failed loads show a message with a retry button instead of an empty list.
- **Accessibility:** target is WCAG 2.2 AA. Text colours in `theme.css` are all at least 4.5:1;
  input borders use `--mb-field-line` (3:1+). Tap targets are 44px. Dialogs use `Modal` or
  `useFocusTrap` so focus is trapped and returned to the opener.
- **Dates:** use `formatDateTime` / `toLocalInputValue` from `lib/dates.js`. Do not build
  `datetime-local` values with `toISOString()` (that is UTC and shifts the hour).

## Roles

- `student`: created by self-signup (`@usa.edu.ph` accounts, email/password or Google)
- `counselor`: has no staff access until `approved: true` is set on their user document
- `admin`: set `role: "admin"` on the user document by hand in the Firebase console

Users cannot change their own role, approval or active flag (enforced by the rules).

## Run locally

```bash
cd client
npm install
npm run dev     # http://localhost:5173
```

Create `client/.env.local` (not committed) with your Firebase web config:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

## Test and build

```bash
cd client
npm test          # vitest: scoring, validation, errors, dates
npm run build     # production build into client/dist
```

Bundle note: the main chunk (about 900 KB, 245 KB gzipped) is mostly the Firebase SDK, which every
page needs for sign-in. Route pages, charts and the animation library load on demand.

## Deploy

- Client: pushes to the connected Vercel project.
- Rules: paste `firestore.rules` in the console, or `firebase deploy --only firestore:rules`.
- Alert function (needs the Firebase Blaze plan):

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set SMTP_URL   # e.g. smtps://user:pass@smtp.host:465
firebase deploy --only functions
```

Optional parameters: `SMTP_FROM` (sender address, must be allowed by your
mail provider) and `APP_URL` (dashboard link in the email).

## Notes

- Risk levels are rule-based and use a self-harm item that forces an
  immediate-review flag. Have a counselor or psychologist validate the scoring
  before relying on it clinically.
- The earlier Express/JSON-file server was removed; it is in git history before
  commit `61bb4bd` if you need it.
