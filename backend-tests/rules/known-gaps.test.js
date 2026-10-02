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

  it("GAP: a student can book against any counselorId / slot, with no conflict check", async () => {
    await seed(env, "availability/slot1", slot({ isBooked: true }));
    await assertSucceeds(addDoc(collection(as(env, "student"), "appointments"), appointment({ slotId: "slot1", counselorId: "adm1" })));
  });

  it("GAP: a student can free someone else's booked slot (isBooked -> false)", async () => {
    await seed(env, "availability/slot1", slot({ isBooked: true }));
    await assertSucceeds(updateDoc(doc(as(env, "student"), "availability/slot1"), { isBooked: false }));
  });

  it("GAP: riskLevel / flaggedForImmediateReview are client-supplied (a max score can be filed as 'low')", () =>
    assertSucceeds(addDoc(collection(as(env, "student"), "assessments"),
      assessment({ total: 21, maxScore: 21, riskLevel: "low", flaggedForImmediateReview: false }))));

  it("GAP: a student can still post a message under any display name (the role is checked, the name is not)", () =>
    assertSucceeds(addDoc(collection(as(env, "student"), "messages"), message({ senderName: "Dr. Cruz" }))));
});
