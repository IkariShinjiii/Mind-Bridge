# Mind Bridge: User Evaluation Plan and Testing Report

| | |
|---|---|
| **System** | Mind Bridge, confidential student wellness check-in and counseling platform |
| **Document date** | 2026-10-02 |
| **Build evaluated** | `main`, commit `283b92a` |
| **Evaluation type** | Moderated, task-based usability test with follow-up interviews |
| **Participants** | 5 to 8 students, 2 to 3 counselors |

> **Document status.** Sections 1 to 9 are the finished evaluation plan, ready to run. **No
> participant sessions have been held yet**, so this document contains **no participant data and
> no user-derived findings**. Section 10 reports the evidence that does exist today (automated test
> results and an expert review of the code), clearly labelled as such. Section 11 is the results
> template, with the formulas and decision rules, to fill in after the sessions. Do not present
> Section 10 as user testing results.

---

## 1. Purpose and objectives

Mind Bridge aims to reduce friction in seeking mental-health help and to stop crises slipping through
unnoticed (`PRODUCT.md`). This evaluation checks whether real students and counselors can use it to do
that, and whether they trust it.

Four system objectives are tested. They follow the product definition; **rename them to match the
exact objective wording in the capstone paper** if it differs.

| ID | Objective | Primary user | Question the evaluation answers |
|---|---|---|---|
| **O1** | Wellness check-in | Student | Can students complete the 7-question check-in quickly, understand the questions and feel safe doing it? |
| **O2** | Risk scoring and guidance | Student, counselor | Does the low / medium / high result make sense to students, lead them to the right next step, and agree with counselors' clinical judgment? |
| **O3** | Counselor dashboard and triage | Counselor | Can counselors find urgent cases fast, review them, record notes and close the loop? |
| **O4** | Appointments | Student, counselor | Can students book and cancel a session, and can counselors publish availability and handle requests? |
| **O5** | Crisis resources, privacy and trust (cross-cutting) | Both | Can a distressed student reach crisis help in seconds, and do users believe their data is private? |

### Research questions
1. Task success and efficiency: what share of participants complete each core task unaided, and how long does it take?
2. Perceived usability: how do participants rate ease of use (SEQ per task, SUS overall)?
3. Safety: is every high-risk or safety-flagged check-in noticed by the student (crisis resources shown) and by a counselor?
4. Validity: do counselors agree with the risk level the system assigns?
5. Trust: do students feel safe and private using it, and would they use it when stressed?

### Success criteria (set before testing)

| Measure | Target |
|---|---|
| Unaided completion, core tasks (S2, S5, C1, C2) | at least 85% of participants |
| Safety-item persona: crisis resources reached | **100%** (any miss is a release blocker) |
| Counselor finds every urgent case in the triage task | **100%** |
| Mean SEQ per task (1 to 7) | at least 5.5 |
| SUS, per role | at least 68 (industry average); with n under 10, treat as indicative only |
| Counselor / system risk-level agreement | at least 80% exact; no case a counselor rates "urgent" that the system rates "low" |
| Students agreeing "I felt my answers were private" (4 or 5 of 5) | at least 75% |

---

## 2. Methodology

### 2.1 Design
Moderated, one-on-one, think-aloud usability sessions on a **test build with fictional data**, each
followed by a semi-structured interview. One facilitator and one note-taker per session. Sessions are
in person on a laptop and, for at least two students, on the participant's own phone, because the
product targets desktop and mobile.

This is a **formative** study. It finds and ranks problems to fix; with 5 to 8 students it is not
statistically representative, and the report must say so. Five users per role typically surface most
major usability problems, which is why the minimum is 5 students; more students are recommended to
cover device and background differences. Two to three counselors is a practical limit given campus
staffing, and their results are reported as case observations, not percentages.

### 2.2 Participants

