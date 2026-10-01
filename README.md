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
  App.jsx, main.jsx      routes and entry point
  lib/                   Firestore/Auth calls (api.js), Firebase init, risk scoring + tests
  context/               AuthContext (current user and role)
  styles/                index.css (Tailwind base), theme.css (design tokens, see DESIGN.md)
  components/ui/         shared pieces: Modal, Spinner, PublicShell, AuthFrame, CookieConsent
  components/layout/     DashboardLayout (signed-in app shell)
  pages/                 public pages (home, legal, 404) and pages/auth (login, signup)
  features/student/      check-in dashboard and crisis resources
  features/appointments/ appointments list and the booking flow
  features/staff/        admin and counselor dashboard, availability
  features/settings/     user settings
  features/chat/         confidential chat dialog
functions/               Cloud Function for high-risk email alerts (not deployed yet)
firestore.rules          access control
```

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
