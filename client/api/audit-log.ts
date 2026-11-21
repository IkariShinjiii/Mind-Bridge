/**
 * Vercel serverless route: POST /api/audit-log  { action, targetId, detail }  with a Firebase ID token.
 * Writes an audit entry as the Admin SDK, so the entry cannot be skipped or forged from the browser once
 * firestore.rules stop allowing client writes to auditLog. Inert until FIREBASE_SERVICE_ACCOUNT is set (the app only
 * calls it when VITE_AUDIT_SERVER is "true"). Setup: docs/DEPLOYMENT.md, section 4.6.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { handleAudit, type AuditDeps, type AuditUser } from "./_auditCore.js";

interface Req {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export function buildDeps(serviceAccount: string): AuditDeps {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  const db = getFirestore();
  return {
    verifyIdToken: (token) => getAuth().verifyIdToken(token),
    getUser: async (uid) => {
      const snap = await db.collection("users").doc(uid).get();
      return snap.exists ? (snap.data() as AuditUser) : null;
    },
    addEntry: async (entry) => {
      await db.collection("auditLog").add(entry);
    },
  };
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    res.status(503).json({ logged: false, error: "Audit log is not configured" });
    return;
  }
  const auth = req.headers.authorization;
  try {
    const result = await handleAudit(
      { method: req.method, authorization: Array.isArray(auth) ? auth[0] : auth, body: req.body },
      buildDeps(serviceAccount),
    );
    res.status(result.status).json(result.body);
  } catch {
    res.status(502).json({ logged: false, error: "Could not write the audit log" });
  }
}
