// functions/index.js is exercised through stubs (see vitest.config.js), so no SMTP or
// Firebase project is needed. The trigger is called directly with a fake event.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { scoreAnswers } from "../../client/src/utils/scoring.ts";

const { alertOnHighRisk } = await import("../../functions/index.js");

const staff = [
  { role: "admin", email: "Admin@usa.edu.ph", active: true },
  { role: "counselor", email: "cruz@usa.edu.ph", approved: true, active: true },
  { role: "counselor", email: "cruz@usa.edu.ph", approved: true }, // duplicate
  { role: "counselor", email: "pending@usa.edu.ph", approved: false },
  { role: "counselor", email: "gone@usa.edu.ph", approved: true, active: false },
  { role: "counselor", approved: true }, // no email
];

const event = (data, id = "a1") => ({ params: { id }, data: data === undefined ? undefined : { data: () => data } });
const highDoc = (over = {}) => ({ studentName: "Ana", total: 14, maxScore: 21, questionSummary: [], ...over });

beforeEach(() => {
  globalThis.__fn = { mail: [], queries: [], users: staff, secrets: {}, params: {} };
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("alertOnHighRisk (Firestore trigger: assessments/{id} onCreate)", () => {
  it("sends nothing for a low-risk assessment", async () => {
    await alertOnHighRisk(event(highDoc({ total: 3 })));
    expect(globalThis.__fn.mail).toHaveLength(0);
  });

  it("returns quietly when the event carries no document", async () => {
    await expect(alertOnHighRisk(event(undefined))).resolves.toBeUndefined();
    expect(globalThis.__fn.mail).toHaveLength(0);
  });

  it("emails active, approved staff once each (lower-cased, de-duplicated, no blanks)", async () => {
    await alertOnHighRisk(event(highDoc()));
    expect(globalThis.__fn.queries[0]).toMatchObject({ name: "users", field: "role", op: "in", values: ["counselor", "admin"] });
    expect(globalThis.__fn.mail).toHaveLength(1);
    expect(globalThis.__fn.mail[0].to).toEqual(["admin@usa.edu.ph", "cruz@usa.edu.ph"]);
  });

  it("builds the alert: subject, from, link and score, with no answers or question text", async () => {
    await alertOnHighRisk(event(highDoc({ answers: [3, 3], questionSummary: [{ text: "SECRET QUESTION", score: 3 }] })));
    const m = globalThis.__fn.mail[0];
    expect(m.subject).toBe("High-risk wellness alert: Ana");
    expect(m.from).toBe("Mind Bridge <no-reply@mindbridge.app>");
    expect(m.text).toContain("Score: 14/21");
    expect(m.text).toContain("Immediate review flag: No");
    expect(m.text).toContain("https://mind-bridge-omega.vercel.app/admin/dashboard");
    expect(m.text + m.html).not.toContain("SECRET QUESTION");
  });

  it("a crisis item above zero alerts even when the total is low, and says so", async () => {
    await alertOnHighRisk(event(highDoc({ total: 1, questionSummary: [{ isCrisisItem: true, score: 1 }] })));
    expect(globalThis.__fn.mail).toHaveLength(1);
    expect(globalThis.__fn.mail[0].text).toContain("Immediate review flag: YES");
  });

  it("ignores the client-supplied riskLevel (recomputes from score)", async () => {
    await alertOnHighRisk(event(highDoc({ riskLevel: "low" })));
    expect(globalThis.__fn.mail).toHaveLength(1);
    globalThis.__fn.mail.length = 0;
    await alertOnHighRisk(event(highDoc({ total: 2, riskLevel: "high" })));
    expect(globalThis.__fn.mail).toHaveLength(0);
  });

  it("HTML-escapes the student name", async () => {
    await alertOnHighRisk(event(highDoc({ studentName: '<img src=x onerror="alert(1)">' })));
    const { html } = globalThis.__fn.mail[0];
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("honours APP_URL and trims a trailing slash", async () => {
    globalThis.__fn.params.APP_URL = "https://example.test/";
    await alertOnHighRisk(event(highDoc()));
    expect(globalThis.__fn.mail[0].text).toContain("https://example.test/admin/dashboard");
  });

  it("does not send (and warns) when no staff have an email", async () => {
    globalThis.__fn.users = [{ role: "counselor", approved: false, email: "x@y.z" }];
    await alertOnHighRisk(event(highDoc()));
    expect(globalThis.__fn.mail).toHaveLength(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it("uses the SMTP_URL secret for the transport", async () => {
    globalThis.__fn.secrets.SMTP_URL = "smtps://real:pw@smtp.example.com:465";
    await alertOnHighRisk(event(highDoc()));
    expect(globalThis.__fn.mail[0].transportUrl).toBe("smtps://real:pw@smtp.example.com:465");
  });
});

describe("alert threshold stays in sync with client utils/scoring.ts", () => {
  // The function re-implements scoreAnswers' "high" rule; if one changes, this fails.
  const qs = [...Array(6)].map((_, i) => ({ id: `q${i + 1}` })).concat({ id: "q7", isCrisisItem: true });
  const cases = [
    [0, 0, 0, 0, 0, 0, 0], [3, 3, 1, 0, 0, 0, 0], [3, 3, 3, 3, 1, 0, 0], [3, 3, 3, 3, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1], [3, 3, 3, 3, 3, 3, 3], [2, 2, 2, 2, 2, 2, 0],
  ];
  for (const answers of cases) {
    it(`answers ${JSON.stringify(answers)}`, async () => {
      const s = scoreAnswers(answers, qs);
      globalThis.__fn.mail.length = 0;
      await alertOnHighRisk(event({
        studentName: "S", total: s.total, maxScore: s.maxScore,
        questionSummary: qs.map((q, i) => ({ isCrisisItem: !!q.isCrisisItem, score: answers[i] })),
      }));
      expect(globalThis.__fn.mail.length === 1).toBe(s.riskLevel === "high");
    });
  }
});
