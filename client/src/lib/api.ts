import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  type DocumentData,
  type DocumentReference,
  type QuerySnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import { scoreAnswers, type QuestionLike } from "../utils/scoring";
import { AppError, toAppError } from "../utils/errors";
import type {
  Appointment,
  AppointmentStatus,
  Assessment,
  AvailabilitySlot,
  CaseStatus,
  ChatMessage,
  MessageSenderRole,
  UserProfile,
} from "../types";

/**
 * Data layer: every Firestore call the app makes lives here.
 *
 * Errors: every function rejects with an `AppError` (see utils/errors.ts). `message` keeps the original
 * technical text for logs, `code` is the app-level reason, `userMessage` is safe to show.
 * Validation of user input happens in the forms with the schemas in `lib/schemas`, not here.
 */

/** @returns uid of the signed-in user, if any */
const getCurrentUserId = (): string | undefined => getAuth().currentUser?.uid;

/** Runs a data-layer operation and converts anything it throws into an `AppError`. */
async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Maps a query result to `{ ...data, id }`. The id is spread last so a stored `id` field can never
 * replace the real document id.
 */
function mapDocs<T extends { id: string }>(snapshot: QuerySnapshot<DocumentData>): T[] {
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as unknown as T);
}

/** Builds a lookup of user profiles by uid, for enriching lists with names and emails. */
async function loadUsersById(): Promise<Record<string, UserProfile>> {
  const usersSnap = await getDocs(collection(db, "users"));
  const byId: Record<string, UserProfile> = {};
  usersSnap.forEach((u) => {
    byId[u.id] = u.data() as UserProfile;
  });
  return byId;
}

// --- USERS (ADMIN PANEL) ---

/** Lists every user profile (admin panel only; Firestore rules enforce who may read this). */
export const getAdminUsers = (): Promise<Array<UserProfile & { id: string }>> =>
  guard(async () => mapDocs<UserProfile & { id: string }>(await getDocs(collection(db, "users"))));

/** Marks a staff account as approved. */
export const approveCounselor = (id: string): Promise<void> =>
  guard(() => updateDoc(doc(db, "users", id), { approved: true }));
/** Marks a staff account as not approved. */
export const rejectCounselor = (id: string): Promise<void> =>
  guard(() => updateDoc(doc(db, "users", id), { approved: false }));
/** Blocks an account from logging in. */
export const deactivateUser = (id: string): Promise<void> =>
  guard(() => updateDoc(doc(db, "users", id), { active: false }));
/** Lets a deactivated account log in again. */
export const reactivateUser = (id: string): Promise<void> =>
  guard(() => updateDoc(doc(db, "users", id), { active: true }));

// --- ASSESSMENTS / SURVEYS ---

export interface SubmitOptions {
  questions?: ReadonlyArray<QuestionLike>;
  flaggedForImmediateReview?: boolean;
}

/**
 * Asks the optional alert route (`client/api/alert-high-risk.ts`) to email staff. Off unless
 * `VITE_ALERT_ENABLED` is "true". Fire and forget: it can never delay or fail a check-in.
 */
async function notifyHighRisk(assessmentId: string): Promise<void> {
  if (import.meta.env.VITE_ALERT_ENABLED !== "true") return;
  try {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) return;
    await fetch("/api/alert-high-risk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assessmentId }),
      keepalive: true,
    });
  } catch (error) {
    console.warn("High-risk alert request failed", error);
  }
}

/**
 * Scores and stores a check-in for the signed-in student.
 * @param answers - one 0-3 value per question (null counts as 0)
 */