| Group | n | Recruit from | Criteria |
|---|---|---|---|
| Students | 5 to 8 | University of San Agustin undergraduates | 18 or older; mix of year levels and programs; at least 2 who have **not** used campus counseling; at least 2 who test on a phone; include one participant who uses keyboard-only navigation or assistive technology if one volunteers |
| Counselors | 2 to 3 | Guidance Services and Testing Center | Currently doing triage or scheduling; ideally one who also acts as administrator |

Target mix for 8 students: 2 first-year, 2 second-year, 2 third-year, 2 fourth-year or above. Record
(do not require) gender, age band, device, and prior use of counseling or wellness apps. Offer a
small token of thanks; do not tie it to completing tasks.

**Exclusion and welfare.** Do not recruit students who are currently in acute distress or in treatment
and may find the screener upsetting, and say clearly in recruitment that participation is optional and
can stop at any time.

### 2.3 Ethics and privacy (required before any session)

1. **Approval.** Obtain the research ethics or panel approval your program requires, and a written
   instruction from the Guidance Center on the referral path in step 5.
2. **Informed consent** (Appendix A): purpose, voluntary, may stop at any time, recording choice,
   what is stored and who sees it, contact for questions. Consent is separate for audio or screen recording.
3. **No real answers to the screener.** Students do **not** answer the 7 check-in questions about
   themselves. They complete the check-in **as a fictional persona** (Appendix C). This protects them
   and keeps the safety-item test controlled. Tell them it is a role-play.
4. **Test data only.** Run against a staging Firebase project (or the Firebase Emulator) with seeded
   fictional accounts and cases. Never use production data or real student identities, and do not
   test on the live site.
5. **Distress protocol.** Say before each session: "If anything today brings up real feelings, we
   can stop, and here is how to reach the Guidance Center." If a participant discloses real risk, stop
   the session, stay with them and follow the Guidance Center's referral path. Have the contact
   details and the hotline numbers on the table, in print.
6. **Data handling** (Philippine Data Privacy Act, RA 10173): store notes and recordings under
   participant codes (S1, S2, C1), keep the code-to-name list separately and delete it when the
   study ends, restrict access to the research team, and delete recordings after analysis.

### 2.4 Test environment and setup

| Item | Setup |
|---|---|
| Build | Production-equivalent build pointed at a staging Firebase project or emulator |
| Accounts | 8 student accounts (`student1@...` to `student8@...`) with `@usa.edu.ph` format, 3 counselor accounts (approved), 1 admin account, all fictional |
| Seed data | 10 pre-made check-ins (3 high, 2 flagged by the safety item, 3 medium, 2 low) with different dates; 5 availability slots; 2 existing appointments (one pending, one confirmed) for the counselor tasks |
| Devices | One laptop with the browser students normally use, one phone per mobile participant |
| Capture | Screen recording with consent, timer, printed task cards, observer log (Appendix D) |
| Reset | Reseed between sessions so each participant starts from the same state |

**Known behaviors to expect, not bugs found by participants:** the high-risk email alert is **not
deployed** (counselors only see cases on the dashboard), and appointment booking currently allows
double-booking at the rules level. Do not stage tasks that depend on either. The second item is a
security and data-integrity issue tracked in `docs/SECURITY_AUDIT.md`, not a usability one.

### 2.5 Session structure

| Student session (about 50 min) | | Counselor session (about 60 min) | |
|---|---|---|---|
| 0:00 | Welcome, consent, role-play briefing | 0:00 | Welcome, consent, background |
| 0:08 | Pre-test interview (Q-S1) | 0:08 | Pre-test interview (Q-C1) |
| 0:13 | Tasks S1 to S6 (think aloud) | 0:15 | Risk-agreement exercise (C0, section 3.2) |
| 0:38 | Post-task SEQ after each task; SUS | 0:30 | Tasks C1 to C6 (think aloud) |
| 0:42 | Post-test interview (Q-S3) | 0:50 | SUS; post-test interview (Q-C3) |
| 0:50 | Debrief, safety resources, thanks | 0:60 | Debrief, thanks |

