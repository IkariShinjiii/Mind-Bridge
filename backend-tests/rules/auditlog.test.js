import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDocs, addDoc, updateDoc, deleteDoc, collection } from "firebase/firestore";
import { createEnv, seedUsers, seed, as, anon } from "../helpers/env.js";

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });

const entry = (actorId, over = {}) => ({
  actorId, actorName: "Dr. Cruz", action: "case_viewed", targetId: "a1", detail: "Ana Student",
  at: "2026-11-21T00:00:00.000Z", ...over,
});

beforeEach(async () => {
  await env.clearFirestore();
  await seedUsers(env);
  await seed(env, "auditLog/e1", entry("cou1"));
});

describe("audit log (written only by the server)", () => {
  it("no browser user can create an entry, not even as themselves", async () => {
    await assertFails(addDoc(collection(as(env, "counselor"), "auditLog"), entry("cou1")));
    await assertFails(addDoc(collection(as(env, "admin"), "auditLog"), entry("adm1", { action: "case_updated" })));
    await assertFails(addDoc(collection(as(env, "student"), "auditLog"), entry("stu1")));
    await assertFails(addDoc(collection(anon(env), "auditLog"), entry("cou1")));
  });
  it("entries cannot be edited or deleted, even by an admin", async () => {
    const db = as(env, "admin");
    await assertFails(updateDoc(doc(db, "auditLog/e1"), { detail: "changed" }));
    await assertFails(deleteDoc(doc(db, "auditLog/e1")));
  });
  it("only an admin can read the log", async () => {
    await assertSucceeds(getDocs(collection(as(env, "admin"), "auditLog")));
    await assertFails(getDocs(collection(as(env, "counselor"), "auditLog")));
    await assertFails(getDocs(collection(as(env, "student"), "auditLog")));
  });
});
