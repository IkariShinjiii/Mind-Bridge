/**
 * High-risk alert, framework-free. `alert-high-risk.ts` wires in firebase-admin and nodemailer;
 * the tests wire in fakes. Mirrors `functions/index.js` (the Cloud Function alternative): pick one, not both.
 */

export interface AssessmentDoc {
  studentId?: string;
  studentName?: string;
  total?: number;
  maxScore?: number;
  questionSummary?: Array<{ isCrisisItem?: boolean; score?: number | null }>;
  alertSentAt?: string;
}

export interface StaffUser {
  role?: string;
  email?: string;
  approved?: boolean;
  active?: boolean;
}

export interface Mail {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

export interface AlertDeps {
  verifyIdToken(token: string): Promise<{ uid: string }>;
  getAssessment(id: string): Promise<AssessmentDoc | null>;
  /** Atomically marks the assessment as alerted. Returns false when it already was, so retries never send twice. */
  claimAlert(id: string): Promise<boolean>;
  /** Undoes `claimAlert` after a failed send so the client can retry. */
  releaseAlert(id: string): Promise<void>;
  getStaff(): Promise<StaffUser[]>;
  sendMail(mail: Mail): Promise<void>;
  appUrl: string;
}

export interface AlertRequest {
  method: string | undefined;
  authorization: string | undefined;
  body: unknown;
}

export interface AlertResult {
  status: number;
  body: { sent: boolean; reason?: string; error?: string };
}

const respond = (status: number, body: AlertResult["body"]): AlertResult => ({ status, body });

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

/** Risk is recomputed here instead of trusting the client-supplied `riskLevel`. */
export function assess(a: AssessmentDoc): { total: number; maxScore: number; crisis: boolean; high: boolean } {
  const total = Number(a.total) || 0;
  const maxScore = Number(a.maxScore) || 0;
  const crisis = (a.questionSummary ?? []).some((q) => q.isCrisisItem && Number(q.score) > 0);
  const high = crisis || (maxScore > 0 && total >= maxScore * 0.6);
  return { total, maxScore, crisis, high };
}

/** Active, approved staff (admins always), lower-cased and de-duplicated. */
export function staffEmails(users: StaffUser[]): string[] {
  const set = new Set<string>();
  for (const u of users) {
    if (u.role !== "counselor" && u.role !== "admin") continue;
    if (u.active === false) continue;
    if (u.role !== "admin" && u.approved !== true) continue;
    const email = (u.email ?? "").trim().toLowerCase();
    if (email) set.add(email);
  }
  return [...set];
}

/** No answers in the email: sensitive detail stays inside the app. */
export function buildMail(a: AssessmentDoc, to: string[], appUrl: string): Mail {
  const { total, maxScore, crisis } = assess(a);
  const link = `${appUrl.replace(/\/$/, "")}/admin/dashboard`;
  const name = a.studentName || "Unknown";
  return {
    to,
    subject: `High-risk wellness alert: ${a.studentName || "student"}`,
    text: [
      "A wellness assessment has been flagged as high risk.",
      "",
      `Student: ${name}`,
      `Score: ${total}/${maxScore}`,
      `Immediate review flag: ${crisis ? "YES" : "No"}`,
      "",
      `Please review it in the dashboard: ${link}`,
    ].join("\n"),
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>High-risk student alert</h2>
      <p><b>Student:</b> ${esc(name)}</p>
      <p><b>Score:</b> ${total}/${maxScore}</p>
      <p><b>Immediate review:</b> ${crisis ? "Yes" : "No"}</p>
      <p><a href="${esc(link)}">Open dashboard</a></p></div>`,
  };
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export async function handleAlert(req: AlertRequest, deps: AlertDeps): Promise<AlertResult> {
  if (req.method !== "POST") return respond(405, { sent: false, error: "Method not allowed" });

  const token = /^Bearer (.+)$/.exec(req.authorization ?? "")?.[1];
  if (!token) return respond(401, { sent: false, error: "Sign in required" });

  let uid: string;
  try {
    uid = (await deps.verifyIdToken(token)).uid;
  } catch {
    return respond(401, { sent: false, error: "Sign in required" });
  }

  const assessmentId = (req.body as { assessmentId?: unknown } | null)?.assessmentId;
  if (typeof assessmentId !== "string" || !ID_PATTERN.test(assessmentId)) {
    return respond(400, { sent: false, error: "assessmentId is required" });
  }

  const assessment = await deps.getAssessment(assessmentId);
  if (!assessment) return respond(404, { sent: false, error: "Not found" });
  // Only the student who submitted a check-in can trigger its alert.
  if (assessment.studentId !== uid) return respond(403, { sent: false, error: "Not allowed" });

  if (!assess(assessment).high) return respond(200, { sent: false, reason: "not-high-risk" });

  if (!(await deps.claimAlert(assessmentId))) return respond(200, { sent: false, reason: "already-sent" });

  try {
    const to = staffEmails(await deps.getStaff());
    if (!to.length) {
      await deps.releaseAlert(assessmentId);
      return respond(200, { sent: false, reason: "no-staff-emails" });
    }
    await deps.sendMail(buildMail(assessment, to, deps.appUrl));
    return respond(200, { sent: true });
  } catch {
    await deps.releaseAlert(assessmentId).catch(() => undefined);
    return respond(502, { sent: false, error: "Could not send the alert" });
  }
}