**Facilitator rules.** Read tasks aloud, using the user's words, never interface labels ("find out
how you are doing" rather than "open the Results tab"). Stay neutral ("What would you do next?"). Do
not help until the participant is stuck for 2 minutes or asks to stop, then record it as "assisted".
Never lead, explain the design or defend it. Run a pilot session with a colleague first and fix the
task wording.

---

## 3. Test scenarios

Each scenario maps to an objective. "Success" is what the observer checks. Give participants the task
card only; the starting state is set by the seed data.

### 3.1 Student tasks

| ID | Obj. | Starting state | Task given to the participant | Success criteria | Max time |
|---|---|---|---|---|---|
| **S1** | O5 | Signed out, on the home page | "You want to use Mind Bridge for the first time. Create an account and get to your own page." | Account created with a school email, consent given, student dashboard reached | 4 min |
| **S2** | O1, O2 | Signed in (Persona A, low answers) | "Take today's wellness check-in and answer as Alex would (card). Tell me what the result means to you." | All 7 questions answered, submitted, participant explains the result and the next step in their own words | 4 min |
| **S3** | O1, O2, O5 | Signed in (Persona D, safety answer above 0) | "Now take the check-in as Dana (card). What do you think happens next? What would you do?" | Safety item answered, **crisis resources and hotlines shown**, participant can state at least one way to get help now | 4 min |
| **S4** | O2 | Student has 3 earlier check-ins | "Find out whether you are doing better or worse than your last check-in, and look at your earlier ones." | Finds score trend and history without help | 3 min |
| **S5** | O4 | Open slots exist | "You decided you would like to talk to a counselor next week. Book a session." | Slot chosen, appointment created, participant says it is waiting for confirmation | 4 min |
| **S6** | O4 | Student has a pending appointment | "Something came up. Cancel that appointment." | Cancelled with a reason, participant understands it is cancelled | 3 min |
| **S7** | O5 | On the dashboard | "It is 1 a.m. and you feel overwhelmed. Find something that could help right now." | Reaches crisis resources or the breathing exercise within 30 s | 2 min |
| **S8** | O5 | Student with an assigned counselor | "Send your counselor a private message." | Message sent; participant says who can read it | 3 min |

S1 may be skipped for participants who already have a test account, but run it for at least 4 students.
S3 is the **most important task**. Run it for every student.

### 3.2 Counselor tasks and exercise

| ID | Obj. | Starting state | Task | Success criteria | Max time |
|---|---|---|---|---|---|
| **C0** | O2 | Printout of 8 fictional response sets (no scores shown) | "For each, mark whether you would treat it as low, medium, high or urgent." Record before showing any system result. | Ratings recorded for later comparison with the system (section 11.4) | 10 min |
| **C1** | O3 | Seeded with 10 check-ins, 5 of them flagged | "It is 8 a.m. before clinic. Find the students who need attention first." | Names all 5 flagged cases and puts safety-flagged ones first | 4 min |
| **C2** | O3 | A flagged case open | "Look at this student's case, write a private note and mark it handled." | Answers viewed, note saved, status changed to reviewed, participant confirms it left the queue | 5 min |
| **C3** | O4 | Counselor with no slots | "Make yourself available next Tuesday 9 to 11." | Slot added and visible in the list | 3 min |
| **C4** | O4 | Two pending appointment requests | "Confirm one request and decline the other." | Both handled; participant says what the student will see | 4 min |
| **C5** | O3 | Unassigned student | "Make this student one of your own." | Assignment recorded | 3 min |
| **C6** | O5 | Student message waiting | "Reply to the student." | Reply sent | 2 min |

C0 also tests whether the scoring supports counselor judgment (research question 4). It happens
before the tool is shown so the counselor is not anchored by it.

---

## 4. Instruments and measures