export const submitResponse = (
  answers: ReadonlyArray<number | null>,
  options: SubmitOptions = {},
): Promise<Assessment> =>
  guard(async () => {
    const { questions = [], flaggedForImmediateReview: flaggedByCaller = false } = options;
    const authUser = getAuth().currentUser;
    const uid = authUser?.uid;

    const scored = scoreAnswers(answers, questions);
    const riskLevel = flaggedByCaller ? "high" : scored.riskLevel;
    const flaggedForImmediateReview = flaggedByCaller || scored.flaggedForImmediateReview;

    const payload: Omit<Assessment, "id"> = {
      studentId: uid || "anonymous",
      studentName: authUser?.displayName || authUser?.email?.split("@")[0] || "Student",
      studentEmail: authUser?.email || "No email",
      answers: [...answers],
      questionSummary: questions.map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        text: q.text ?? "",
        score: answers[idx] ?? null,
        isCrisisItem: !!q.isCrisisItem,
      })),
      total: scored.total,
      maxScore: scored.maxScore,
      riskLevel,
      flaggedForImmediateReview: !!flaggedForImmediateReview,
      status: "open",
      counselorNotes: "",
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "assessments"), payload);
    if (riskLevel === "high" || flaggedForImmediateReview) void notifyHighRisk(docRef.id);
    return { id: docRef.id, ...payload };
  });

/** Lists every check-in for staff, filling in missing student names and emails from the user profiles. */
export const getAssessments = (): Promise<Assessment[]> =>
  guard(async () => {
    const assessments = mapDocs<Assessment>(await getDocs(collection(db, "assessments")));

    try {
      const usersMap = await loadUsersById();
      return assessments.map((item) => {
        const userProfile = item.studentId ? usersMap[item.studentId] : undefined;
        let finalName: string | undefined = item.studentName;
        let finalEmail: string | undefined = item.studentEmail;

        if ((!finalName || finalName === "Unknown" || finalName === "Student") && userProfile?.name) {
          finalName = userProfile.name;
        }
        if ((!finalEmail || finalEmail === "No email" || finalEmail === "No email provided") && userProfile?.email) {
          finalEmail = userProfile.email;
        }

        return { ...item, studentName: finalName || "Student", studentEmail: finalEmail || "Institutional email" };
      });
    } catch (err) {
      console.warn("Could not enrich assessment names", err);
      return assessments;
    }
  });

/** Lists the signed-in student's own check-ins. Empty when nobody is signed in. */
export const getMyAssessments = (): Promise<Assessment[]> =>
  guard(async () => {
    const uid = getCurrentUserId();
    if (!uid) return [];
    const q = query(collection(db, "assessments"), where("studentId", "==", uid));
    return mapDocs<Assessment>(await getDocs(q));
  });

/**
 * Updates a case status and, optionally, the counselor notes.
 * @param counselorNotes - left unchanged when undefined; an empty string clears the notes
 */
export const updateAssessmentStatus = (
  id: string,
  status: CaseStatus | string,
  counselorNotes?: string,
): Promise<void> =>
  guard(() => {
    const updates: Record<string, string> = { status, reviewedAt: new Date().toISOString() };
    if (counselorNotes !== undefined) updates["counselorNotes"] = counselorNotes;
    return updateDoc(doc(db, "assessments", id), updates);
  });

// --- APPOINTMENTS ---

/** The parts of an availability slot needed to book it. */
export type BookingSlot = Partial<Pick<AvailabilitySlot, "id" | "counselorId" | "counselorName" | "start" | "end">>;

/**
 * Books an availability slot for the signed-in student and marks the slot as taken.
 * If creating the appointment fails after the slot was marked, the slot is released again (best effort).
 *
 * Known limit: two students holding the same stale slot list can still both book it, because the check and
 * the write are not one transaction. Closing that needs a Firestore transaction plus a rule on `isBooked`.
 */
