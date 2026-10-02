import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  assess,
  buildMail,
  handleAlert,
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

beforeEach(() => {
  sent = [];
  claimed = new Set();
  released = [];
  docs = { a1: high() };
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

describe("handleAlert", () => {
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
