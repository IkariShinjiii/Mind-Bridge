# Mind Bridge deployment guide

Covers the Vercel deployment flow, Firebase setup, environment configuration, rollback
procedures and troubleshooting. For the system design see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## 1. What gets deployed where

| Component | Platform | Source | Trigger |
|---|---|---|---|
| Web app (static) | Vercel | `client/` | Git push to `main` |
| Security rules | Firebase | `firestore.rules` | `firebase deploy --only firestore:rules` |
| Alert function (optional) | Firebase Cloud Functions | `functions/` | `firebase deploy --only functions` |
| Auth and database | Firebase | Console configuration | Manual, once |

The three parts deploy independently. The app works without the function. The app does **not**
work safely without the rules, so deploy rules before pointing real users at the app.

## 2. Release flow

```mermaid
flowchart TD
    A[Developer pushes branch / opens PR] --> B[GitHub Actions CI]
    B --> B1[client: npm ci, npm test, npm run build]
    B --> B2[backend: Firestore emulator + rules/api/function tests]
    B1 --> C{All green?}
    B2 --> C
    C -- no --> A
    C -- yes --> D[Merge to main]
    D --> E[Vercel builds client/ and deploys]
    E --> F[Production alias updated]
    D --> G{Changed firestore.rules<br/>or functions/?}
    G -- yes --> H[Manual: firebase deploy --only ...]
    G -- no --> I[Done]
    F --> J[Smoke test]
    H --> J
    J -- fails --> K[Rollback, see section 7]
```

Order matters when a change spans both: **deploy rules first** if the new client needs looser
rules, and **deploy the client first** if you are tightening rules the old client does not violate.
If unsure, deploy rules to the emulator and run `backend-tests` first.

## 3. Firebase setup (one time)

1. **Create a project** at <https://console.firebase.google.com>. Disable Google Analytics unless
   you need it.
2. **Authentication** > Sign-in method: enable **Email/Password** and **Google**.
3. **Authentication** > Settings > **Authorized domains**: add your Vercel production domain and
   any custom domain. `localhost` is present by default.
4. **Firestore Database**: create in production mode, in a region close to your users
   (the region cannot be changed later).
5. **Register a web app** (Project settings > General > Your apps) and copy the config values for
   section 5.
6. **Install and log in to the CLI**, then link the project:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add            # choose your project
   ```
7. **Deploy the rules** (see section 4.2).
8. **Create the first admin.** Sign up in the app, then in the Firestore console open
   `users/<your uid>` and set `role` to `admin`. The rules intentionally block this from the app.
9. **Approve counselors**: once a counselor signs up, an admin approves them in the admin panel
   (sets `approved: true`). Until then they have no staff access.

## 4. Deploying each component

### 4.1 Client on Vercel

First-time setup:

1. Vercel dashboard > **Add New Project** > import the GitHub repository.
2. **Root Directory:** `client`
3. **Framework preset:** Vite. **Build command:** `npm run build`. **Output directory:** `dist`.
4. Add the environment variables from section 5 for **Production** and **Preview**.
5. Deploy.

After that every push to `main` builds and promotes to production, and every pull request gets a
preview URL. `client/vercel.json` rewrites all paths to `/index.html` so deep links such as
`/admin/dashboard` work on refresh.

Verify locally before pushing:

```bash
cd client
npm ci
npm test
npm run build
npm run preview      # inspect the production bundle
```

Preview deployments use the same Firebase project as production unless you give Preview its own
`VITE_FIREBASE_*` values. For a pilot, create a second Firebase project for Preview so test sign-ups
and data never mix with real student data. Add each preview domain to Firebase Authorized domains
(or use one stable staging domain).

### 4.2 Firestore rules

```bash
firebase deploy --only firestore:rules
```

Always run the emulator suite first:

```bash
cd backend-tests && npm test        # needs Java 21
```

Rules take effect within about a minute. Alternatively paste `firestore.rules` into the console
and use the **Rules Playground** to simulate requests before publishing.

### 4.3 Alert function (optional)

Requires the **Blaze** plan. The function is written and tested but **not deployed yet**.

```bash
cd functions && npm install && cd ..
firebase functions:secrets:set SMTP_URL      # smtps://user:pass@smtp.host:465
firebase deploy --only functions
```

Optional parameters, set when prompted during deploy or in `functions/.env.<project-id>`:

| Parameter | Default |
|---|---|
| `SMTP_FROM` | `Mind Bridge <no-reply@mindbridge.app>` |
| `APP_URL` | `https://mind-bridge-omega.vercel.app` |

