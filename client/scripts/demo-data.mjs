// Demo data for the presentation: fake students, staff, check-ins, slots, appointments and chat.
// Pure (no Firebase) so it can be unit-tested; scripts/seed-demo.mjs writes it. Every id starts with "demo-" and
// every email uses the reserved .test domain, so the data is easy to spot and to remove again.

export const DEMO_DOMAIN = "demo.mindbridge.test";
export const DEMO_PREFIX = "demo-";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MANILA_OFFSET = 8 * HOUR;
const pad = (n) => String(n).padStart(2, "0");

// Same wording as the check-in screens (StudentDashboard.tsx and lib/fullQuestions.ts)
const QUICK = [
  "Little interest or pleasure in doing academic or daily activities",
  "Feeling down, depressed, overwhelmed, or hopeless",
  "Trouble falling or staying asleep, or sleeping excessively",
  "Feeling nervous, anxious, or constantly on edge",
  "Not being able to stop or control worrying",
  "Trouble concentrating on lectures, schoolwork, or reading",
  "Thoughts that you would be better off not around, or hurting yourself in some way",
];
const FULL = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself, or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading or watching television",
  "Moving or speaking so slowly that other people could have noticed, or the opposite: being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

/** Same rule as utils/scoring.ts: high from 60% or a crisis answer, medium from 30%; the full check-in also uses the PHQ-9 / GAD-7 bands. */
function score(answers, crisisIndex) {
  const total = answers.reduce((a, b) => a + b, 0);
  const maxScore = answers.length * 3;
  const flagged = answers[crisisIndex] > 0;
  let risk = flagged || total >= maxScore * 0.6 ? "high" : total >= maxScore * 0.3 ? "medium" : "low";
  if (answers.length === 16) {
    const phq = answers.slice(0, 9).reduce((a, b) => a + b, 0);
    const gad = answers.slice(9).reduce((a, b) => a + b, 0);
    const band = (s) => (s >= 15 ? "high" : s >= 10 ? "medium" : "low");
    const rank = { low: 0, medium: 1, high: 2 };
    for (const b of [band(phq), band(gad)]) if (rank[b] > rank[risk]) risk = b;
  }
  return { total, maxScore, riskLevel: risk, flaggedForImmediateReview: flagged };
}

