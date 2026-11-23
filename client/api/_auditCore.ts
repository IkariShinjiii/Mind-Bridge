/** Logic of POST /api/audit-log, with every outside call injected so it can be tested without Firebase. */

export const STAFF_ACTIONS = [
  "case_viewed",
  "case_updated",
  "assignment_changed",
  "appointment_updated",
  "report_exported",
] as const;

/** What a student's own activity can record. `detail` carries progress only, never the answers. */
export const STUDENT_ACTIONS = [
  "checkin_abandoned",
  "checkin_submitted",
  "appointment_booked",
  "appointment_cancelled",
] as const;

export interface AuditUser {
  role?: string;
  approved?: boolean;
  active?: boolean;
  name?: string;
  email?: string;
}

export interface AuditDeps {
  verifyIdToken(token: string): Promise<{ uid: string }>;
  getUser(uid: string): Promise<AuditUser | null>;
  addEntry(entry: Record<string, string>): Promise<void>;
}

export interface AuditRequest {
  method: string | undefined;
  authorization: string | undefined;
  body: unknown;
}

export interface AuditResult {
  status: number;
  body: { logged: boolean; error?: string };
}

const respond = (status: number, error?: string): AuditResult => ({
  status,
  body: error ? { logged: false, error } : { logged: true },
});

/** Same staff test as firestore.rules: an active admin, or an approved peer facilitator (stored role "counselor"). */
const isStaff = (u: AuditUser): boolean =>
  u.active !== false && (u.role === "admin" || (u.role === "counselor" && u.approved === true));

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);

export async function handleAudit(req: AuditRequest, deps: AuditDeps): Promise<AuditResult> {
  if (req.method !== "POST") return respond(405, "Method not allowed");

  const token = /^Bearer (.+)$/.exec(req.authorization ?? "")?.[1];
  if (!token) return respond(401, "Sign in required");
  let uid: string;
  try {
    uid = (await deps.verifyIdToken(token)).uid;
  } catch {
    return respond(401, "Sign in required");
  }

  const user = await deps.getUser(uid);
  if (!user || user.active === false) return respond(403, "Not allowed");
  // Staff record what they did to a case; a student records only their own activity. Anyone else is refused.
  const allowed: readonly string[] = isStaff(user)
    ? STAFF_ACTIONS
    : user.role === undefined || user.role === "student"
      ? STUDENT_ACTIONS
      : [];
  if (allowed.length === 0) return respond(403, "Not allowed");

  const body = (req.body ?? {}) as Record<string, unknown>;
  const action = typeof body["action"] === "string" ? body["action"] : "";
  const targetId = text(body["targetId"], 100);
  const detail = text(body["detail"], 300);
  if (!allowed.includes(action) || targetId === null || detail === null) {
    return respond(400, "action, targetId and detail are required");
  }

  // The actor and the time come from the server, never from the request.
  await deps.addEntry({
    actorId: uid,
    actorName: (user.name || user.email || "Staff").slice(0, 200),
    action,
    targetId,
    detail,
    at: new Date().toISOString(),
  });
  return respond(200);
}