| Measure | When | How |
|---|---|---|
| Task completion | Per task | Observer codes **Success**, **Assisted**, **Failed / abandoned** |
| Time on task | Per task | Stopwatch from task read-out to success or give-up |
| Errors and detours | Per task | Observer log: wrong clicks, backtracking, misreads, quotes |
| Single Ease Question (SEQ) | After each task | "Overall, this task was: 1 (very difficult) to 7 (very easy)" |
| SUS (System Usability Scale) | End of tasks | 10-item standard questionnaire (Appendix B) |
| Trust and safety items | End of tasks | 5-point agreement items (Appendix B) |
| Think-aloud and interview | Throughout | Notes and, with consent, recordings |
| Risk agreement | C0 | Counselor ratings vs system output |

SUS is scored as: odd items contribute (score minus 1), even items contribute (5 minus score), sum
the ten, multiply by 2.5, giving 0 to 100.

### Issue severity (applied to every problem found)

| Rating | Meaning |
|---|---|
| **4 Blocker** | Prevents the task, or could harm a user (for example a missed crisis flag). Fix before release. |
| **3 Major** | Many users struggle or fail; workaround needed |
| **2 Minor** | Causes hesitation or small errors |
| **1 Cosmetic** | Noticed but harmless |

---

## 5. Student interview guide

Neutral, open questions; ask "why?" and "can you show me?" Do not defend the design.

**Q-S1: Before the tasks (5 min)**
1. Tell me about a time you were stressed or overwhelmed at school. Who or what did you turn to? (Do not ask them to share anything they do not want to.)
2. Have you ever thought about using campus counseling? What made it easy or hard?
3. What do you worry about when it comes to using an online tool for how you are feeling?
4. Which apps or sites do you use on your phone every day? How do you usually find help online?

**Q-S2: During and right after tasks (as needed)**
5. What are you thinking right now? What did you expect to happen?
6. Was anything unclear, or did any wording surprise you?
7. (After S2 and S3) In your own words, what does this result mean? What would you do next?
8. (After S3) How did it feel to see this screen? Was anything too much, not enough or the wrong tone?
9. (After S5) What do you think happens now? Who can see that you booked?

**Q-S3: After the tasks (10 min)**
10. How would you describe Mind Bridge to a friend?
11. What was the easiest part? What was the hardest or most confusing?
12. The check-in has 7 questions. Was that too many, too few, about right? Was any question hard to answer, or uncomfortable?
13. Did the 0 to 3 answer choices make sense? Was there an answer you wanted but could not give?
14. Did the result and the guidance feel respectful? Anything that felt cold, alarming or judgmental?
15. How private did it feel? Who do you think can see your answers? Does that change what you would be honest about?
16. If you were stressed at night or between classes, would you use it? On what device? What would stop you?
17. Would you book a counselor through this? What would make you more or less likely to?
18. Is anything missing that you expected? If you could change one thing, what would it be?
19. Is there anything we did not ask that you want to tell us?

**Probes:** "Can you say more?", "What did you mean by that?", "What would you have done if I were not here?", "How would your friends react to this?"

---

## 6. Counselor interview guide

**Q-C1: Before the tasks (8 min)**
1. Describe how you currently find out that a student may need urgent help. How long does it take?
2. How do you manage appointments and availability now? What goes wrong?
3. How do you decide who to see first? What information do you rely on?
4. What would an online screener have to do for you to trust it?
5. What are your obligations around confidentiality and records that this tool must respect?

**Q-C2: During tasks (as needed)**
6. What are you looking for on this screen? What did you expect?
7. (After C1) How confident are you that you found everyone who needs attention? What would make you more confident?
8. (After C2) Is this how you would record a case? What is missing in the notes or status?
9. (After C4) What should the student see after you decline or reschedule?

