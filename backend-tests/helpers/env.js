import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc } from "firebase/firestore";

const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");

export async function createEnv() {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");
  return initializeTestEnvironment({
    projectId: "demo-mindbridge",
    firestore: { rules, host, port: Number(port) },
  });
}

// The five principals every endpoint is tested against.
export const USERS = {
  student: { uid: "stu1", data: { name: "Ana Student", email: "ana@usa.edu.ph", role: "student", approved: true, active: true } },
  otherStudent: { uid: "stu2", data: { name: "Ben Student", email: "ben@usa.edu.ph", role: "student", approved: true, active: true } },
  counselor: { uid: "cou1", data: { name: "Dr. Cruz", email: "cruz@usa.edu.ph", role: "counselor", approved: true, active: true } },
  pendingCounselor: { uid: "cou2", data: { name: "Dr. Pending", email: "pending@usa.edu.ph", role: "counselor", approved: false, active: true } },
  admin: { uid: "adm1", data: { name: "Admin", email: "admin@usa.edu.ph", role: "admin", approved: true, active: true } },
  deactivated: { uid: "stu3", data: { name: "Gone Student", email: "gone@usa.edu.ph", role: "student", approved: true, active: false } },
};

export async function seedUsers(env) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const { uid, data } of Object.values(USERS)) await setDoc(doc(db, "users", uid), data);
  });
}

export async function seed(env, path, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

export const as = (env, key) => env.authenticatedContext(USERS[key].uid).firestore();
export const anon = (env) => env.unauthenticatedContext().firestore();
// Signed in with Firebase Auth but has no users/{uid} profile document.
export const noProfile = (env) => env.authenticatedContext("ghost").firestore();

export const slot = (over = {}) => ({
  counselorId: "cou1", counselorName: "Dr. Cruz",
  start: "2026-10-05T09:00:00.000Z", end: "2026-10-05T10:00:00.000Z",
  isBooked: false, createdAt: "2026-10-01T00:00:00.000Z", ...over,
});
export const assessment = (over = {}) => ({
  studentId: "stu1", studentName: "Ana Student", studentEmail: "ana@usa.edu.ph",
  answers: [1, 1, 0], questionSummary: [], total: 2, maxScore: 9, riskLevel: "low",
  flaggedForImmediateReview: false, status: "open", counselorNotes: "", createdAt: "2026-10-01T00:00:00.000Z", ...over,
});
export const appointment = (over = {}) => ({
  studentId: "stu1", studentName: "Ana Student", studentEmail: "ana@usa.edu.ph", slotId: "slot1",
  counselorId: "cou1", counselorName: "Dr. Cruz", title: "Session with Dr. Cruz",
  start: "2026-10-05T09:00:00.000Z", end: "2026-10-05T10:00:00.000Z", status: "Pending Review",
  createdAt: "2026-10-01T00:00:00.000Z", ...over,
});
export const message = (over = {}) => ({
  studentId: "stu1", senderId: "stu1", senderName: "Ana Student", senderRole: "student",
  text: "hello", timestamp: "2026-10-01T00:00:00.000Z", ...over,
});
