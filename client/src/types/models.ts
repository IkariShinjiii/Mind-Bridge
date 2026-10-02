/** A date as stored in Firestore documents: ISO string in most collections, a Timestamp for `users.createdAt`. */
export type StoredDate = string | number | Date | { toDate(): Date } | null | undefined;

/** Roles stored on `users/{uid}.role`. `counselor` is treated as `admin` once loaded (see AuthProvider). */
export type StoredRole = "student" | "counselor" | "admin";
/** Roles used inside the app after normalisation. */
export type UserRole = "student" | "admin";

export type RiskLevel = "low" | "medium" | "high";
export type CaseStatus = "open" | "reviewed" | "escalated";

/** Free text from the database; known values are listed so comparisons stay checked. */
export type AppointmentStatus =
  "Pending Review" | "Confirmed" | "Rescheduled" | "Completed" | "Declined" | "Cancelled" | (string & {});

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone: string;
  notes: string;
}

/** Document in `users/{uid}`. */
export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  role: StoredRole | UserRole;
  approved?: boolean;
  active?: boolean;
  emailVerified?: boolean;
  createdAt?: StoredDate;
  updatedAt?: string;
  phone?: string;
  bio?: string;
  avatarGradient?: string;
  useGoogleAvatar?: boolean;
  emergencyContact?: Partial<EmergencyContact>;
  wellnessGoals?: string[];
  assignedCounselorId?: string | null;
  assignedCounselorName?: string | null;
  assignedAt?: string | null;
}

/** One answered row of a check-in. */
export interface QuestionSummary {
  id: string;
  text: string;
  score: number | null;
  isCrisisItem: boolean;
}

/** Question definition shown in the check-in. */
export interface ScreeningQuestion {
  id: string;
  text: string;
  subtext: string;
  isCrisisItem: boolean;
}

/** Document in `assessments/{id}`. */
export interface Assessment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  answers: Array<number | null>;
  questionSummary: QuestionSummary[];
  total: number;
  maxScore: number;
  riskLevel: RiskLevel;
  flaggedForImmediateReview: boolean;
  status: CaseStatus;
  counselorNotes: string;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  /** Older documents used these names for the student id. */
  userId?: string;
  student?: string;
  user?: string;
  assignedCounselorId?: string;
  /** Set by the staff dashboard (never stored) when the saved risk level or safety flag was lower than the answers justify. */
  riskCorrectedFrom?: RiskLevel;
}

/** Document in `appointments/{id}`. */
export interface Appointment {
  id: string;
  studentId?: string;
  studentName: string;
  studentEmail: string;
  slotId: string | null;
  counselorId?: string;
  counselorName?: string;
  title: string;
  start?: string;
  end?: string | null;
  date?: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt?: string;
  declineReason?: string;
  cancellationReason?: string;
  cancelledBy?: "counselor" | "student";
  rescheduleReason?: string;
  counselorNote?: string;
}

/** Document in `availability/{id}`: a slot a counselor has published. */
export interface AvailabilitySlot {
  id: string;
  counselorId: string | undefined;
  counselorName: string;
  start: string;
  end: string;
  isBooked: boolean;
  createdAt: string;
  /** Older documents used these names. */
  date?: string;
  time?: string;
  to?: string;
}

export type MessageSenderRole = "student" | "counselor" | "admin";

/** Document in `messages/{id}`. */
export interface ChatMessage {
  id: string;
  studentId: string;
  senderId: string | undefined;
  senderName: string;
  senderRole: MessageSenderRole;
  text: string;
  timestamp: string;
}