**Q-C3: After the tasks (12 min)**
10. Compare your own ratings in the exercise with the system's. Where do you disagree, and why?
11. Do the low, medium and high labels match how you think about risk? Are the thresholds right?
12. Is seven questions enough for triage? Which question would you add or drop?
13. How should the safety question be handled and who must be told, and how quickly?
14. If a high-risk check-in arrives at 8 p.m., what should happen? Would you rely on checking the dashboard, or do you need an email or text alert? (The alert is not yet deployed.)
15. Is the dashboard readable at a glance? What would you add: trends, filters, history, export?
16. Does the data you can see match what you need, and does it show more than you should see?
17. How would this fit into your clinic day? What would stop you adopting it?
18. What risks worry you: false reassurance, missed cases, students not honest, privacy?
19. What would you change first?

---

## 7. Procedure checklist

**Before:** ethics approval; Guidance Center referral path in writing; staging build and seed data
ready and reset script tested; consent forms printed; pilot session with a colleague and wording
fixed; task cards, persona cards, SUS sheets and observer logs printed; recording tool tested;
crisis hotline numbers printed.

**During:** greet and consent; role-play briefing; run tasks in a rotated order (except S1 first and
S3 never last, so the safety task is not skipped for time); record success, time, SEQ; interview;
SUS; debrief.

**After (within 24 hours):** type up notes; tag issues with the severity scale; remove names;
back up data; reseed the environment.

## 8. Analysis plan

1. **Quantitative.** Per task: completion (success / assisted / failed), median time, mean SEQ.
   Per role: SUS mean and range. Report counts as "5 of 7", not percentages, for groups under 10.
2. **Qualitative.** Code notes and transcripts per objective, then build an **affinity map** of
   recurring themes. A problem seen by 2 or more participants, or any severity-4 issue seen once, goes to the issue log.
3. **Prioritization.** Rank issues by severity, then by how many participants hit them.
4. **Risk validity.** Cross-tabulate counselor ratings (C0) against system risk level. Report
   agreement and list every disagreement, especially under-rating by the system.
5. **Triangulate.** A finding is "confirmed" when behavior (observed), rating (SEQ or SUS) and
   interview comment agree.
6. **Report limits.** Small, volunteer, role-play-based sample; students did not answer the
   screener about themselves; so conclusions are about usability and comprehension, not clinical
   accuracy or real-world help-seeking.

## 9. Schedule and roles

| Week | Activity |
|---|---|
| 1 | Ethics approval, recruitment, staging build, seed data, printed materials, pilot session |
| 2 | Student sessions (5 to 8), then counselor sessions (2 to 3) |
| 3 | Analysis, issue log, fixes to severity-4 and 3 issues |
| 4 | Re-test fixed tasks with 2 to 3 participants; write results; capstone presentation |

| Role | Responsibility |
|---|---|
| Facilitator | Runs the session script, interviews, keeps to neutrality |
| Note-taker | Timing, task codes, errors, verbatim quotes |
| Technical lead | Resets data between sessions, operates the staging build |
| Welfare contact | Guidance Center liaison for any distress, available during sessions |

---

## 10. Evidence available now (pre-pilot, not user testing)

This section is the **only results-type content that exists today.** It is not a substitute for
participant data. It shows how ready the build is for testing and where to look hardest.

### 10.1 Automated test results

| Suite | Result | Notes |
|---|---|---|
| Client unit tests (`client`, Vitest) | **267 of 267 passed** | Run on 2026-10-02: api, avatar, errors, dates, validation, scoring |
| End-to-end browser tests (Playwright, `client/e2e`) | **43 tests** across 5 files | Not run for this report; sign-up and login (14), counselor dashboard (9), crisis resources (8), check-in (6), results (6) |
| Backend rules, API and Cloud Function tests (`backend-tests`) | Present, 4 rules suites plus API and function suites | Not run for this report; they need a Java runtime for the Firestore emulator |

### 10.2 Coverage by objective

