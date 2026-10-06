import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, where } from "firebase/firestore";
import { createEnv, seedUsers, seed, as, anon, slot, appointment, message } from "../helpers/env.js";

let env;
beforeAll(async () => { env = await createEnv(); });
afterAll(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await seedUsers(env);
  await seed(env, "availability/slot1", slot());
  await seed(env, "availability/slot2", slot({ counselorId: "adm1", counselorName: "Admin" }));
  await seed(env, "appointments/ap1", appointment());
  await seed(env, "appointments/ap2", appointment({ studentId: "stu2", studentName: "Ben" }));
  await seed(env, "messages/m1", message());
  await seed(env, "messages/m2", message({ studentId: "stu2", senderId: "stu2" }));
});

describe("availability - READ (getAvailability, getMyAvailability)", () => {
  it("student lists all slots", () => assertSucceeds(getDocs(collection(as(env, "student"), "availability"))));
  it("counselor lists own slots", () =>
    assertSucceeds(getDocs(query(collection(as(env, "counselor"), "availability"), where("counselorId", "==", "cou1")))));
  it("deactivated student cannot list", () => assertFails(getDocs(collection(as(env, "deactivated"), "availability"))));
  it("unauthenticated cannot list", () => assertFails(getDocs(collection(anon(env), "availability"))));
});

describe("availability - CREATE (addAvailability)", () => {
  it("slot cannot be created already booked", () => assertFails(addDoc(collection(as(env, "counselor"), "availability"), slot({ isBooked: true }))));
  it("slot cannot carry extra fields", () => assertFails(addDoc(collection(as(env, "counselor"), "availability"), slot({ note: "x" }))));
  it("counselor creates a slot for themselves", () => assertSucceeds(addDoc(collection(as(env, "counselor"), "availability"), slot())));
  it("admin creates a slot for themselves", () => assertSucceeds(addDoc(collection(as(env, "admin"), "availability"), slot({ counselorId: "adm1" }))));
  it("counselor cannot create a slot under another counselor's id", () => assertFails(addDoc(collection(as(env, "counselor"), "availability"), slot({ counselorId: "adm1" }))));
  it("student cannot create slots", () => assertFails(addDoc(collection(as(env, "student"), "availability"), slot({ counselorId: "stu1" }))));
  it("unapproved counselor cannot create slots", () => assertFails(addDoc(collection(as(env, "pendingCounselor"), "availability"), slot({ counselorId: "cou2" }))));
});

describe("availability - UPDATE (booking flips isBooked)", () => {
  it("student can set isBooked when booking", () => assertSucceeds(updateDoc(doc(as(env, "student"), "availability/slot1"), { isBooked: true })));
  it("student cannot book a slot that is already booked (no double booking)", async () => {
    await seed(env, "availability/slot1", slot({ isBooked: true }));
    await assertFails(updateDoc(doc(as(env, "student"), "availability/slot1"), { isBooked: true }));
  });
  it("student can free a slot when cancelling (isBooked -> false)", async () => {
    await seed(env, "availability/slot1", slot({ isBooked: true }));
    await assertSucceeds(updateDoc(doc(as(env, "student"), "availability/slot1"), { isBooked: false }));
  });
  it("student cannot set isBooked to a non-boolean", () => assertFails(updateDoc(doc(as(env, "student"), "availability/slot1"), { isBooked: "yes" })));
  it("student cannot alter times", () => assertFails(updateDoc(doc(as(env, "student"), "availability/slot1"), { start: "2030-01-01T00:00:00.000Z" })));
  it("student cannot reassign a slot to themselves", () => assertFails(updateDoc(doc(as(env, "student"), "availability/slot1"), { counselorId: "stu1" })));
  it("counselor can update a slot", () => assertSucceeds(updateDoc(doc(as(env, "counselor"), "availability/slot1"), { isBooked: true })));
});

describe("availability - DELETE (removeAvailability)", () => {
  it("owner counselor deletes own slot", () => assertSucceeds(deleteDoc(doc(as(env, "counselor"), "availability/slot1"))));
  it("counselor cannot delete another counselor's slot", () => assertFails(deleteDoc(doc(as(env, "counselor"), "availability/slot2"))));
  it("student cannot delete a slot", () => assertFails(deleteDoc(doc(as(env, "student"), "availability/slot1"))));
});

