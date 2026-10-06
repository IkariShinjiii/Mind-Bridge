import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection } from "firebase/firestore";
import { createEnv, seedUsers, as, anon, noProfile } from "../helpers/env.js";

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); await seedUsers(env); });

const newStudent = (over = {}) => ({ name: "New", email: "new@usa.edu.ph", role: "student", emailVerified: false, approved: true, active: true, createdAt: "2026-10-01T00:00:00.000Z", ...over });

describe("users - GET profile (getUserSettings, AuthProvider, Login)", () => {
  it("owner reads own profile", () => assertSucceeds(getDoc(doc(as(env, "student"), "users/stu1"))));
  it("student cannot read another student's profile", () => assertFails(getDoc(doc(as(env, "student"), "users/stu2"))));
  it("approved counselor reads any profile", () => assertSucceeds(getDoc(doc(as(env, "counselor"), "users/stu1"))));
  it("admin reads any profile", () => assertSucceeds(getDoc(doc(as(env, "admin"), "users/stu1"))));
  it("UNAPPROVED counselor cannot read other profiles", () => assertFails(getDoc(doc(as(env, "pendingCounselor"), "users/stu1"))));
  it("unauthenticated request is rejected", () => assertFails(getDoc(doc(anon(env), "users/stu1"))));
});

describe("users - LIST (getAdminUsers)", () => {
  it("admin can list all users", () => assertSucceeds(getDocs(collection(as(env, "admin"), "users"))));
  it("approved counselor can list all users", () => assertSucceeds(getDocs(collection(as(env, "counselor"), "users"))));
  it("student cannot list users", () => assertFails(getDocs(collection(as(env, "student"), "users"))));
  it("deactivated student cannot list users", () => assertFails(getDocs(collection(as(env, "deactivated"), "users"))));
});

describe("users - CREATE (Signup / Google sign-in)", () => {
  const ref = (db, uid) => doc(db, "users", uid);
  it("new account creates its own active student profile", () => assertSucceeds(setDoc(ref(noProfile(env), "ghost"), newStudent())));
  it("cannot create a profile for a different uid", () => assertFails(setDoc(ref(noProfile(env), "someone-else"), newStudent())));
  it("cannot self-register as admin", () => assertFails(setDoc(ref(noProfile(env), "ghost"), newStudent({ role: "admin" }))));
  it("cannot self-register as counselor", () => assertFails(setDoc(ref(noProfile(env), "ghost"), newStudent({ role: "counselor" }))));
  it("cannot self-register as inactive", () => assertFails(setDoc(ref(noProfile(env), "ghost"), newStudent({ active: false }))));
  it("cannot self-register as unapproved", () => assertFails(setDoc(ref(noProfile(env), "ghost"), newStudent({ approved: false }))));
  it("unauthenticated create is rejected", () => assertFails(setDoc(ref(anon(env), "ghost"), newStudent())));
  it("cannot add fields sign-up does not write", () => assertFails(setDoc(ref(noProfile(env), "ghost"), newStudent({ assignedCounselorId: "cou1" }))));
  it("cannot store an oversized name", () => assertFails(setDoc(ref(noProfile(env), "ghost"), newStudent({ name: "x".repeat(201) }))));
});

describe("users - UPDATE (saveUserSettings, admin actions, assignCounselorToStudent)", () => {
  it("user edits own display fields", () => assertSucceeds(updateDoc(doc(as(env, "student"), "users/stu1"), { name: "Ana B." })));
  for (const field of ["role", "approved", "active", "assignedCounselorId", "assignedCounselorName", "assignedAt"]) {
    it(`user cannot change own protected field "${field}"`, () =>
      assertFails(updateDoc(doc(as(env, "student"), "users/stu1"), { [field]: field === "role" ? "admin" : "x" })));
  }
  it("user can save every Settings field", () =>
    assertSucceeds(updateDoc(doc(as(env, "student"), "users/stu1"), {
      name: "Ana B.", phone: "0917", bio: "hi", avatarGradient: "a", useGoogleAvatar: false,
      emergencyContact: { name: "Mom", phone: "1" }, wellnessGoals: ["sleep"], updatedAt: "x" })));
  it("user cannot write a field Settings does not save", () => assertFails(updateDoc(doc(as(env, "student"), "users/stu1"), { email: "boss@usa.edu.ph" })));
  it("user cannot invent a new field", () => assertFails(updateDoc(doc(as(env, "student"), "users/stu1"), { isVip: true })));
  it("student cannot edit another student", () => assertFails(updateDoc(doc(as(env, "student"), "users/stu2"), { name: "hax" })));

  it("admin approves a counselor (approveCounselor)", () => assertSucceeds(updateDoc(doc(as(env, "admin"), "users/cou2"), { approved: true })));
  it("admin rejects a counselor (rejectCounselor)", () => assertSucceeds(updateDoc(doc(as(env, "admin"), "users/cou1"), { approved: false })));
  it("admin deactivates and reactivates a user", async () => {
    await assertSucceeds(updateDoc(doc(as(env, "admin"), "users/stu1"), { active: false }));
    await assertSucceeds(updateDoc(doc(as(env, "admin"), "users/stu1"), { active: true }));
  });
  it("counselor cannot approve counselors", () => assertFails(updateDoc(doc(as(env, "counselor"), "users/cou2"), { approved: true })));
  it("counselor cannot change a student's role", () => assertFails(updateDoc(doc(as(env, "counselor"), "users/stu1"), { role: "admin" })));
  it("counselor can assign themselves to a student", () =>
    assertSucceeds(updateDoc(doc(as(env, "counselor"), "users/stu1"), { assignedCounselorId: "cou1", assignedCounselorName: "Dr. Cruz", assignedAt: "2026-10-01T00:00:00.000Z" })));
  it("counselor can unassign (nulls)", () =>
    assertSucceeds(updateDoc(doc(as(env, "counselor"), "users/stu1"), { assignedCounselorId: null, assignedCounselorName: null, assignedAt: null })));
  it("unapproved counselor cannot assign", () => assertFails(updateDoc(doc(as(env, "pendingCounselor"), "users/stu1"), { assignedCounselorId: "cou2" })));
});

describe("users - DELETE", () => {
  it("nobody can delete a profile, not even an admin", () => assertFails(deleteDoc(doc(as(env, "admin"), "users/stu1"))));
});
