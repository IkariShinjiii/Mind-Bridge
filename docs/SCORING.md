# How the check-in is scored, and how that compares with PHQ-9 and GAD-7

## What the quick check-in is

Seven questions, each answered 0 (not at all) to 3 (nearly every day), total 0 to 21. Every question comes from a
published, free-to-use instrument:

| # | Question (short) | Source |
|---|---|---|
| 1 | Little interest or pleasure | PHQ-9 item 1 (PHQ-2) |
| 2 | Down, depressed, hopeless | PHQ-9 item 2 (PHQ-2) |
| 3 | Sleep trouble | PHQ-9 item 3 |
| 4 | Nervous, anxious, on edge | GAD-7 item 1 (GAD-2) |
| 5 | Cannot stop worrying | GAD-7 item 2 (GAD-2) |
| 6 | Trouble concentrating | PHQ-9 item 7 |
| 7 | Better off not around, or self-harm | PHQ-9 item 9 (safety item) |

Wording is adapted for students, so this is a **screening aid, not the validated PHQ-9 or GAD-7**. The mapping lives in
`client/src/utils/clinical.ts` (`QUICK_SOURCE`).

## Our risk levels

From `client/src/utils/scoring.ts`; the Firestore rules and the alert code enforce the same percentages.

| Level | Rule |
|---|---|
| High | Question 7 above 0, **or** total 13 or more (60% of 21) |
| Medium | Total 7 to 12 (30% of 21) |
| Low | Total 0 to 6 |

These cutoffs are our own. They are not published clinical cutoffs.

## Published references

| Instrument | Range | Bands |
|---|---|---|
| PHQ-9 | 0-27 | 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe |
| GAD-7 | 0-21 | 0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe |
| PHQ-2 and GAD-2 | 0-6 each | 3 or more is a positive screen |
| PHQ-9 item 9 | 0-3 | above 0 is flagged for follow-up |

## Where they disagree

* **Both two-question screens positive, yet "low".** Answers `2,1,0,2,1,0,0` give PHQ-2 = 3 and GAD-2 = 3, both
  positive by the published cutoff, but the total is 6 of 21, which our percentage rule calls low. One positive screen
  alone can also be low (for example `3,0,0,0,0,0,0`).
* **Question 7** matches the PHQ-9 item 9 rule exactly: any answer above 0 is high and flagged.
* **High at 13 of 21** is roughly the PHQ-9 "moderately severe" band (15 of 27, about 56%), so the two agree broadly at
  the top. Medium at 7 is stricter than the published "mild" start (5 of 27, about 19%) and gentler than the published
  two-question cutoff.

Tests in `client/src/utils/clinical.test.ts` pin the published bands and the known disagreement above.

## What follows from this

* **Quick check-in:** a positive PHQ-2 or GAD-2 raises a low check-in to at least medium (never to high, never lowers).
  The staff case view shows both screens. Only the seven quick questions are used, so no PHQ-9 severity band is shown for
  them: five PHQ-9 items are not enough to place someone in a published band.
* **Full check-in (optional, student chooses before answering):** the 16 standard questions, PHQ-9 then GAD-7, out of
  48. Each scale is scored on its published bands, and staff see the score and band (minimal to severe) for both.

### Risk level for the full check-in

The highest of the percentage rule (30% and 60% of 48) and the published bands:

| Level | When |
|---|---|
| High | PHQ-9 item 9 above 0, **or** PHQ-9 15 or more, **or** GAD-7 15 or more, **or** total 29 or more |
| Medium | PHQ-9 or GAD-7 10 or more, **or** positive PHQ-2 or GAD-2, **or** total 15 or more |
| Low | otherwise |

The same rule runs in the browser (`scoreFull`, `scoreAnswers`), on the staff dashboard (`withVerifiedRisk`, which only
raises) and in the alert code (`api/_alertCore.ts` and `functions/index.js`), so the high-risk email fires for a full
check-in exactly when the browser says high. A test feeds 500 generated answer sets to both and checks they agree.
Firestore rules need no change: 16 answers and a maximum of 48 fit the existing limits, and the percentage rule they
enforce can only be met or exceeded.

## Wellbeing add-on (WHO-5)

An optional card on the student dashboard, kept apart from the check-in. Five positive statements about the last two
weeks, each 0 (at no time) to 5 (all of the time). Raw 0 to 25, times 4, so 0 to 100. Below 50 is the published prompt to
look further, and the card says so gently and offers a counselor. It is stored in its own `wellbeing` collection, staff
see the latest score in the case view, and it **never changes a check-in's risk level** and never sends an alert. The
Firestore rules check that the score is exactly the answers added up times 4.

## Sources

* Kroenke K, Spitzer RL, Williams JBW. The PHQ-9. J Gen Intern Med 2001 (public domain).
* Spitzer RL et al. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med 2006.
* Kroenke K et al. The Patient Health Questionnaire-2. Med Care 2003 (cutoff 3).
* Kroenke K et al. Anxiety disorders in primary care: the GAD-2. Ann Intern Med 2007 (cutoff 3).
* Bech P et al. WHO (Five) Well-Being Index (1998 version), Psychiatric Research Unit, Frederiksborg General Hospital, Hillerød, Denmark. Free to use.
* Cutoffs cross-checked against [urtuba/psytools](https://github.com/urtuba/psytools) (MIT code; no code copied).
