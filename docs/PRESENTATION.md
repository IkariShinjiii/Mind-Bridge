# Presenting Mind Bridge

A script for a 10 to 12 minute live demo, with a checklist for the morning of, a backup plan, and honest answers to
the questions a panel is likely to ask. Uses the fake accounts from [`DEMO.md`](DEMO.md); no real student data is shown.

## The pitch (30 seconds)

> Students who are struggling often do not walk into the guidance office. Mind Bridge gives them a private,
> one-minute check-in at any hour, tells them in plain words what their answers suggest, shows free crisis support
> straight away, and lets them book a counselor. Counselors see who needs help first, and a high-risk check-in emails
> staff within a minute. The whole thing runs on free tiers.

Say early: **it is a screening aid, not a diagnosis, and it supports counselors, it does not replace them.**

## Morning of

- [ ] Re-run the seed so the dates are fresh: `node scripts/seed-demo.mjs --apply` (see `DEMO.md`).
- [ ] Open the live site once, signed out, to wake it up. Accept the cookie banner so it does not cover anything.
- [ ] Sign in to **three** browser windows now so the demo has no typing: student `maria@…`, counselor
      `villanueva@…`, admin `admin@…` (all `@demo.mindbridge.test`). A normal window plus two profiles or private windows works.
- [ ] Open your own email inbox on a second screen or phone (this is where the live alert lands).
- [ ] Phone: open the site once and use Add to Home Screen, so you can show it installed.
- [ ] Browser zoom 100 to 110 percent, notifications off, projector tested.
- [ ] Open `docs/DEMO.md`'s account table and this script on your own screen, not the projector.

## The demo

### 1. A student checks in (3 min), as Maria

