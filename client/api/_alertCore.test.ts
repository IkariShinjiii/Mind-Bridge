import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  assess,
  buildMail,
  cleanName,
  handleAlert,
  sweepAlerts,
  type SweepDeps,
  staffEmails,
  type AlertDeps,
  type AlertRequest,
  type AssessmentDoc,
  type Mail,
  type StaffUser,
} from "./_alertCore";

const staff: StaffUser[] = [
  { role: "admin", email: "Admin@usa.edu.ph", active: true },
  { role: "counselor", email: "cruz@usa.edu.ph", approved: true, active: true },
  { role: "counselor", email: "CRUZ@usa.edu.ph", approved: true }, // duplicate
  { role: "counselor", email: "pending@usa.edu.ph", approved: false },
  { role: "counselor", email: "gone@usa.edu.ph", approved: true, active: false },
  { role: "counselor", approved: true }, // no email
  { role: "student", email: "student@usa.edu.ph", approved: true },
];

const high = (over: Partial<AssessmentDoc> = {}): AssessmentDoc => ({
  studentId: "stu1",
  studentName: "Ana",
  total: 14,
  maxScore: 21,
  questionSummary: [],
  ...over,
});

let sent: Mail[];
let claimed: Set<string>;
let released: string[];
let docs: Record<string, AssessmentDoc>;
let deps: AlertDeps;
let windows: Set<string>;
let profileNames: Record<string, string>;

beforeEach(() => {
  sent = [];
  claimed = new Set();
  released = [];
  docs = { a1: high() };
  windows = new Set();
  profileNames = { stu1: "Ana" };
  deps = {
    verifyIdToken: async (t) => {
      if (t !== "good") throw new Error("bad token");
      return { uid: "stu1" };
    },
    getAssessment: async (id) => docs[id] ?? null,
    claimAlert: async (id) => {
      if (claimed.has(id)) return false;
      claimed.add(id);
      return true;
    },
    releaseAlert: async (id) => {
      claimed.delete(id);
      released.push(id);
    },
    getStaff: async () => staff,
    claimStudentWindow: async (uid) => {
      if (windows.has(uid)) return false;
      windows.add(uid);
      return true;
    },
    releaseStudentWindow: async (uid) => void windows.delete(uid),
    getStudentName: async (uid) => profileNames[uid] ?? null,
    sendMail: async (m) => void sent.push(m),
    appUrl: "https://app.example/",
  };
});

const post = (over: Partial<AlertRequest> = {}): AlertRequest => ({
  method: "POST",
  authorization: "Bearer good",
  body: { assessmentId: "a1" },
  ...over,
});

describe("cleanName", () => {
  it("flattens line breaks and control characters and caps the length", () => {
    const dirty = "Ana" + String.fromCharCode(13, 10) + "Bcc: x@y.z" + String.fromCharCode(0);
    expect(cleanName(dirty)).toBe("Ana Bcc: x@y.z");
    expect(cleanName("x".repeat(200))).toHaveLength(80);
    expect(cleanName(undefined)).toBe("");
  });
});

describe("assess", () => {
  it("is high at 60% of the maximum, or on any positive crisis item", () => {
    expect(assess({ total: 12, maxScore: 21 }).high).toBe(false);
    expect(assess({ total: 13, maxScore: 21 }).high).toBe(true);
    expect(assess({ total: 1, maxScore: 21, questionSummary: [{ isCrisisItem: true, score: 1 }] })).toMatchObject({
      high: true,
      crisis: true,
    });
    expect(assess({ total: 1, maxScore: 21, questionSummary: [{ isCrisisItem: true, score: 0 }] }).high).toBe(false);
  });

  it("is not high when the maximum is missing or the values are junk", () => {
    expect(assess({}).high).toBe(false);
    expect(assess({ total: Number.NaN, maxScore: 0 }).high).toBe(false);
  });
});

describe("staffEmails", () => {
  it("keeps active, approved staff once each, lower-cased, and admins regardless of approval", () => {
    expect(staffEmails(staff)).toEqual(["admin@usa.edu.ph", "cruz@usa.edu.ph"]);
    expect(staffEmails([{ role: "admin", email: "a@x.ph" }])).toEqual(["a@x.ph"]);
  });

  it("never emails the demo accounts used for presentations", () => {
    const users: StaffUser[] = [
      { role: "admin", email: "admin@demo.mindbridge.test" },
      { role: "counselor", email: "Villanueva@Demo.MindBridge.test", approved: true },
      { role: "admin", email: "real@usa.edu.ph" },
    ];
    expect(staffEmails(users)).toEqual(["real@usa.edu.ph"]);
  });
});

