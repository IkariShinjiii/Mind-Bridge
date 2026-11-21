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

describe("audit log", () => {
  it("an approved peer facilitator records their own action", () =>
    assertSucceeds(addDoc(collection(as(env, "counselor"), "auditLog"), entry("cou1"))));
  it("an admin records their own action", () =>
    assertSucceeds(addDoc(collection(as(env, "admin"), "auditLog"), entry("adm1", { action: "case_updated" }))));
  it("cannot record an action as someone else", () =>
    assertFails(addDoc(collection(as(env, "counselor"), "auditLog"), entry("adm1"))));
  it("students cannot write", () =>
    assertFails(addDoc(collection(as(env, "student"), "auditLog"), entry("stu1"))));
  it("an unapproved peer facilitator cannot write", () =>
    assertFails(addDoc(collection(as(env, "pendingPeerFacilitator"), "auditLog"), entry("cou2"))));
  it("unauthenticated cannot write", () =>
    assertFails(addDoc(collection(anon(env), "auditLog"), entry("cou1"))));
  it("rejects an unknown action, an extra field and a far-future time", async () => {
    const db = as(env, "counselor");
    await assertFails(addDoc(collection(db, "auditLog"), entry("cou1", { action: "deleted_everything" })));
    await assertFails(addDoc(collection(db, "auditLog"), entry("cou1", { extra: 1 })));
    await assertFails(addDoc(collection(db, "auditLog"), entry("cou1", { at: "9999-12-31T00:00:00.000Z" })));
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
