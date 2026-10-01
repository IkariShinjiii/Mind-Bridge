import { collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase";
import { scoreAnswers } from "./scoring";

/** @returns {string|undefined} uid of the signed-in user, if any */
const getCurrentUserId = () => getAuth().currentUser?.uid;

// --- USERS (ADMIN PANEL) ---
/**
 * Lists every user profile (admin panel only; Firestore rules enforce who may read this).
 * @returns {Promise<Array<object>>} user documents with their `id`
 */
export const getAdminUsers = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/** Marks a staff account as approved. @param {string} id - user uid @returns {Promise<void>} */
export const approveCounselor = (id) => updateDoc(doc(db, "users", id), { approved: true });
/** Marks a staff account as not approved. @param {string} id - user uid @returns {Promise<void>} */
export const rejectCounselor = (id) => updateDoc(doc(db, "users", id), { approved: false });
/** Blocks an account from logging in. @param {string} id - user uid @returns {Promise<void>} */
export const deactivateUser = (id) => updateDoc(doc(db, "users", id), { active: false });
/** Lets a deactivated account log in again. @param {string} id - user uid @returns {Promise<void>} */
export const reactivateUser = (id) => updateDoc(doc(db, "users", id), { active: true });

// --- ASSESSMENTS / SURVEYS ---
/**
 * Scores and stores a check-in for the signed-in student.
 * @param {Array<number|null>} answers - one 0-3 value per question
 * @param {{ questions?: Array<object>, flaggedForImmediateReview?: boolean }} [options]
 * @returns {Promise<object>} the saved assessment, including `id`, `total`, `riskLevel`
 */
export const submitResponse = async (answers, { questions = [], flaggedForImmediateReview = false } = {}) => {
  const authUser = getAuth().currentUser;
  const uid = authUser?.uid;
  
  const scored = scoreAnswers(answers, questions);
  const totalScore = scored.total;
  const maxScore = scored.maxScore;
  const riskLevel = flaggedForImmediateReview ? "high" : scored.riskLevel;
  flaggedForImmediateReview = flaggedForImmediateReview || scored.flaggedForImmediateReview;

  const payload = {
    studentId: uid || "anonymous",
    studentName: authUser?.displayName || authUser?.email?.split("@")[0] || "Student",
    studentEmail: authUser?.email || "No email",
    answers,
    questionSummary: questions.map((q, idx) => ({
      id: q.id || `q${idx + 1}`,
      text: q.text,
      score: answers[idx] ?? null,
      isCrisisItem: !!q.isCrisisItem
    })),
    total: totalScore,
    maxScore,
    riskLevel,
    flaggedForImmediateReview: !!flaggedForImmediateReview,
    status: "open",
    counselorNotes: "",
    createdAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "assessments"), payload);
  return { id: docRef.id, ...payload };
};

/**
 * Lists every check-in for staff, filling in missing student names and emails from the user profiles.
 * @returns {Promise<Array<object>>}
 */
export const getAssessments = async () => {
  const snapshot = await getDocs(collection(db, "assessments"));
  const assessments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap = {};
    usersSnap.forEach(u => {
      usersMap[u.id] = u.data();
    });

    return assessments.map(item => {
      const userProfile = item.studentId ? usersMap[item.studentId] : null;
      let finalName = item.studentName;
      let finalEmail = item.studentEmail;

      if ((!finalName || finalName === "Unknown" || finalName === "Student") && userProfile?.name) {
        finalName = userProfile.name;
      }
      if ((!finalEmail || finalEmail === "No email" || finalEmail === "No email provided") && userProfile?.email) {
        finalEmail = userProfile.email;
      }

      return {
        ...item,
        studentName: finalName || "Student",
        studentEmail: finalEmail || "Institutional email",
      };
    });
  } catch (err) {
    console.warn("Could not enrich assessment names", err);
    return assessments;
  }
};

/**
 * Lists the signed-in student's own check-ins.
 * @returns {Promise<Array<object>>} empty when nobody is signed in
 */
