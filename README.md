# Student Wellness — Mind Bridge

A working implementation of the Mind Bridge user flow: login → wellness
survey → AI risk assessment → result & guidance → book appointment (student
side), and login → counselor dashboard → review case → manage availability
(counselor side), converging at appointment confirmed.

Storage is a JSON file for now — swap it for a real database later, the
rest of the app won't need to change much.

## Project structure

```
student-wellness/
  server/        Express API + auth + risk scoring + JSON file storage
    index.js
    auth.js      <- password hashing, JWT issuing/verifying, role middleware
    scoring.js   <- the "AI" flagging logic lives here
    data.json    <- acts as your database for now (users, responses, availability, appointments)
  client/        React (Vite) + Tailwind frontend
    src/
      App.jsx           <- routes by role once logged in
      AuthContext.jsx    <- holds the logged-in user + token
      components/
        Login.jsx              <- login / sign-up (student or counselor)
        SurveyForm.jsx         <- wellness check-in
        CounselorDashboard.jsx <- flagged cases
        AppointmentScheduler.jsx <- student books a slot
        ManageAvailability.jsx   <- counselor sets open slots
```

## How login works

Real accounts, not a demo toggle: passwords are hashed with bcrypt before
being stored, and a signed JWT (JSON Web Token) is issued on login/signup.
The frontend stores that token and sends it on every request; the backend
checks it on every protected route and rejects the request if it's missing,
invalid, or the wrong role (`requireAuth` / `requireRole` in `server/auth.js`).

For a real deployment, set a proper `JWT_SECRET` environment variable
instead of relying on the fallback in `auth.js`.

## Running it locally

Open two terminals in VSCode.

**Terminal 1 — backend:**
```bash
cd server
npm install
npm run dev
```
Runs on http://localhost:4000

**First-time only — create an admin account** (in the same server terminal,
or a third one, while the server is running):
```bash
npm run create-admin
```
This asks for a name, email, and password, and creates the one account type
that can't sign up through the app itself (see "Why admin accounts are
separate" below).

**Terminal 2 — frontend:**
```bash
cd client
npm install
npm run dev
```
Runs on http://localhost:5173 — open this in your browser.

The Vite dev server proxies `/api` requests to the backend, so you don't need
to configure CORS URLs manually.

## What's new: real login, email verification, password reset, admin approval

**No real email service is connected.** There's no SMTP/SendGrid/etc.
configured, so "sending" an email just logs it to the server console —
and, only in local development, hands the link straight back to the
frontend so you can click through and actually test the flow. Look at
`server/mailer.js` for exactly where to plug in a real provider later;
nothing else needs to change.

- **Login/signup**: passwords are hashed with bcrypt, sessions use a signed
  JWT (`server/auth.js`). Set a real `JWT_SECRET` environment variable in
  production instead of the dev fallback.
- **Email verification**: new accounts start unverified. The verification
  link is a plain backend route (`GET /api/auth/verify-email`) so it works
  without any frontend routing — clicking it just shows a small HTML
  confirmation page. Until verified, a student can't submit a check-in and a
  counselor can't view the dashboard (`requireVerified` in `server/auth.js`).
- **Password reset**: `POST /api/auth/forgot-password` always returns the
  same generic message whether or not the email exists, so the endpoint
  can't be used to check who has an account — standard practice. The actual
  reset token only appears in the response in dev mode.
- **Session expiry warnings**: tokens last 7 days. Inside the last 24 hours,
  a banner appears with a "Stay logged in" button (`POST /api/auth/refresh`).
  If a token actually expires mid-session, the next API call fails with 401,
  which logs the user out with a clear message instead of a silent, unclear
  redirect.
- **Admin role**: manages counselor accounts specifically, since an approved
  counselor account can see confidential student check-ins. New counselor
  signups start with `approved: false` and see a "waiting on approval"
  screen until an admin approves them from the admin panel. Admins can also
  deactivate an account entirely.

### Why admin accounts are separate

There's no "sign up as admin" option in the app, on purpose — letting anyone
self-register as an admin would defeat the point of gating counselor access
in an app that handles confidential student data. `server/seed-admin.js`
creates the first (and any later) admin account by writing directly to the
data file, run once from a trusted terminal rather than exposed as a
public API endpoint.

## How the pieces connect (follows the flow chart)

1. `Login.jsx` calls `POST /api/auth/register` or `POST /api/auth/login`.
   A successful call returns a token + user, stored via `AuthContext`.
2. `App.jsx` reads the logged-in user's role and shows the student tabs
   (Check-in, Book Appointment) or counselor tabs (Dashboard, Manage
   Availability) accordingly.
3. `SurveyForm.jsx` fetches questions from `GET /api/survey` and posts
   answers to `POST /api/responses`, authenticated as the logged-in student.
4. `server/scoring.js` scores the answers and assigns a risk level
   (low / medium / high). One question (`q9`) is a high-priority screening
   item — any non-zero answer forces an immediate-review flag, regardless of
   total score.
5. `CounselorDashboard.jsx` reads `GET /api/responses` (counselor-only) and
   lets a counselor mark cases reviewed.
6. `ManageAvailability.jsx` lets a counselor add/remove open time slots
   (`POST` / `DELETE /api/availability`).
7. `AppointmentScheduler.jsx` reads open slots from `GET /api/availability`
   and books one via `POST /api/appointments`, tied to the logged-in student.

## Where to go next

- **Swap the JSON file for a real database.** Supabase (Postgres) or a
  hosted Postgres instance on Render both work well here — the `data.json`
  read/write functions in `index.js` are the only place that needs to change.
- **Improve the scoring model.** The current version is a transparent,
  rule-based scorer modeled loosely on validated screening instruments
  (PHQ-9/GAD-7 style). If you want to bring in an LLM for nuance later, it
  only needs to plug into `scoring.js` — nothing else changes.
- **Talk to an actual counselor or psych professional** before treating any
  score as clinically meaningful — this scaffold gives you a working system
  to demo, not a validated diagnostic tool.

Anything beyond what's listed here (password reset, email verification,
session expiry warnings, an admin role, etc.) hasn't been added — ask if you
want any of those built in next.