describe("buildMail", () => {
  it("links to the dashboard, escapes the student name and never includes answers", () => {
    const mail = buildMail(high({ studentName: '<b>"Ana"</b>', total: 18 }), ["a@x.ph"], "https://app.example/");
    expect(mail.text).toContain("https://app.example/admin/dashboard");
    expect(mail.text).toContain("Score: 18/21");
    expect(mail.html).toContain("&lt;b&gt;&quot;Ana&quot;&lt;/b&gt;");
    expect(mail.html).not.toContain('<b>"Ana"');
    expect(mail.subject).toBe('High-risk wellness alert: <b>"Ana"</b>');
  });

  it("flags immediate review only when a crisis item scored", () => {
    const flagged = buildMail(high({ questionSummary: [{ isCrisisItem: true, score: 2 }] }), [], "https://x");
    expect(flagged.text).toContain("Immediate review flag: YES");
    expect(buildMail(high(), [], "https://x").text).toContain("Immediate review flag: No");
  });
});

describe("handleAlert cooldown", () => {
  it("sends one email per student per window, however many high-risk check-ins they file", async () => {
    docs = { a1: high(), a2: high(), a3: high() };
    const results = [];
    for (const id of ["a1", "a2", "a3"]) results.push(await handleAlert(post({ body: { assessmentId: id } }), deps));
    expect(results[0]).toEqual({ status: 200, body: { sent: true } });
    expect(results[1]).toEqual({ status: 200, body: { sent: false, reason: "rate-limited" } });
    expect(results[2]).toEqual({ status: 200, body: { sent: false, reason: "rate-limited" } });
    expect(sent).toHaveLength(1);
  });

  it("leaves a rate-limited check-in unclaimed so the sweep can alert it later", async () => {
    docs = { a1: high(), a2: high() };
    await handleAlert(post(), deps);
    await handleAlert(post({ body: { assessmentId: "a2" } }), deps);
    expect(claimed.has("a2")).toBe(false);
  });

  it("gives the window back when the email fails, so a retry can still alert", async () => {
    deps.sendMail = async () => {
      throw new Error("smtp down");
    };
    expect((await handleAlert(post(), deps)).status).toBe(502);
    expect(windows.has("stu1")).toBe(false);
  });

  it("gives the window back when no staff address exists", async () => {
    deps.getStaff = async () => [];
    await handleAlert(post(), deps);
    expect(windows.has("stu1")).toBe(false);
  });
});

