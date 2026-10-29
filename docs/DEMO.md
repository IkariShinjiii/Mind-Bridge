# Demo data for presentations

`client/scripts/seed-demo.mjs` fills the live Firebase project with **fake** students, staff, check-ins, open slots,
appointments and chat messages, so every dashboard has something to show. It is free (Firebase Auth and Firestore on the
free plan) and needs nothing from the guidance office.

Every demo account uses the reserved `@demo.mindbridge.test` domain and every document id starts with `demo-`, so it is
easy to spot and to remove. The high-risk alert never emails demo accounts.

## Run it

You need the Firebase service account JSON (the same one used for the `FIREBASE_SERVICE_ACCOUNT` Vercel variable).
Keep it out of git. From `client/`:

```powershell
# PowerShell. 1) Look first: this writes nothing.
node scripts/seed-demo.mjs

# 2) Write it. DEMO_PASSWORD becomes the password of every demo account (12+ characters, not stored anywhere).
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
$env:DEMO_PASSWORD = "choose-a-long-password"
node scripts/seed-demo.mjs --apply

# 3) After the presentation, delete all of it again.
node scripts/seed-demo.mjs --remove
```

`--apply` replaces earlier demo data, so **run it again the morning of the presentation** to refresh the dates (open
slots are always in the next two weeks and the "latest" check-ins are always recent).

## Accounts

All use the password you set in `DEMO_PASSWORD`.

| Role                             | Email                             | What it shows                                                                                      |
| -------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Student (main demo)              | `maria@demo.mindbridge.test`      | 8 weeks of improving check-ins, WHO-5 trend, goals, a confirmed session, a chat with her counselor |
| Student (high risk)              | `jon@demo.mindbridge.test`        | A fresh high-risk check-in with the safety question flagged, waiting in the triage queue           |
| Student (escalated, followed up) | `angela@demo.mindbridge.test`     | An escalated case with counselor notes and a completed session                                     |
| Student (full check-in)          | `paolo@demo.mindbridge.test`      | The 16-question PHQ-9 + GAD-7 check-in, moderate result                                            |
| Student (getting worse)          | `bea@demo.mindbridge.test`        | A rising trend and a pending appointment request                                                   |
| Student (steady)                 | `carlo@demo.mindbridge.test`      | Low risk and a cancelled appointment                                                               |
| Counselor                        | `villanueva@demo.mindbridge.test` | The staff dashboard: triage, schedule, analytics                                                   |
| Counselor awaiting approval      | `gomez@demo.mindbridge.test`      | Shows in the admin's approval list                                                                 |
| Admin                            | `admin@demo.mindbridge.test`      | Everything, including account approval and assignments                                             |

## Things to know

- Demo records are real documents in your real project, so they also show up on the real staff dashboard until you
  `--remove` them.
- Submitting a new high-risk check-in as a demo student _does_ send the real alert email to your real staff accounts.
  That is the live proof that alerts work, so use your own inbox as the staff address.
- The script only writes through the Firebase Admin SDK from your machine. Nothing here runs in the deployed app.
