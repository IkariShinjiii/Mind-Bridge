import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
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
export const submitResponse = async (answers) => {
  const uid = getCurrentUserId();
  const totalScore = answers.reduce((sum, val) => sum + (val || 0), 0);
  const riskLevel = totalScore >= 10 ? "high" : totalScore >= 5 ? "medium" : "low";

  return await addDoc(collection(db, "assessments"), {
    studentId: uid,
    answers,
    total: totalScore,
    maxScore: answers.length * 3,
    riskLevel,
    status: "open",
    createdAt: new Date().toISOString()
  });
};

export const getAssessments = async () => {
  const snapshot = await getDocs(collection(db, "assessments"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateAssessmentStatus = (id, status) => 
  updateDoc(doc(db, "assessments", id), { status, reviewedAt: new Date().toISOString() });

// --- APPOINTMENTS ---
export const bookAppointment = async () => {
  const uid = getCurrentUserId();
  return await addDoc(collection(db, "appointments"), {
    studentId: uid,
    title: "Counseling Session",
    status: "Pending Review",
    date: new Date(Date.now() + 86400000).toISOString(), // Mocks a date 1 day from now
    createdAt: new Date().toISOString()
  });
};

export const getAppointments = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  // Fetches only the appointments belonging to this specific student
  const q = query(collection(db, "appointments"), where("studentId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

export const addAvailability = async (date, time) => {
  const uid = getCurrentUserId();
  const authUser = getAuth().currentUser;
  return await addDoc(collection(db, "availability"), {
    counselorId: uid,
    counselorName: authUser?.displayName || "Counselor",
    date,
    time,
    isBooked: false,
    createdAt: new Date().toISOString()
  });
};

export const removeAvailability = async (id) => {
  return await deleteDoc(doc(db, "availability", id));
};