Set `APP_URL` to your real production URL, otherwise alert emails link to the wrong dashboard. Your
SMTP provider must allow the `SMTP_FROM` address as a sender.

Test it by submitting a check-in that includes the self-harm item (the crisis flag forces a high
result), then watch `firebase functions:log`.

## 5. Environment configuration

| Variable | Where | Required | Description |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | Vercel, `client/.env.local` | Yes | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Vercel, `client/.env.local` | Yes | `<project>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Vercel, `client/.env.local` | Yes | Firebase project ID |
| `SMTP_URL` | Firebase secret | For alerts | SMTP connection string |
| `SMTP_FROM` | Function parameter | No | Sender address |
| `APP_URL` | Function parameter | No | Link base used in alert emails |

Notes:

- Vite inlines `VITE_*` values **at build time**. After changing one in Vercel you must
  **redeploy** (a new build) for it to take effect.
- These Firebase web values are public by design; do not treat them as secrets, and do not put real
  secrets in any `VITE_*` variable. `SMTP_URL` is a real secret and lives only in Firebase.
- Never commit `.env*` files. They are in `.gitignore`.
- CI builds with dummy values (`ci`), which is enough to compile but not to run.

| Environment | Firebase project | Notes |
|---|---|---|
| Local | A dev project, or the Emulator Suite | `client/.env.local` |
| Preview | Staging project (recommended) | Vercel Preview variables |
| Production | Production project | Vercel Production variables |

## 6. Post-deploy smoke test

Run through this after every production deploy (about five minutes):

- [ ] Home page loads over HTTPS with no console errors
- [ ] Refreshing a deep link such as `/login` does not 404
- [ ] Sign up with a test `@usa.edu.ph` account and sign in
- [ ] Student can submit a check-in and sees results
- [ ] Student can see available slots and book one
- [ ] Counselor (approved) can sign in and see the flagged check-in
- [ ] Unapproved counselor sees no staff data
- [ ] (If deployed) a high-risk check-in produces an alert email

## 7. Rollback procedures

Choose the procedure that matches what broke. Rolling back one component does not roll back the
others.

### 7.1 Client (fastest, safe, no data impact)

**Instant rollback in Vercel:** Dashboard > project > **Deployments** > pick the last good
production deployment > **⋯ > Promote to Production** (or **Instant Rollback**). The old build is
served within seconds; nothing is rebuilt.

**Via git** (also fixes `main` so the next push does not reintroduce the bug):

```bash
git revert <bad-commit-sha>
git push origin main
```

Caveat: an old client build must still be compatible with the **current** rules and data. If the
bad release also changed rules or data shape, roll those back too (below) or the old client may hit
permission errors.

### 7.2 Firestore rules

Firebase keeps a history of published rules.

- **Console:** Firestore > **Rules** > **Rules history** (or the clock icon) > select a previous
  version > **Publish**.
- **CLI from git:**
  ```bash
  git checkout <good-sha> -- firestore.rules
  firebase deploy --only firestore:rules
  ```

Never respond to an outage by opening the rules (`allow read, write: if true`). That exposes
student mental-health data. Roll back to the last known-good version instead.

### 7.3 Cloud Function

```bash
git checkout <good-sha> -- functions/
firebase deploy --only functions
```

To stop alerts immediately without a deploy, delete the function:
`firebase functions:delete alertOnHighRisk`. Restoring it is a redeploy. During any period without
alerts, counselors must check the dashboard manually, because high-risk cases will not be emailed.

### 7.4 Data

Rolling back code does not undo bad writes. For data protection:

- Enable **Firestore scheduled backups** (Firestore > Disaster recovery) or point-in-time recovery
  (PITR, 7-day window) on the production project before launch.
- Restore into a **new database** and compare before overwriting production.
- Records are never deleted by the app (the rules deny deletes except for availability slots), so
  most data incidents are bad updates rather than lost documents.

### 7.5 Rollback decision table

| Symptom after deploy | First action |
|---|---|
| Blank page or crash on load | Vercel instant rollback |
| Users get "permission denied" everywhere | Roll back rules (7.2) |
| One role cannot do something it could before | Compare `firestore.rules` diff, then roll back rules or client |
| Alert emails wrong or missing | Check function logs; roll back or delete function (7.3) |
| Wrong or corrupt data | Stop writes if possible, restore from backup (7.4) |

## 8. Troubleshooting

### Build and hosting

| Problem | Likely cause | Fix |
|---|---|---|
| Vercel build fails with "no package.json" | Root Directory not set | Set **Root Directory** to `client` in project settings |
| Page loads but is blank; console says `auth/invalid-api-key` | `VITE_FIREBASE_*` missing or set after the build | Add variables for the right environment, then **redeploy** |
| 404 when refreshing `/login` or `/admin/dashboard` | SPA rewrite missing | Confirm `client/vercel.json` is in the deployed root directory |
| Preview deploy works, production does not (or reverse) | Variables set for only one environment | Set them for Production and Preview |
| Build warns about chunks over 500 kB | Firebase and Recharts vendor chunks | Expected; limit is raised to 700 kB in `vite.config.ts` |
| `npm run build` passes locally, fails in CI | Node version mismatch | Use Node 20 and `npm ci` (not `npm install`) |

### Authentication

| Problem | Likely cause | Fix |
|---|---|---|
| Google sign-in popup fails with `auth/unauthorized-domain` | Domain not authorized | Add it under Authentication > Settings > Authorized domains |
| Google sign-in rejected with "only available for @usa.edu.ph accounts" | By design | Use a school account |
| `auth/operation-not-allowed` | Provider disabled | Enable Email/Password and Google in Authentication > Sign-in method |
| Signed in but immediately sent back to login | Profile document missing or `active: false` | Check `users/<uid>`; reactivate in the admin panel or console |
| Counselor sees an empty dashboard or access errors | Not approved | An admin must approve them (`approved: true`) |
| Cannot become admin from the app | Intentional | Set `role: "admin"` in the Firestore console |

### Firestore

| Problem | Likely cause | Fix |
|---|---|---|
| `permission-denied` on a normal action | Rules not deployed, or an old/new client against mismatched rules | Run `firebase deploy --only firestore:rules`; compare against the rules in git; reproduce in the Rules Playground |
| `permission-denied` for a student updating an appointment | Students may only set `status` to `Cancelled` and touch a few fields | Check the payload against the `appointments` rule |
| `The query requires an index` | New multi-field query or `orderBy` | Click the link in the error to create it, then add it to `firestore.indexes.json` |
| Staff dashboards slow with lots of data | Whole collections are fetched client-side | See scaling notes in `ARCHITECTURE.md` (pagination) |
| Chat messages do not appear live | Listener error (often rules) | Check the console for "onSnapshot message error" and the `messages` rule |
| Two students booked the same slot | No transaction on booking | Known limitation; see scaling notes |

### Alert function

| Problem | Likely cause | Fix |
|---|---|---|
| Function never fires | Not deployed, or project not on Blaze | `firebase deploy --only functions`; upgrade the plan |
| Deploy fails on secret | `SMTP_URL` not set | `firebase functions:secrets:set SMTP_URL` |
| Log: "no staff emails found" | No active, approved counselors or admins with an `email` field | Approve staff and check `users` documents |
| `Invalid login` / `ECONNREFUSED` in logs | Wrong SMTP credentials or port | Re-set the secret and redeploy |
| Emails land in spam or are rejected | Sender not allowed by provider | Set `SMTP_FROM` to a verified sender; configure SPF/DKIM |
| Email links to the wrong site | `APP_URL` default in use | Set `APP_URL` and redeploy the function |
| Assessment is high risk but no email | Function only alerts on a crisis item or total at least 60% of max | Confirm the assessment values; see `assess()` in `functions/index.js` |

### Tests and CI

| Problem | Likely cause | Fix |
|---|---|---|
| `backend-tests` fail to start the emulator | Java missing or older than 21 | Install Java 21 (Temurin) |
| Emulator port already in use | A previous emulator is still running | Stop the old process or `firebase emulators:exec` again after it exits |
| Playwright cannot find a browser | Browsers not installed | `npx playwright install chromium` |
| E2E tests talk to real Firebase | Server was not started in e2e mode | Use `npm run test:e2e` (it starts `vite --mode e2e`) |
| `npm test` picks up Playwright specs | Config changed | `vite.config.ts` must keep `test.exclude: ["e2e/**"]` |

### Diagnostic checklist

When something is wrong and the cause is unclear, work down this list:

1. Browser console and Network tab: the Firebase error code (`permission-denied`,
   `auth/...`, `failed-precondition`) names the layer.
2. Vercel > Deployments: which commit is live, and did the build succeed?
3. Vercel > Settings > Environment Variables: set for the right environment, and redeployed since?
4. Firebase > Firestore > Rules: is the published version the one in git?
5. Firebase > Authentication: does the user exist, and is the domain authorized?
6. `firebase functions:log` for function problems.
7. Reproduce locally with the emulator before changing production.