describe("appointments - CREATE (bookAppointment)", () => {
  it("student books for themselves", () => assertSucceeds(addDoc(collection(as(env, "student"), "appointments"), appointment())));
  it("a booking cannot carry fields the form does not write", () =>
    assertFails(addDoc(collection(as(env, "student"), "appointments"), appointment({ counselorNote: "pre-approved" }))));
  it("a booking cannot carry an oversized title", () =>
    assertFails(addDoc(collection(as(env, "student"), "appointments"), appointment({ title: "x".repeat(201) }))));
  it("student cannot book on behalf of another student", () => assertFails(addDoc(collection(as(env, "student"), "appointments"), appointment({ studentId: "stu2" }))));
  it("deactivated student cannot book", () => assertFails(addDoc(collection(as(env, "deactivated"), "appointments"), appointment({ studentId: "stu3" }))));
  it("unauthenticated cannot book", () => assertFails(addDoc(collection(anon(env), "appointments"), appointment())));
  it("a booking can only start as a pending request, never already confirmed or completed", async () => {
    for (const status of ["Confirmed", "Completed", "Rescheduled", "Declined"]) {
      await assertFails(addDoc(collection(as(env, "student"), "appointments"), appointment({ status })));
    }
  });
  it("a booking with no status at all is refused too", () => {
    const { status, ...withoutStatus } = appointment();
    return assertFails(addDoc(collection(as(env, "student"), "appointments"), withoutStatus));
  });
});

describe("appointments - READ (getAppointments, getAllAppointments)", () => {
  it("student reads own via filtered query", () =>
    assertSucceeds(getDocs(query(collection(as(env, "student"), "appointments"), where("studentId", "==", "stu1")))));
  it("student cannot read another student's appointment", () => assertFails(getDoc(doc(as(env, "student"), "appointments/ap2"))));
  it("student cannot run the unfiltered staff list", () => assertFails(getDocs(collection(as(env, "student"), "appointments"))));
  it("counselor lists all appointments", () => assertSucceeds(getDocs(collection(as(env, "counselor"), "appointments"))));
  it("unapproved counselor cannot list", () => assertFails(getDocs(collection(as(env, "pendingCounselor"), "appointments"))));
});

describe("appointments - UPDATE (updateAppointmentStatus)", () => {
  it("counselor confirms", () => assertSucceeds(updateDoc(doc(as(env, "counselor"), "appointments/ap1"), { status: "Confirmed", updatedAt: "x" })));
  it("counselor declines", () => assertSucceeds(updateDoc(doc(as(env, "counselor"), "appointments/ap1"), { status: "Declined", updatedAt: "x" })));
  it("student cancels own with a reason", () =>
    assertSucceeds(updateDoc(doc(as(env, "student"), "appointments/ap1"), { status: "Cancelled", updatedAt: "x", cancellationReason: "sick", cancelledBy: "student" })));
  it("counselor cannot rewrite who the appointment is for", () => assertFails(updateDoc(doc(as(env, "counselor"), "appointments/ap1"), { studentId: "stu2" })));
  it("counselor can save the details a status change carries", () =>
    assertSucceeds(updateDoc(doc(as(env, "counselor"), "appointments/ap1"), { status: "Rescheduled", updatedAt: "x", start: "s", end: "e", rescheduleReason: "r", counselorNote: "n" })));
  it("student cannot self-confirm", () => assertFails(updateDoc(doc(as(env, "student"), "appointments/ap1"), { status: "Confirmed", updatedAt: "x" })));
  it("student cannot cancel and also change other fields", () =>
    assertFails(updateDoc(doc(as(env, "student"), "appointments/ap1"), { status: "Cancelled", counselorId: "adm1" })));
  it("student cannot cancel someone else's appointment", () => assertFails(updateDoc(doc(as(env, "student"), "appointments/ap2"), { status: "Cancelled" })));
});

