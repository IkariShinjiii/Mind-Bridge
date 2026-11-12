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
  /**
   * Per-student cooldown: atomically records "this student triggered an alert now" unless one was recorded less than
   * `windowMs` ago. Returns false when the student is still inside the window. Stops one account from making the
   * app email every staff address over and over.
   */
  claimStudentWindow(studentId: string, windowMs: number): Promise<boolean>;
  /** Undoes `claimStudentWindow` after a failed send. */
  releaseStudentWindow(studentId: string): Promise<void>;
  /** The student's own profile name (users/{uid}.name), or null. The name typed on the check-in is never trusted. */
  getStudentName(uid: string): Promise<string | null>;
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
  let high = crisis || (maxScore > 0 && total >= maxScore * 0.6);
  // Full PHQ-9 + GAD-7 check-in (16 questions): also high at PHQ-9 15+ or GAD-7 15+, the published bands.
  // Same rule as `scoreFull` in src/utils/clinical.ts; api/_alertCore.test.ts checks the two agree.
  const items = a.questionSummary ?? [];
  if (items.length === 16) {
    const sum = (from: number, to: number) => items.slice(from, to).reduce((s, q) => s + (Number(q.score) || 0), 0);
    high = high || sum(0, 9) >= 15 || sum(9, 16) >= 15;
  }
  return { total, maxScore, crisis, high };
}

/** Demo accounts (scripts/seed-demo.mjs) use this reserved domain; mail to it would only bounce. */
const DEMO_EMAIL_SUFFIX = "@demo.mindbridge.test";

/** Active, approved staff (admins always), lower-cased and de-duplicated. Demo accounts are never emailed. */
export function staffEmails(users: StaffUser[]): string[] {
  const set = new Set<string>();
  for (const u of users) {
    if (u.role !== "counselor" && u.role !== "admin") continue;
    if (u.active === false) continue;
    if (u.role !== "admin" && u.approved !== true) continue;
    const email = (u.email ?? "").trim().toLowerCase();
    if (email && !email.endsWith(DEMO_EMAIL_SUFFIX)) set.add(email);
  }
  return [...set];
}

/** A name that is safe to show in a subject line: one line, no control characters, at most 80 characters. */
export function cleanName(raw: unknown): string {
  // Drop control characters (newlines, tabs, NUL...) by code point; no control characters in a regex.
  const flat = [...String(raw ?? "")]
    .map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return flat.slice(0, 80);
}

/** No answers in the email: sensitive detail stays inside the app. */
export function buildMail(a: AssessmentDoc, to: string[], appUrl: string): Mail {
  const { total, maxScore, crisis } = assess(a);
  const link = `${appUrl.replace(/\/$/, "")}/admin/dashboard`;
  const name = cleanName(a.studentName) || "Unknown";
  return {
    to,
    subject: `High-risk wellness alert: ${cleanName(a.studentName) || "student"}`,
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

/** At most one alert email per student per hour. Further check-ins stay on the dashboard; the sweep alerts them once the hour is up. */
export const STUDENT_ALERT_COOLDOWN_MS = 60 * 60 * 1000;

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

  return deliverAlert(assessmentId, assessment, deps);
}

/** Claims a check-in, emails staff, and undoes the claim on failure. Shared by the browser call and the sweep. */
async function deliverAlert(id: string, assessment: AssessmentDoc, deps: AlertDeps): Promise<AlertResult> {
  if (!assess(assessment).high) return respond(200, { sent: false, reason: "not-high-risk" });

  if (!(await deps.claimAlert(id))) return respond(200, { sent: false, reason: "already-sent" });

  const studentId = assessment.studentId ?? "";
  let windowClaimed = false;
  try {
    // The cooldown is claimed after the check-in so a retry of the same check-in never counts twice.
    if (studentId && !(await deps.claimStudentWindow(studentId, STUDENT_ALERT_COOLDOWN_MS))) {
      await deps.releaseAlert(id);
      return respond(200, { sent: false, reason: "rate-limited" });
    }
    windowClaimed = !!studentId;
    const to = staffEmails(await deps.getStaff());
    if (!to.length) {
      await deps.releaseAlert(id);
      if (windowClaimed) await deps.releaseStudentWindow(studentId);
      return respond(200, { sent: false, reason: "no-staff-emails" });
    }
    // The name comes from the student's profile on the server, not from the check-in, which the student can edit freely.
    const studentName = assessment.studentId ? await deps.getStudentName(assessment.studentId) : null;
    await deps.sendMail(buildMail({ ...assessment, studentName: studentName ?? undefined }, to, deps.appUrl));
    return respond(200, { sent: true });
  } catch {
    await deps.releaseAlert(id).catch(() => undefined);
    if (windowClaimed) await deps.releaseStudentWindow(studentId).catch(() => undefined);
    return respond(502, { sent: false, error: "Could not send the alert" });
  }
}

export interface SweepDeps extends AlertDeps {
  /** Check-ins created at or after `sinceIso` (ISO string compare on `createdAt`). */
  listRecentAssessments(sinceIso: string): Promise<Array<{ id: string; data: AssessmentDoc }>>;
}

/** How far back the sweep looks. Wide enough to survive a few missed runs; `alertSentAt` stops repeats. */
export const SWEEP_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Safety net for the browser call: emails any high-risk check-in nobody was alerted about (the student closed
 * the tab, lost signal, or the route was down). Idempotent: already-alerted check-ins are skipped.
 */
export async function sweepAlerts(
  deps: SweepDeps,
  now: Date = new Date(),
): Promise<{ checked: number; sent: number; failed: number }> {
  const recent = await deps.listRecentAssessments(new Date(now.getTime() - SWEEP_WINDOW_MS).toISOString());
  let sent = 0;
  let failed = 0;
  for (const { id, data } of recent) {
    if (data.alertSentAt || !assess(data).high) continue;
    const result = await deliverAlert(id, data, deps);
    if (result.body.sent) sent += 1;
    else if (result.status >= 500) failed += 1;
  }
  return { checked: recent.length, sent, failed };
}