export const bookAppointment = (slot?: BookingSlot): Promise<DocumentReference<DocumentData>> =>
  guard(async () => {
    const uid = getCurrentUserId();
    if (!uid) throw new AppError("unauthenticated", "Log in to continue.", { message: "No authenticated user" });
    const authUser = getAuth().currentUser;

    let realName = authUser?.displayName;
    let realEmail = authUser?.email;

    if (uid) {
      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          const udata = userDoc.data() as UserProfile;
          if (udata.name) realName = udata.name;
          if (udata.email) realEmail = udata.email;
        }
      } catch (e) {
        console.warn("Could not fetch user name for booking", e);
      }
    }

    const studentName = realName || authUser?.email?.split("@")[0] || "Student";
    const studentEmail = realEmail || authUser?.email || "";
    const createdAt = new Date().toISOString();

    if (!slot) {
      return addDoc(collection(db, "appointments"), {
        studentId: uid,
        studentName,
        studentEmail,
        slotId: null,
        title: "Counseling Session",
        status: "Pending Review",
        date: new Date(Date.now() + 86400000).toISOString(),
        createdAt,
      });
    }

    let slotMarked = false;
    if (slot.id) {
      try {
        await updateDoc(doc(db, "availability", slot.id), { isBooked: true });
        slotMarked = true;
      } catch (err) {
        console.warn("Notice: availability slot status not updated", err);
      }
    }

    try {
      return await addDoc(collection(db, "appointments"), {
        studentId: uid,
        studentName,
        studentEmail,
        slotId: slot.id || null,
        counselorId: slot.counselorId,
        counselorName: slot.counselorName || "Assigned Counselor",
        title: `Session with ${slot.counselorName || "Counselor"}`,
        start: slot.start,
        end: slot.end,
        status: "Pending Review",
        createdAt,
      });
    } catch (error) {
      if (slotMarked && slot.id) {
        // Do not leave the slot booked with no appointment behind it
        await updateDoc(doc(db, "availability", slot.id), { isBooked: false }).catch((e: unknown) =>
          console.warn("Could not release slot after failed booking", e),
        );
      }
      throw error;
    }
  });

/** Lists the signed-in student's appointments. Empty when nobody is signed in. */
export const getAppointments = (): Promise<Appointment[]> =>
  guard(async () => {
    const uid = getCurrentUserId();
    if (!uid) return [];
    const q = query(collection(db, "appointments"), where("studentId", "==", uid));
    return mapDocs<Appointment>(await getDocs(q));
  });

/** Lists every appointment for staff, with student names and emails filled in from user profiles. */
export const getAllAppointments = (): Promise<Appointment[]> =>
  guard(async () => {
    const appointments = mapDocs<Appointment>(await getDocs(collection(db, "appointments")));

    try {
      const usersMap = await loadUsersById();
      return appointments.map((apt) => {
        const userProfile = apt.studentId ? usersMap[apt.studentId] : undefined;
        let finalName: string | undefined = apt.studentName;
        let finalEmail: string | undefined = apt.studentEmail;

        if ((!finalName || finalName === "Student") && userProfile?.name) finalName = userProfile.name;
        if (!finalEmail && userProfile?.email) finalEmail = userProfile.email;

        return { ...apt, studentName: finalName || "Student", studentEmail: finalEmail || "" };
      });
    } catch (err) {
      console.warn("Could not enrich appointment names", err);
      return appointments;
    }
  });

/** Extra fields stored with a status change (reasons, new times, the slot to free). */
export type AppointmentExtra = Partial<
  Pick<
    Appointment,
    | "slotId"
    | "start"
    | "end"
    | "declineReason"
    | "cancellationReason"
    | "cancelledBy"
    | "rescheduleReason"
    | "counselorNote"
  >
>;

/**
 * Changes an appointment status. Declining or cancelling frees the linked availability slot.
 * @param status - e.g. "Confirmed", "Declined", "Cancelled", "Rescheduled"
 * @param extraData - extra fields to store (reason, new times, `slotId`)
 */
export const updateAppointmentStatus = (
  id: string,
  status: AppointmentStatus,
  extraData: AppointmentExtra = {},
): Promise<void> =>
  guard(async () => {
    const updates = { status, updatedAt: new Date().toISOString(), ...extraData };

    if ((status === "Declined" || status === "Cancelled") && extraData.slotId) {
      try {
        await updateDoc(doc(db, "availability", extraData.slotId), { isBooked: false });
      } catch (err) {
        console.warn("Could not unbook slot", err);
      }
    }

    await updateDoc(doc(db, "appointments", id), updates);
  });

// --- COUNSELOR AVAILABILITY ---

/** Lists every published counselor slot, booked or not. */
export const getAvailability = (): Promise<AvailabilitySlot[]> =>
  guard(async () => mapDocs<AvailabilitySlot>(await getDocs(collection(db, "availability"))));

/** Lists the signed-in counselor's own slots. */
export const getMyAvailability = (): Promise<AvailabilitySlot[]> =>
  guard(async () => {
    const uid = getCurrentUserId();
    if (!uid) return [];
    const q = query(collection(db, "availability"), where("counselorId", "==", uid));
    return mapDocs<AvailabilitySlot>(await getDocs(q));
  });