export const getMyAssessments = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  const q = query(collection(db, "assessments"), where("studentId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Updates a case status and, optionally, the counselor notes.
 * @param {string} id - assessment id
 * @param {string} status - "open" | "reviewed" | "escalated"
 * @param {string} [counselorNotes] - left unchanged when undefined
 * @returns {Promise<void>}
 */
export const updateAssessmentStatus = (id, status, counselorNotes) => {
  const updates = { status, reviewedAt: new Date().toISOString() };
  if (counselorNotes !== undefined) updates.counselorNotes = counselorNotes;
  return updateDoc(doc(db, "assessments", id), updates);
};

// --- APPOINTMENTS ---
/**
 * Books an availability slot for the signed-in student and marks the slot as taken.
 * @param {{ id?: string, counselorId?: string, counselorName?: string, start?: string, end?: string }} [slot]
 * @returns {Promise<import("firebase/firestore").DocumentReference>}
 */
export const bookAppointment = async (slot) => {
  const uid = getCurrentUserId();
  const authUser = getAuth().currentUser;

  let realName = authUser?.displayName;
  let realEmail = authUser?.email;

  if (uid) {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const udata = userDoc.data();
        if (udata.name) realName = udata.name;
        if (udata.email) realEmail = udata.email;
      }
    } catch (e) {
      console.warn("Could not fetch user name for booking", e);
    }
  }

  const studentName = realName || authUser?.email?.split("@")[0] || "Student";
  const studentEmail = realEmail || authUser?.email || "";
  
  if (slot) {
    // If a specific slot was booked, mark the slot as booked
    if (slot.id) {
      try {
        await updateDoc(doc(db, "availability", slot.id), { isBooked: true });
      } catch (err) {
        console.warn("Notice: availability slot status not updated", err);
      }
    }

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
      createdAt: new Date().toISOString()
    });
  }

  return await addDoc(collection(db, "appointments"), {
    studentId: uid,
    studentName,
    studentEmail,
    slotId: null,
    title: "Counseling Session",
    status: "Pending Review",
    date: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString()
  });
};

/**
 * Lists the signed-in student's appointments.
 * @returns {Promise<Array<object>>} empty when nobody is signed in
 */
