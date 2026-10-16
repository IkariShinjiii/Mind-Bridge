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

The staff view shows the published wording (see the "severity bands" change), and a positive PHQ-2 or GAD-2 raises a
check-in to at least medium. Nothing is ever lowered. The optional full PHQ-9 + GAD-7 check-in scores each scale on its
own published bands.

## Sources

* Kroenke K, Spitzer RL, Williams JBW. The PHQ-9. J Gen Intern Med 2001 (public domain).
* Spitzer RL et al. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med 2006.
* Kroenke K et al. The Patient Health Questionnaire-2. Med Care 2003 (cutoff 3).
* Kroenke K et al. Anxiety disorders in primary care: the GAD-2. Ann Intern Med 2007 (cutoff 3).
* Cutoffs cross-checked against [urtuba/psytools](https://github.com/urtuba/psytools) (MIT code; no code copied).