| Objective | Automated coverage | Gap |
|---|---|---|
| O1 Check-in | Strong: question flow, back and next, last-question submit, restart | none identified |
| O2 Risk scoring | Strong: scoring unit and edge tests; e2e for low and safety-flagged results | Result-screen **comprehension** can only be tested with people |
| O3 Dashboard | Good: queue defaults, filters, inspect, notes, status | No automated test of reading speed or scan-ability |
| **O4 Appointments** | **None at the browser level** | **No e2e spec covers booking, cancelling, availability or confirm and decline.** Run the manual pre-test below before sessions. |
| O5 Crisis and privacy | Strong for crisis page (8 tests) | Trust and perceived privacy are only measurable with people |

**Action before sessions:** add e2e coverage for the appointment flow, or at minimum walk through S5,
S6, C3 and C4 manually on the staging build, so participants do not hit plain defects.

### 10.3 Expert review of the code: hypotheses to test with users

These come from reading the source, not from participants. Each is a **hypothesis** to confirm or
dismiss in the sessions.

| # | Observation | Why it matters | Test with |
|---|---|---|---|
| H1 | The safety item reads "Thoughts that you would be better off not around, or hurting yourself in some way". The wording is ungrammatical ("not around"). | It is the highest-stakes question in the product. Unclear wording risks misreading and under-reporting | **Fix the sentence first** (for example "better off not being around"), then ask S3 and Q-S3 #12 |
| H2 | The safety item's subtext is "Confidential immediate safety screening item". | Clinical phrasing; the product principles say never to use jargon, and to avoid alarming the student | S3, Q-S2 #8 |
| H3 | The code labels the question set a "Validated Clinical Screening Item Bank (PHQ-9 & GAD-7)". It is a custom **7-item adaptation** (two depression items, two anxiety items, sleep, concentration, and the PHQ-9 safety item), with 30% and 60% cut-offs set by the team. | Calling it validated is an overclaim a capstone panel may challenge. Counselor agreement (C0) is the study's evidence for face validity | C0 and Q-C3 #10 to #12; word it as "adapted from" in the paper |
| H4 | The high-risk email alert is not deployed. Counselors learn of a high-risk check-in only by opening the dashboard. | Directly affects the safety objective. The sessions should establish how often counselors would actually check | Q-C3 #14 |
| H5 | An approved-status gap: a counselor who is not yet approved can open the staff dashboard shell but sees no data. | Confusing onboarding for new counselors | C1 for a fresh account |
| H6 | The 0 to 3 scale labels ("Several days", "A few times") are lighter than the original instruments' wording. | Students may map answers differently | Q-S3 #13 |

---

## 11. Results report (template to complete after the sessions)

> Every cell below is intentionally blank. **Fill only with data collected in the sessions.**
> Delete this note when complete.

### 11.1 Participants

| Code | Role | Year / program | Device | Counseling experience | Date |
|---|---|---|---|---|---|
| S1 | Student | | | | |
| S2 | Student | | | | |
| S3 | Student | | | | |
| S4 | Student | | | | |
| S5 | Student | | | | |
| S6 to S8 | Student (optional) | | | | |
| C1 | Counselor | | | | |
| C2 | Counselor | | | | |
| C3 | Counselor (optional) | | | | |

### 11.2 Task results

| Task | Obj. | Success | Assisted | Failed | Median time | Mean SEQ | Main problem |
|---|---|---|---|---|---|---|---|
| S1 Sign up | O5 | / n | / n | / n | | | |
| S2 Check-in (low) | O1, O2 | | | | | | |
| **S3 Check-in (safety flag)** | O1, O2, O5 | | | | | | |
| S4 Results and history | O2 | | | | | | |
| S5 Book appointment | O4 | | | | | | |
| S6 Cancel appointment | O4 | | | | | | |
| S7 Find help now | O5 | | | | | | |
| S8 Private message | O5 | | | | | | |
| C1 Triage queue | O3 | | | | | | |
| C2 Review a case | O3 | | | | | | |
| C3 Add availability | O4 | | | | | | |
| C4 Confirm and decline | O4 | | | | | | |
| C5 Assign student | O3 | | | | | | |
| C6 Reply | O5 | | | | | | |

### 11.3 Scores against targets