export const getAppointments = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  const q = query(collection(db, "appointments"), where("studentId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Added so counselors can view all student bookings with enriched student names
/**
 * Lists every appointment for staff, with student names and emails filled in from user profiles.
 * @returns {Promise<Array<object>>}
 */
export const getAllAppointments = async () => {
  const snapshot = await getDocs(collection(db, "appointments"));
  const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const usersMap = {};
    usersSnap.forEach(u => {
      usersMap[u.id] = u.data();
    });

    return appointments.map(apt => {
      const userProfile = apt.studentId ? usersMap[apt.studentId] : null;
      let finalName = apt.studentName;
      let finalEmail = apt.studentEmail;

      if ((!finalName || finalName === "Student") && userProfile?.name) {
        finalName = userProfile.name;
      }
      if (!finalEmail && userProfile?.email) {
        finalEmail = userProfile.email;
      }

      return {
        ...apt,
        studentName: finalName || "Student",
        studentEmail: finalEmail || "",
      };
    });
  } catch (err) {
    console.warn("Could not enrich appointment names", err);
    return appointments;
  }
};

/**
 * Changes an appointment status. Declining or cancelling frees the linked availability slot.
 * @param {string} id - appointment id
 * @param {string} status - e.g. "Confirmed", "Declined", "Cancelled", "Rescheduled"
 * @param {object} [extraData] - extra fields to store (reason, new times, `slotId`)
 * @returns {Promise<void>}
 */
export const updateAppointmentStatus = async (id, status, extraData = {}) => {
  const updates = { 
    status, 
    updatedAt: new Date().toISOString(),
    ...extraData 
  };

  // If slot was linked and is being declined or cancelled, free up availability slot
  if ((status === "Declined" || status === "Cancelled") && extraData.slotId) {
    try {
      await updateDoc(doc(db, "availability", extraData.slotId), { isBooked: false });
    } catch (err) {
      console.warn("Could not unbook slot", err);
    }
  }

  return await updateDoc(doc(db, "appointments", id), updates);
};

// --- COUNSELOR AVAILABILITY ---
/**
 * Lists every published counselor slot, booked or not.
 * @returns {Promise<Array<object>>}
 */
export const getAvailability = async () => {
  const snapshot = await getDocs(collection(db, "availability"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Lists the signed-in counselor's own slots.
 * @returns {Promise<Array<object>>}
 */
export const getMyAvailability = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  const q = query(collection(db, "availability"), where("counselorId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Publishes an open slot for the signed-in counselor.
 * @param {string} start - ISO or datetime-local string
 * @param {string} end - ISO or datetime-local string
 * @returns {Promise<import("firebase/firestore").DocumentReference>}
 */
export const addAvailability = async (start, end) => {
  const uid = getCurrentUserId();
  const authUser = getAuth().currentUser;
  return await addDoc(collection(db, "availability"), {
    counselorId: uid,
    counselorName: authUser?.displayName || "Counselor",
    start,
    end,
    isBooked: false,
    createdAt: new Date().toISOString()
  });
};

/** Deletes a slot. @param {string} id - availability id @returns {Promise<void>} */
export const removeAvailability = async (id) => {
  return await deleteDoc(doc(db, "availability", id));
};

// --- USER PROFILE & SETTINGS ---
/**
 * Reads a user profile.
 * @param {string} [uid] - defaults to the signed-in user
 * @returns {Promise<object|null>} null when there is no profile or no user
 */
export const getUserSettings = async (uid) => {
  const targetUid = uid || getCurrentUserId();
  if (!targetUid) return null;
  const userDoc = await getDoc(doc(db, "users", targetUid));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
};

/**
 * Merges fields into a user profile.
 * @param {string} [uid] - defaults to the signed-in user
 * @param {object} data - fields to update
 * @returns {Promise<void>}
 * @throws {Error} when nobody is signed in
 */
export const saveUserSettings = async (uid, data) => {
  const targetUid = uid || getCurrentUserId();
  if (!targetUid) throw new Error("No authenticated user");
  return await updateDoc(doc(db, "users", targetUid), data);
};

// --- COUNSELOR-STUDENT ASSIGNMENT ---
/**
 * Assigns (or, with a falsy counselorId, clears) the counselor for a student.
 * @param {string} studentId
 * @param {string|null} counselorId
 * @param {string|null} counselorName
 * @returns {Promise<void>}
 */
export const assignCounselorToStudent = async (studentId, counselorId, counselorName) => {
  return await updateDoc(doc(db, "users", studentId), {
    assignedCounselorId: counselorId || null,
    assignedCounselorName: counselorName || null,
    assignedAt: counselorId ? new Date().toISOString() : null,
  });
};

// --- CONFIDENTIAL IN-APP MESSAGING / NOTES ---
// Real-time synchronization tied directly to the student's ID
/**
 * Subscribes to a student's chat thread, oldest message first.
 * @param {string} studentId - the thread owner
 * @param {(messages: Array<object>) => void} onUpdate
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} call to unsubscribe
 */
export const listenToStudentMessages = (studentId, onUpdate, onError) => {
  if (!studentId) return () => {};
  try {
    const q = query(
      collection(db, "messages"),
      where("studentId", "==", studentId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        msgs.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        onUpdate(msgs);
      },
      (err) => {
        console.error("Firestore onSnapshot message error:", err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.error("Failed to subscribe to messages", err);
    return () => {};
  }
};

/**
 * Adds a message to a student's chat thread.
 * @param {{ studentId: string, senderId?: string, senderName?: string, senderRole?: string, text: string }} message
 * @returns {Promise<object|null>} the saved message, or null when the text is empty
 */
export const sendStudentMessage = async ({
  studentId,
  senderId,
  senderName,
  senderRole,
  text,
}) => {
  if (!studentId || !text?.trim()) return null;
  const payload = {
    studentId,
    senderId: senderId || getCurrentUserId(),
    senderName: senderName || (senderRole === "counselor" ? "Counselor" : "Student"),
    senderRole: senderRole || "student",
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };
  const docRef = await addDoc(collection(db, "messages"), payload);
  return { id: docRef.id, ...payload };
};