describe("appointments - DELETE", () => {
  it("nobody can delete", () => assertFails(deleteDoc(doc(as(env, "admin"), "appointments/ap1"))));
});

describe("messages - confidential chat (listenToStudentMessages, sendStudentMessage)", () => {
  it("student reads own thread", () =>
    assertSucceeds(getDocs(query(collection(as(env, "student"), "messages"), where("studentId", "==", "stu1")))));
  it("student cannot read another student's thread", () => assertFails(getDoc(doc(as(env, "student"), "messages/m2"))));
  it("counselor reads any thread", () =>
    assertSucceeds(getDocs(query(collection(as(env, "counselor"), "messages"), where("studentId", "==", "stu2")))));
  it("unapproved counselor cannot read threads", () => assertFails(getDoc(doc(as(env, "pendingCounselor"), "messages/m1"))));

  it("student posts to own thread", () => assertSucceeds(addDoc(collection(as(env, "student"), "messages"), message())));
  it("a message must have text, and at most 2000 characters (the chat form's own limit)", async () => {
    await assertFails(addDoc(collection(as(env, "student"), "messages"), message({ text: "" })));
    await assertFails(addDoc(collection(as(env, "student"), "messages"), message({ text: "x".repeat(2001) })));
    await assertFails(addDoc(collection(as(env, "student"), "messages"), message({ text: 42 })));
    await assertSucceeds(addDoc(collection(as(env, "student"), "messages"), message({ text: "x".repeat(2000) })));
  });
  it("a message cannot carry extra fields", () =>
    assertFails(addDoc(collection(as(env, "student"), "messages"), message({ pinned: true }))));
  it("student cannot post as a counselor or admin", async () => {
    await assertFails(addDoc(collection(as(env, "student"), "messages"), message({ senderRole: "counselor" })));
    await assertFails(addDoc(collection(as(env, "student"), "messages"), message({ senderRole: "admin" })));
    await assertFails(addDoc(collection(as(env, "student"), "messages"), message({ senderRole: "anything" })));
  });
  it("staff cannot post as a student", () =>
    assertFails(addDoc(collection(as(env, "counselor"), "messages"), message({ senderId: "cou1", senderRole: "student" }))));
  it("staff post with the role the app sends ('admin') as well as 'counselor'", async () => {
    await assertSucceeds(addDoc(collection(as(env, "counselor"), "messages"), message({ senderId: "cou1", senderRole: "admin" })));
    await assertSucceeds(addDoc(collection(as(env, "admin"), "messages"), message({ senderId: "adm1", senderRole: "admin" })));
  });
  it("student cannot post into another student's thread", () => assertFails(addDoc(collection(as(env, "student"), "messages"), message({ studentId: "stu2" }))));
  it("student cannot forge senderId", () => assertFails(addDoc(collection(as(env, "student"), "messages"), message({ senderId: "cou1" }))));
  it("counselor replies in a student's thread", () =>
    assertSucceeds(addDoc(collection(as(env, "counselor"), "messages"), message({ senderId: "cou1", senderRole: "counselor", senderName: "Dr. Cruz" }))));
  it("counselor cannot forge senderId", () => assertFails(addDoc(collection(as(env, "counselor"), "messages"), message({ senderId: "stu1" }))));
  it("unapproved counselor cannot reply", () =>
    assertFails(addDoc(collection(as(env, "pendingCounselor"), "messages"), message({ senderId: "cou2", senderRole: "counselor" }))));

  it("messages are immutable", async () => {
    await assertFails(updateDoc(doc(as(env, "student"), "messages/m1"), { text: "edited" }));
    await assertFails(updateDoc(doc(as(env, "admin"), "messages/m1"), { text: "edited" }));
  });
  it("messages cannot be deleted", () => assertFails(deleteDoc(doc(as(env, "admin"), "messages/m1"))));
});

describe("default deny", () => {
  it("unknown collections are closed to everyone", async () => {
    await assertFails(getDocs(collection(as(env, "admin"), "secrets")));
    await assertFails(addDoc(collection(as(env, "admin"), "secrets"), { a: 1 }));
  });
});