/** A datetime-local style string ("2026-11-02T10:00") in Manila time, `days` from today. */
function slotTime(now, days, hour) {
  const d = new Date(now.getTime() + MANILA_OFFSET + days * DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(hour)}:00`;
}
const isWeekday = (now, days) => {
  const dow = new Date(now.getTime() + MANILA_OFFSET + days * DAY).getUTCDay();
  return dow !== 0 && dow !== 6;
};

const STUDENTS = [
  { key: "maria", name: "Maria Santos" },
  { key: "jon", name: "Jon Reyes" },
  { key: "angela", name: "Angela Cruz" },
  { key: "paolo", name: "Paolo Dizon" },
  { key: "bea", name: "Bea Lim" },
  { key: "carlo", name: "Carlo Tan" },
];
const STAFF = [
  { key: "admin", name: "Demo Admin", role: "admin", approved: true },
  { key: "villanueva", name: "Dr. Ramon Villanueva", role: "counselor", approved: true },
  { key: "gomez", name: "Liza Gomez", role: "counselor", approved: false },
];

const emailOf = (key) => `${key}@${DEMO_DOMAIN}`;
export const uidOf = (kind, key) => `${DEMO_PREFIX}${kind}-${key}`;

/** Everything the seed script writes, with dates relative to `now`. Same `now` gives the same output. */
export function buildDemoData(now = new Date()) {
  const ago = (days, hours = 0) => new Date(now.getTime() - days * DAY - hours * HOUR).toISOString();
  const counselor = { id: uidOf("staff", "villanueva"), name: "Dr. Ramon Villanueva" };

  const users = [
    ...STAFF.map((s) => ({
      id: uidOf("staff", s.key),
      name: s.name,
      email: emailOf(s.key),
      role: s.role,
      approved: s.approved,
      active: true,
      emailVerified: true,
      createdAt: new Date(now.getTime() - 60 * DAY),
    })),
    ...STUDENTS.map((s) => ({
      id: uidOf("student", s.key),
      name: s.name,
      email: emailOf(s.key),
      role: "student",
      approved: true,
      active: true,
      emailVerified: true,
      createdAt: new Date(now.getTime() - 45 * DAY),
    })),
  ];
  const user = (key) => users.find((u) => u.id === uidOf("student", key));
  Object.assign(user("maria"), {
    phone: "0917 123 4567",
    bio: "BS Psychology, 3rd year. Trying to build better habits.",
    wellnessGoals: ["Sleep before midnight", "Walk for 20 minutes", "Message a friend each week"],
    emergencyContact: {
      name: "Elena Santos",
      relationship: "Mother",
      phone: "0917 765 4321",
      alternatePhone: "",
      notes: "",
    },
  });
  for (const key of ["maria", "angela"]) {
    Object.assign(user(key), {
      assignedCounselorId: counselor.id,
      assignedCounselorName: counselor.name,
      assignedAt: ago(30),
    });
  }

  // --- check-ins -----------------------------------------------------------------------------------------
  const assessments = [];
  const addCheckIn = (key, n, daysAgo, hoursAgo, answers, extra = {}) => {
    const u = user(key);
    const questions = answers.length === 16 ? FULL : QUICK;
    const crisisIndex = answers.length === 16 ? 8 : 6;
    const createdAt = ago(daysAgo, hoursAgo);
    assessments.push({
      id: `${DEMO_PREFIX}checkin-${key}-${n}`,
      studentId: u.id,
      studentName: u.name,
      studentEmail: u.email,
      answers,
      questionSummary: questions.map((text, i) => ({
        id: answers.length === 16 ? (i < 9 ? `phq9-${i + 1}` : `gad7-${i - 8}`) : `q${i + 1}`,
        text,
        score: answers[i],
        isCrisisItem: i === crisisIndex,
      })),
      ...score(answers, crisisIndex),
      status: "open",
      counselorNotes: "",
      createdAt,
      ...extra,
    });
  };

  // Maria: eight weekly check-ins that steadily improve (the trend card and "what's going well" have data)
  [
    [2, 2, 2, 2, 1, 2, 0],
    [2, 2, 2, 2, 2, 2, 0],
    [2, 2, 1, 2, 2, 1, 0],
    [1, 2, 1, 2, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 1, 0],
    [0, 1, 1, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 0, 0],
  ].forEach((answers, i, all) => addCheckIn("maria", i + 1, (all.length - 1 - i) * 7 + 1, 2 + (i % 4), answers));

  // Jon: a fresh high-risk case with a safety answer, in the triage queue and not yet assigned
  addCheckIn("jon", 1, 14, 3, [2, 2, 1, 2, 2, 2, 0]);
  addCheckIn("jon", 2, 0, 3, [2, 3, 2, 3, 3, 3, 1], { alertSentAt: ago(0, 3) });

  // Angela: an escalated case from last week, reviewed and followed up since
  addCheckIn("angela", 1, 12, 5, [3, 3, 2, 2, 2, 2, 1], {
    status: "escalated",
    reviewedAt: ago(12, 2),
    counselorNotes:
      "Contacted the same day. Student is staying with a relative and has agreed to weekly sessions. Referred to the campus clinic for sleep concerns.",
    alertSentAt: ago(12, 5),
  });
  addCheckIn("angela", 2, 5, 4, [2, 2, 2, 2, 2, 1, 0], {
    status: "reviewed",
    reviewedAt: ago(4, 20),
    counselorNotes: "Session completed. Sleep is a little better; plan to repeat the check-in in two weeks.",
  });

  // Paolo: the optional full check-in (PHQ-9 + GAD-7)
  addCheckIn("paolo", 1, 1, 6, [2, 2, 2, 2, 1, 1, 2, 0, 0, 2, 1, 2, 2, 1, 1, 0]);

  // Bea: getting worse over four check-ins
  [
    [0, 1, 0, 1, 0, 0, 0],
    [1, 1, 1, 1, 0, 1, 0],
    [2, 2, 1, 2, 1, 1, 0],
    [2, 2, 2, 2, 2, 2, 0],
  ].forEach((answers, i, all) => addCheckIn("bea", i + 1, (all.length - 1 - i) * 7 + 2, 1 + i, answers));

  // Carlo: steady and fine
  addCheckIn("carlo", 1, 9, 4, [0, 0, 1, 0, 0, 1, 0]);
  addCheckIn("carlo", 2, 2, 5, [0, 1, 0, 0, 0, 0, 0]);

  // Only each student's latest check-in is still waiting; a counselor has already looked at the older ones
  for (const a of assessments) {
    const latest = assessments
      .filter((x) => x.studentId === a.studentId)
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0];
    if (a !== latest && a.status === "open") {
      a.status = "reviewed";
      a.reviewedAt = new Date(new Date(a.createdAt).getTime() + DAY).toISOString();
    }
  }

  // --- WHO-5 wellbeing -----------------------------------------------------------------------------------
  const wellbeing = [];
  const addWellbeing = (key, n, daysAgo, answers) =>
    wellbeing.push({
      id: `${DEMO_PREFIX}who5-${key}-${n}`,
      studentId: uidOf("student", key),
      answers,
      score: answers.reduce((a, b) => a + b, 0) * 4,
      createdAt: ago(daysAgo, 3),
    });
  addWellbeing("maria", 1, 40, [2, 2, 2, 3, 2]);
  addWellbeing("maria", 2, 20, [3, 3, 2, 3, 3]);
  addWellbeing("maria", 3, 3, [3, 4, 3, 4, 3]);
  addWellbeing("jon", 1, 0, [1, 1, 2, 2, 1]);
  addWellbeing("bea", 1, 6, [2, 3, 2, 2, 2]);

  // --- open slots for the next two weeks (weekdays; 9, 10, 2 and 3 pm) ---------------------------------
  const availability = [];
  const weekdays = [];
  for (let d = 1; d <= 14; d += 1) if (isWeekday(now, d)) weekdays.push(d);
  for (const d of weekdays) {
    for (const hour of [9, 10, 14, 15]) {
      availability.push({
        id: `${DEMO_PREFIX}slot-${d}-${hour}`,
        counselorId: counselor.id,
        counselorName: counselor.name,
        start: slotTime(now, d, hour),
        end: slotTime(now, d, hour + 1),
        isBooked: false,
        createdAt: ago(1),
      });
    }
  }
  const slot = (d, hour) => availability.find((s) => s.id === `${DEMO_PREFIX}slot-${d}-${hour}`);

  // --- appointments in every status ----------------------------------------------------------------------
  const appointments = [];
  const addAppointment = (key, n, fields) => {
    const u = user(key);
    appointments.push({
      id: `${DEMO_PREFIX}appt-${key}-${n}`,
      studentId: u.id,
      studentName: u.name,
      studentEmail: u.email,
      counselorId: counselor.id,
      counselorName: counselor.name,
      title: `Session with ${counselor.name}`,
      slotId: null,
      createdAt: ago(2),
      ...fields,
    });
  };
  const bookSlot = (key, n, d, hour, status, extra = {}) => {
    const s = slot(d, hour);
    s.isBooked = true;
    addAppointment(key, n, { slotId: s.id, start: s.start, end: s.end, status, ...extra });
  };
  bookSlot("maria", 1, weekdays[0], 10, "Confirmed", { updatedAt: ago(1) });
  bookSlot("bea", 1, weekdays[1], 14, "Pending Review");
  addAppointment("angela", 1, {
    start: slotTime(now, -6, 10),
    end: slotTime(now, -6, 11),
    status: "Completed",
    counselorNote: "Reviewed sleep routine and coping plan. Follow-up check-in in two weeks.",
    updatedAt: ago(6),
  });
  addAppointment("carlo", 1, {
    start: slotTime(now, -4, 14),
    end: slotTime(now, -4, 15),
    status: "Cancelled",
    cancelledBy: "student",
    cancellationReason: "I have a lab exam that afternoon.",
    updatedAt: ago(5),
  });

  // --- chat ----------------------------------------------------------------------------------------------
  const messages = [];
  const say = (key, n, who, text, daysAgo, hoursAgo) => {
    const student = user(key);
    const fromStudent = who === "student";
    messages.push({
      id: `${DEMO_PREFIX}msg-${key}-${n}`,
      studentId: student.id,
      senderId: fromStudent ? student.id : counselor.id,
      senderName: fromStudent ? student.name : counselor.name,
      senderRole: fromStudent ? "student" : "admin",
      text,
      timestamp: ago(daysAgo, hoursAgo),
    });
  };
  say(
    "maria",
    1,
    "student",
    "Hi Dr. Villanueva, I booked a session for this week. Is there anything I should prepare?",
    2,
    3,
  );
  say(
    "maria",
    2,
    "counselor",
    "Hello Maria! Nothing special. If you can, note when your sleep felt best this month.",
    2,
    1,
  );
  say(
    "maria",
    3,
    "student",
    "Will do. My last few check-ins have been better, thanks to the breathing exercise.",
    1,
    20,
  );
  say("maria", 4, "counselor", "That is good to hear. We can build on it. See you soon.", 1, 18);
  say("angela", 1, "counselor", "Hi Angela, checking in after our session. How has this week been?", 3, 2);
  say("angela", 2, "student", "A bit better. I tried the sleep routine you suggested.", 2, 22);

  return { users, assessments, wellbeing, availability, appointments, messages };
}
