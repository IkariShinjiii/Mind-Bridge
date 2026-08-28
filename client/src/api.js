import { collection, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, doc, query, where, onSnapshot } from "firebase/firestore";
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

export const getAppointments = async () => {
  const uid = getCurrentUserId();
  if (!uid) return [];
  const q = query(collection(db, "appointments"), where("studentId", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Added so counselors can view all student bookings with enriched student names
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

// --- COUNSELOR-STUDENT ASSIGNMENT ---
export const assignCounselorToStudent = async (studentId, counselorId, counselorName) => {
  return await updateDoc(doc(db, "users", studentId), {
    assignedCounselorId: counselorId || null,
    assignedCounselorName: counselorName || null,
    assignedAt: counselorId ? new Date().toISOString() : null,
  });
};

// --- CONFIDENTIAL IN-APP MESSAGING / NOTES ---
// Real-time synchronization tied directly to the student's ID
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