describe("handleAlert", () => {
  it("puts the profile name in the alert, not the name typed on the check-in", async () => {
    docs.a1 = high({ studentName: "URGENT: call this number now" });
    await handleAlert(post(), deps);
    expect(sent[0]?.subject).toBe("High-risk wellness alert: Ana");
    expect(sent[0]?.text).toContain("Student: Ana");
    expect(sent[0]?.text).not.toContain("URGENT");
  });

  it("falls back to a generic subject when the profile has no name", async () => {
    profileNames = {};
    docs.a1 = high({ studentName: "Spoofed" });
    await handleAlert(post(), deps);
    expect(sent[0]?.subject).toBe("High-risk wellness alert: student");
  });

  it("emails staff once for the student's own high-risk check-in", async () => {
    const result = await handleAlert(post(), deps);
    expect(result).toEqual({ status: 200, body: { sent: true } });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual(["admin@usa.edu.ph", "cruz@usa.edu.ph"]);
  });

  it("does not send a second time for the same check-in", async () => {
    await handleAlert(post(), deps);
    const again = await handleAlert(post(), deps);
    expect(again).toEqual({ status: 200, body: { sent: false, reason: "already-sent" } });
    expect(sent).toHaveLength(1);
  });

  it("rejects anything that is not a POST", async () => {
    expect((await handleAlert(post({ method: "GET" }), deps)).status).toBe(405);
    expect(sent).toHaveLength(0);
  });

  it("requires a valid Firebase ID token", async () => {
    expect((await handleAlert(post({ authorization: undefined }), deps)).status).toBe(401);
    expect((await handleAlert(post({ authorization: "Bearer nope" }), deps)).status).toBe(401);
    expect((await handleAlert(post({ authorization: "good" }), deps)).status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it("validates the assessment id", async () => {
    for (const body of [null, {}, { assessmentId: 5 }, { assessmentId: "" }, { assessmentId: "a/b" }]) {
      expect((await handleAlert(post({ body }), deps)).status).toBe(400);
    }
    expect((await handleAlert(post({ body: { assessmentId: "x".repeat(129) } }), deps)).status).toBe(400);
  });

  it("404s on an unknown check-in and 403s when it belongs to someone else", async () => {
    expect((await handleAlert(post({ body: { assessmentId: "missing" } }), deps)).status).toBe(404);
    docs.a1 = high({ studentId: "someone-else" });
    expect((await handleAlert(post(), deps)).status).toBe(403);
    expect(sent).toHaveLength(0);
    expect(claimed.size).toBe(0);
  });

  it("recomputes risk instead of trusting the client, so a low score sends nothing", async () => {
    docs.a1 = high({ total: 2 });
    expect(await handleAlert(post(), deps)).toEqual({ status: 200, body: { sent: false, reason: "not-high-risk" } });
    expect(sent).toHaveLength(0);
    expect(claimed.size).toBe(0);
  });

  it("releases the claim when there is nobody to email, so a later retry can still send", async () => {
    deps.getStaff = async () => [];
    expect(await handleAlert(post(), deps)).toEqual({ status: 200, body: { sent: false, reason: "no-staff-emails" } });
    expect(released).toEqual(["a1"]);
  });

  it("releases the claim and answers 502 when sending fails, without leaking the error", async () => {
    deps.sendMail = vi.fn().mockRejectedValue(new Error("smtp://user:secret@host refused"));
    const result = await handleAlert(post(), deps);
    expect(result).toEqual({ status: 502, body: { sent: false, error: "Could not send the alert" } });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(released).toEqual(["a1"]);
  });
});

describe("sweepAlerts", () => {
  const high = { studentId: "s", studentName: "Ana", total: 14, maxScore: 21, questionSummary: [] };
  const mk = (rows: Array<{ id: string; data: AssessmentDoc }>, over: Partial<SweepDeps> = {}) => {
    const sent: string[] = [];
    const windowed = new Set<string>();
    const claimed = new Set<string>(rows.filter((r) => r.data.alertSentAt).map((r) => r.id));
    const deps: SweepDeps = {
      verifyIdToken: async () => ({ uid: "s" }),
      getAssessment: async () => null,
      claimAlert: async (id) => (claimed.has(id) ? false : (claimed.add(id), true)),
      releaseAlert: async (id) => void claimed.delete(id),
      getStaff: async () => [{ role: "admin", email: "a@usa.edu.ph" }],
      claimStudentWindow: async (id) => (windowed.has(id) ? false : (windowed.add(id), true)),
      releaseStudentWindow: async (id) => void windowed.delete(id),
      getStudentName: async () => "Ana",
      sendMail: async (m) => void sent.push(m.subject),
      listRecentAssessments: async () => rows,
      appUrl: "https://x.test",
      ...over,
    };
    return { deps, sent };
  };

  it("sends one email per student per window even when the student has many unalerted check-ins", async () => {
    const { deps, sent } = mk([
      { id: "a", data: high },
      { id: "b", data: high },
      { id: "c", data: high },
    ]);
    expect(await sweepAlerts(deps)).toEqual({ checked: 3, sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
  });

  it("alerts high-risk check-ins that were never alerted, and skips the rest", async () => {
    const { deps, sent } = mk([
      { id: "a", data: high },
      { id: "b", data: { ...high, total: 1 } },
      { id: "c", data: { ...high, alertSentAt: "2026-01-01" } },
    ]);
    expect(await sweepAlerts(deps)).toEqual({ checked: 3, sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
  });

  it("is idempotent: a second sweep sends nothing new", async () => {
    const { deps, sent } = mk([{ id: "a", data: high }]);
    await sweepAlerts(deps);
    await sweepAlerts(deps);
    expect(sent).toHaveLength(1);
  });

  it("counts a failed send, releases the claim, and keeps going", async () => {
    let calls = 0;
    const { deps, sent } = mk(
      [
        { id: "a", data: high },
        { id: "b", data: high },
      ],
      {
        sendMail: async (m) => {
          if (calls++ === 0) throw new Error("smtp down");
          sent2.push(m.subject);
        },
      },
    );
    const sent2: string[] = [];
    expect(await sweepAlerts(deps)).toEqual({ checked: 2, sent: 1, failed: 1 });
    expect(sent2).toHaveLength(1);
    expect(sent).toHaveLength(0);
  });

  it("asks only for check-ins from the last 48 hours", async () => {
    let since = "";
    const { deps } = mk([], { listRecentAssessments: async (s) => ((since = s), []) });
    await sweepAlerts(deps, new Date("2026-10-14T12:00:00.000Z"));
    expect(since).toBe("2026-10-12T12:00:00.000Z");
  });
});

describe("assess for the full PHQ-9 + GAD-7 check-in", async () => {
  const { scoreFull } = await import("../src/utils/clinical");
  const doc = (answers: number[]): AssessmentDoc => ({
    total: answers.reduce((a, b) => a + b, 0),
    maxScore: 48,
    questionSummary: answers.map((score, i) => ({ score, isCrisisItem: i === 8 })),
  });

  it("is high at PHQ-9 15 even though that is under 60% of 48", () => {
    expect(assess(doc([2, 2, 2, 2, 2, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0])).high).toBe(true);
  });

  it("is high at GAD-7 15, and not at 14", () => {
    expect(assess(doc([0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 2, 0, 0])).high).toBe(false);
    expect(assess(doc([0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 3, 0, 0])).high).toBe(true);
  });

  it("agrees with the browser's scoring on every kind of answer set", () => {
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let n = 0; n < 500; n++) {
      const answers = Array.from({ length: 16 }, () => Math.floor(rand() * rand() * 4));
      const total = answers.reduce((a, b) => a + b, 0);
      const browserHigh = scoreFull(answers).level === "high" || total >= 48 * 0.6;
      expect(assess(doc(answers)).high, answers.join(",")).toBe(browserHigh);
    }
  });
});