/**
 * Publishes an open slot for the signed-in counselor.
 * @param start - ISO or datetime-local string
 * @param end - ISO or datetime-local string
 */
export const addAvailability = (start: string, end: string): Promise<DocumentReference<DocumentData>> =>
  guard(() => {
    const authUser = getAuth().currentUser;
    return addDoc(collection(db, "availability"), {
      counselorId: getCurrentUserId(),
      counselorName: authUser?.displayName || "Counselor",
      start,
      end,
      isBooked: false,
      createdAt: new Date().toISOString(),
    });
  });

/** Deletes a slot. */
export const removeAvailability = (id: string): Promise<void> => guard(() => deleteDoc(doc(db, "availability", id)));

// --- USER PROFILE & SETTINGS ---

/**
 * Reads a user profile.
 * @param uid - defaults to the signed-in user
 * @returns null when there is no profile or no user
 */
export const getUserSettings = (uid?: string): Promise<(UserProfile & { id: string }) | null> =>
  guard(async () => {
    const targetUid = uid || getCurrentUserId();
    if (!targetUid) return null;
    const userDoc = await getDoc(doc(db, "users", targetUid));
    return userDoc.exists() ? { ...(userDoc.data() as UserProfile), id: userDoc.id } : null;
  });

/**
 * Merges fields into a user profile.
 * @param uid - defaults to the signed-in user
 * @throws {AppError} `unauthenticated` when nobody is signed in
 */
export const saveUserSettings = (uid: string | undefined, data: Partial<UserProfile>): Promise<void> =>
  guard(async () => {
    const targetUid = uid || getCurrentUserId();
    if (!targetUid) throw new AppError("unauthenticated", "Log in to continue.", { message: "No authenticated user" });
    await updateDoc(doc(db, "users", targetUid), { ...data });
  });

// --- COUNSELOR-STUDENT ASSIGNMENT ---

/** Assigns (or, with a falsy counselorId, clears) the counselor for a student. */
export const assignCounselorToStudent = (
  studentId: string,
  counselorId: string | null | undefined,
  counselorName: string | null | undefined,
): Promise<void> =>
  guard(() =>
    updateDoc(doc(db, "users", studentId), {
      assignedCounselorId: counselorId || null,
      assignedCounselorName: counselorName || null,
      assignedAt: counselorId ? new Date().toISOString() : null,
    }),
  );

// --- CONFIDENTIAL IN-APP MESSAGING / NOTES ---

/**
 * Subscribes to a student's chat thread, oldest message first.
 * @param studentId - the thread owner
 * @returns call to unsubscribe
 */
export const listenToStudentMessages = (
  studentId: string | null | undefined,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: AppError) => void,
): (() => void) => {
  if (!studentId) return () => {};
  try {
    const q = query(collection(db, "messages"), where("studentId", "==", studentId));
    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = mapDocs<ChatMessage>(snapshot);
        msgs.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
        onUpdate(msgs);
      },
      (err) => {
        console.error("Firestore onSnapshot message error:", err);
        onError?.(toAppError(err));
      },
    );
  } catch (err) {
    console.error("Failed to subscribe to messages", err);
    return () => {};
  }
};

export interface OutgoingMessage {
  studentId: string;
  senderId?: string | undefined;
  senderName?: string | undefined;
  senderRole?: MessageSenderRole | undefined;
  text: string;
}

/** Adds a message to a student's chat thread. Returns null when the text is empty. */
export const sendStudentMessage = ({
  studentId,
  senderId,
  senderName,
  senderRole,
  text,
}: OutgoingMessage): Promise<ChatMessage | null> =>
  guard(async () => {
    if (!studentId || !text?.trim()) return null;
    const payload: Omit<ChatMessage, "id"> = {
      studentId,
      senderId: senderId || getCurrentUserId(),
      senderName: senderName || (senderRole === "counselor" ? "Counselor" : "Student"),
      senderRole: senderRole || "student",
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, "messages"), payload);
    return { id: docRef.id, ...payload };
  });
