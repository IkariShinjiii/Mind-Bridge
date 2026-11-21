// KNOWN GAPS in firestore.rules. Each test asserts what the rules do TODAY (the write
// succeeds). They are deliberately named "GAP:" so that when a rule is tightened the test
// fails and should be flipped to assertFails. None of these are fixed by this suite.
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSucceeds } from "@firebase/rules-unit-testing";
import { addDoc, collection } from "firebase/firestore";
import { createEnv, seedUsers, as, assessment } from "../helpers/env.js";

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedUsers(env); });

describe("GAP: students can write fields that should be server-controlled", () => {
  // Fixed and moved to scheduling.test.js: a student can no longer create an already-'Confirmed' appointment,
  // or post a message labelled with a staff role.

  // Fixed and moved to scheduling.test.js: a student can no longer book a slot that is already taken (the isBooked
  // flip is refused), and bookings, profiles and slots only accept the fields the app writes.
  // Fixed and moved to scheduling.test.js (#137, #138): a slot is freed only by the student who booked it, in a
  // batch that also cancels their appointment, and is booked only together with its appointment.

  // A score can no longer be filed under-reported (see assessments.test.js), but the rules cannot read the crisis
  // answer, so the safety flag is still taken on trust. The staff dashboard and the alert re-check it.
  it("GAP: a crisis answer can still be filed with flaggedForImmediateReview false", () =>
    assertSucceeds(addDoc(collection(as(env, "student"), "assessments"),
      assessment({
        answers: [0, 0, 3], total: 3, maxScore: 9, riskLevel: "medium", flaggedForImmediateReview: false,
        questionSummary: [{ id: "q3", text: "Safety", score: 3, isCrisisItem: true }],
      }))));

  // Fixed and moved to scheduling.test.js: the name on a chat message must be the sender's profile name.
});
