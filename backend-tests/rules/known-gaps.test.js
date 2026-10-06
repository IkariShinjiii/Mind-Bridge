// KNOWN GAPS in firestore.rules. Each test asserts what the rules do TODAY (the write
// succeeds). They are deliberately named "GAP:" so that when a rule is tightened the test
// fails and should be flipped to assertFails. None of these are fixed by this suite.
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, addDoc, updateDoc, collection } from "firebase/firestore";
import { createEnv, seedUsers, seed, as, slot, assessment, appointment, message } from "../helpers/env.js";

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedUsers(env); });

describe("GAP: students can write fields that should be server-controlled", () => {
  // Fixed and moved to scheduling.test.js: a student can no longer create an already-'Confirmed' appointment,
  // or post a message labelled with a staff role.

  // Fixed and moved to scheduling.test.js: a student can no longer book a slot that is already taken (the isBooked
  // flip is refused), and bookings, profiles and slots only accept the fields the app writes.
  it("GAP: a student can still free someone else's booked slot (isBooked -> false)", async () => {
    // Students free their own slot when they cancel, and the rules cannot tie a slot to its appointment in that order.
    await seed(env, "availability/slot1", slot({ isBooked: true }));
    await assertSucceeds(updateDoc(doc(as(env, "student"), "availability/slot1"), { isBooked: false }));
  });

  // A score can no longer be filed under-reported (see assessments.test.js), but the rules cannot read the crisis
  // answer, so the safety flag is still taken on trust. The staff dashboard and the alert re-check it.
  it("GAP: a crisis answer can still be filed with flaggedForImmediateReview false", () =>
    assertSucceeds(addDoc(collection(as(env, "student"), "assessments"),
      assessment({
        answers: [0, 0, 3], total: 3, maxScore: 9, riskLevel: "medium", flaggedForImmediateReview: false,
        questionSummary: [{ id: "q3", text: "Safety", score: 3, isCrisisItem: true }],
      }))));

  it("GAP: a student can still post a message under any display name (the role is checked, the name is not)", () =>
    assertSucceeds(addDoc(collection(as(env, "student"), "messages"), message({ senderName: "Dr. Cruz" }))));
});