| Measure | Target | Students | Counselors | Met? |
|---|---|---|---|---|
| Unaided completion, core tasks | at least 85% | | | |
| Safety-item persona reached crisis resources | 100% | | n/a | |
| Counselors found every urgent case | 100% | n/a | | |
| Mean SEQ | at least 5.5 | | | |
| SUS (mean, range) | at least 68 | | | |
| "I felt my answers were private" (4 or 5) | at least 75% | | n/a | |

### 11.4 Risk-level agreement (from exercise C0)

| Case | System level | C1 rating | C2 rating | C3 rating | Agree? |
|---|---|---|---|---|---|
| 1 to 8 | | | | | |

Report exact-match agreement, and list any case a counselor rated urgent or high that the system
rated lower.

### 11.5 Issue log

| ID | Obj. | Issue | Evidence (who, how many) | Severity 1 to 4 | Recommendation | Status |
|---|---|---|---|---|---|---|
| U-01 | | | | | | |

### 11.6 Summary of findings (write after analysis)

- **What worked:** 
- **Top problems by severity:** 
- **Safety result (S3, C1):** 
- **Risk-scoring validity (C0):** 
- **Trust and privacy:** 
- **Recommended changes and re-test plan:** 

### 11.7 Limitations to state in the paper
Small volunteer sample; role-played check-ins rather than real disclosures; test data and staging
environment; formative design, so no claims of statistical significance; counselor sample from one
office; no longitudinal use.

---

## Appendix A: Consent script (shortened)

"Thank you for helping. We are testing a website called Mind Bridge, **not testing you**. You will
use it to do some tasks while thinking aloud, then we will talk. There are no right or wrong answers.
You will **not** answer the wellness questions about yourself; you will play a made-up person from a
card. You can stop at any time without giving a reason and nothing will happen to you. With your
permission we record the screen and audio so we can review it; only the research team will see it,
it is stored under a code, not your name, and deleted after analysis. If anything today brings up
real feelings, we can stop, and here is how to contact the Guidance Center: [details]. Do you have
questions? Do you agree to take part? Do you agree to be recorded? (yes / no)"

Participant name, signature, date, researcher signature.

## Appendix B: Questionnaires

**SUS (1 strongly disagree to 5 strongly agree).**
1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Trust and safety items (1 to 5).**
- T1. I felt my answers would be kept private.
- T2. I understood who can see my information.
- T3. The result and guidance felt respectful, not judgmental.
- T4. I knew what to do if I needed help right away.
- T5. I would use this when I am stressed.

## Appendix C: Persona cards (for student check-in tasks)

Answer scale: 0 not at all, 1 several days, 2 more than half the days, 3 nearly every day. Questions
in order: interest, feeling down, sleep, nervous, can't stop worrying, concentration, safety.
Expected result uses the app's rule (max 21; high at 13 or more or any safety score above 0; medium at 7 or more).

| Card | Story | Answers | Total | Expected result |
|---|---|---|---|---|
| **A: Alex** | Busy week, mostly fine | 0, 1, 1, 0, 0, 1, 0 | 3 | Low |
| **B: Bea** | Midterms, tired and worried | 1, 2, 1, 1, 1, 1, 0 | 7 | Medium |
| **C: Carlo** | Struggling for weeks | 2, 2, 2, 2, 2, 3, 0 | 13 | High (by total) |
| **D: Dana** | Feeling low; the last answer is 1 | 0, 0, 1, 0, 0, 0, 1 | 2 | High (safety flag) |

Run **A** and **D** for every student; use **B** or **C** for extra students to show the medium and
high screens. Check the expected results against the build before the pilot.

## Appendix D: Observer log (one per task)

| Field | |
|---|---|
| Participant / task / device | |
| Start, end, time | |
| Result (success / assisted / failed) | |
| Path taken, wrong clicks, detours | |
| Quotes (verbatim) | |
| Confusion, emotion, hesitations | |
| SEQ (1 to 7) | |
| Issue seen (severity 1 to 4) | |
