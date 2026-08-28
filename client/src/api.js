import { collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "./firebase"; 

// Helper to get the currently logged-in user
const getCurrentUserId = () => getAuth().currentUser?.uid;

// --- USERS (ADMIN PANEL) ---
export const getAdminUsers = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const approveCounselor = (id) => updateDoc(doc(db, "users", id), { approved: true });
export const rejectCounselor = (id) => updateDoc(doc(db, "users", id), { approved: false });
export const deactivateUser = (id) => updateDoc(doc(db, "users", id), { active: false });
export const reactivateUser = (id) => updateDoc(doc(db, "users", id), { active: true });

// --- ASSESSMENTS / SURVEYS ---
export const submitResponse = async (answers, { questions = [], flaggedForImmediateReview = false } = {}) => {
  const authUser = getAuth().currentUser;
  const uid = authUser?.uid;
  
  const totalScore = answers.reduce((sum, val) => sum + (Number(val) || 0), 0);
  const maxScore = (questions.length || answers.length || 7) * 3;
  
  let riskLevel = "low";
  if (flaggedForImmediateReview || totalScore >= maxScore * 0.6) {
    riskLevel = "high";
  } else if (totalScore >= maxScore * 0.3) {
    riskLevel = "medium";
  }

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

export const getAssessments = async () => {
  const snapshot = await getDocs(collection(db, "assessments"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getMyAssessments = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  const q = query(collection(db, "assessments"), where("studentId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAssessmentStatus = (id, status, counselorNotes) => {
  const updates = { status, reviewedAt: new Date().toISOString() };
  if (counselorNotes !== undefined) updates.counselorNotes = counselorNotes;
  return updateDoc(doc(db, "assessments", id), updates);
};

// --- APPOINTMENTS ---
export const bookAppointment = async (slot) => {
  const uid = getCurrentUserId();
  const authUser = getAuth().currentUser;
  
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
      studentName: authUser?.displayName || authUser?.email?.split("@")[0] || "Student",
      studentEmail: authUser?.email || "",
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
    studentName: authUser?.displayName || authUser?.email?.split("@")[0] || "Student",
    studentEmail: authUser?.email || "",
    title: "Counseling Session",
    status: "Pending Review",
    date: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString()
  });
};

export const getAppointments = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  const q = query(collection(db, "appointments"), where("studentId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Added so counselors can view all student bookings
export const getAllAppointments = async () => {
  const snapshot = await getDocs(collection(db, "appointments"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAppointmentStatus = async (id, status) => {
  return await updateDoc(doc(db, "appointments", id), { status });
};

// --- COUNSELOR AVAILABILITY ---
export const getAvailability = async () => {
  const snapshot = await getDocs(collection(db, "availability"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getMyAvailability = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  const q = query(collection(db, "availability"), where("counselorId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

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

export const removeAvailability = async (id) => {
  return await deleteDoc(doc(db, "availability", id));
};

// --- USER PROFILE & SETTINGS ---
export const getUserSettings = async (uid) => {
  const targetUid = uid || getCurrentUserId();
  if (!targetUid) return null;
  const userDoc = await getDoc(doc(db, "users", targetUid));
  return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
};

export const saveUserSettings = async (uid, data) => {
  const targetUid = uid || getCurrentUserId();
  if (!targetUid) throw new Error("No authenticated user");
  return await updateDoc(doc(db, "users", targetUid), data);
};