1. **Dashboard.** Point out: welcome message, "Your latest check-in", the trend line ("2 pts lower than last time,
   Improving"), her counselor, her next appointment, and the amber **Call 1553** card. _Say:_ crisis support is on every
   screen and is the only thing that never moves.
2. **Check-in.** Seven questions, about a minute. Mention they are adapted from the PHQ-9 and GAD-7 and that there is
   an optional full 16-question version. Answer quickly with mostly 0s and 1s, then submit.
3. **Result.** Read the plain-language result. Show "What's going well" (it only ever praises answers of 0, never the
   safety question), the **Save or print my summary** button, and the 4-7-8 **breathing reset**. Start the breathing
   for a few seconds.
4. **Crisis resources** from the sidebar: hotlines, the breathing exercise, and the grounding steps.

### 2. A high-risk check-in reaches a counselor (3 min), as Jon, then the counselor

Use this to show the safety net. Pick one of two ways:

- **Safe and instant:** the counselor window already shows **Jon Reyes** at the top of the triage queue with a _Safety
  question flagged_ badge. Skip to step 3.
- **Live proof:** sign in as `jon@…` in a private window, answer the check-in with a 1 or more on question 7,
  submit. **Check your inbox** and read the alert aloud. (It says who and the score, never the answers.) The email goes to your real staff addresses, so this also proves the alert works.

3. **Counselor window.** The queue is sorted by urgency, high risk and safety flags first. Click **Inspect case**:
   the answers, the PHQ-2 / GAD-2 screens, WHO-5 wellbeing, the student's earlier check-ins. Add a note, set the status
   to **Escalated** or **Reviewed**, save.
4. **Chat.** In the case view, open the confidential chat and send a message; show it appears live in the student's
   window (Maria's **Message counselor** button, for a student who has a counselor assigned).

### 3. Booking a session (2 min)

1. As the **counselor**: _My availability_ tab shows open slots; add one to show it takes seconds.
2. As **Bea or Maria**: **Appointments > Book a counselor**, pick a slot. It arrives as **Pending Review**; a student
   can never confirm their own booking (the database rules forbid it).
3. As the **counselor**: **Appointment requests** panel, **Confirm**. Switch back to the student, the status changed live.
4. Click **Add to calendar** on a confirmed session: it downloads a file that opens in Google, Outlook or Apple Calendar.

### 4. The admin and the big picture (2 min), as the admin

- **Analytics** tab: how many check-ins are low, medium and high risk (counts, percentages and a bar chart).
- **Accounts and assignments**: approve the pending counselor _Liza Gomez_, assign Maria to a counselor. Anyone who
  signs up as a counselor has no staff access until an admin approves them.
- Mention **Download my data** in Settings (a student can export everything the app holds about them).

### 5. Phone and polish (1 min)

Show the installed app on your phone: bottom navigation, the always-visible **Crisis 1553** button, dark mode in
Settings. Turn on airplane mode and reload: the app still opens and says it is offline instead of showing an error.

## If something goes wrong

- **Site will not load or sign-in fails:** say it is the venue Wi-Fi, switch to your phone hotspot. The offline notice
  will have told you it is the connection, not the app.
- **Alert email does not arrive in a minute:** do not wait. Say the browser call is the fast path and a scheduled job
  re-checks every 10 minutes as a safety net, show the **Jon Reyes** case already in the queue, and move on.
- **A step needs data that is gone:** re-run `seed-demo.mjs --apply` (takes under a minute) and refresh.
- **Total failure:** keep five screenshots on your desktop (student result, triage queue, case view, booking, admin
  analytics) and the 2-minute screen recording you made during rehearsal.

## Questions the panel may ask

**Is this a diagnosis? How accurate is it?**
No. It is a screening aid built on the published PHQ-9 and GAD-7 items; the quick check-in uses seven adapted items,
so it never reports a depression or anxiety "severity". The optional full check-in uses the standard 16 questions and
their published bands. The 30 percent and 60 percent risk cutoffs are our own and have not been clinically validated,
which is why the guidance office should review them before real use. Details: [`SCORING.md`](SCORING.md).

**What if a student answers the safety question?**
Any answer above zero on the safety item marks the check-in high risk and flagged, regardless of the total. The student
is shown the crisis line immediately and staff get an email. The staff dashboard also re-checks every record and only
ever raises, never lowers, the risk level.

**Who can see a student's answers?**
The student, and approved counselors and admins. This is enforced by Firestore security rules on the server, not just in
the interface. A counselor who has not been approved sees nothing. The alert email contains a name and a score, never the answers.

**How is data protected? What are the known gaps?**
Firebase Auth with email verification for students, role-based Firestore rules (published and tested with an
emulator suite), security headers, no third-party fonts or trackers, and a self-service data export. Honest gaps from
[`SECURITY_AUDIT.md`](SECURITY_AUDIT.md): the rules do not yet require a verified email, staff accounts have no
multi-factor authentication, account deletion and data retention are not built, and the Content-Security-Policy is
in report-only mode. These are the next steps, not unknowns.

**Why no backend server?**
A serverless design is the smallest thing to run and secure for a school project: the browser talks to Firebase, and the
rules are the server-side gate. Two small serverless routes send the alert email. The trade-off is that business rules
live in the client and the rules file; we test the rules with their own suite.

**What does it cost to run?**
Nothing so far. It runs on Vercel's free Hobby plan, Firebase's free plan, GitHub Actions on a public repo, and an
existing email account for sending alerts. Nothing in the project requires a paid plan.

**What happens at scale?**
See [`ARCHITECTURE.md`](ARCHITECTURE.md) section 6. It is sized for a single-campus pilot. The first limits are the
staff dashboard loading whole collections (fixable with pagination and per-student queries) and Firestore's free daily
read quota. Double booking of one slot is blocked by the database rules; a transaction would make it airtight.

**How did you test it?**
Unit tests for scoring, validation and the alert; an emulator suite for the Firestore rules; end-to-end browser tests
for every main flow including accessibility checks; plus a user-evaluation plan in
[`USER_EVALUATION.md`](USER_EVALUATION.md). Run `npm test` and `npx playwright test` in `client/` to show the counts live.

**What would you do next?**
Get the scoring and wording reviewed by the guidance office, add multi-factor authentication for staff, student email
reminders (needs the office's approval of the wording), Hiligaynon and Filipino translations, and a pilot with a small group of students.

## Numbers you can quote

Run these the day before; do not quote old figures.

- `cd client; npx vitest run` for unit tests, `npx playwright test` for end-to-end tests.
- Quick check-in: **7 questions, about a minute**. Full check-in: **16 questions** (PHQ-9 then GAD-7).
- Crisis line shown: **NCMH 1553, free, 24/7**.
