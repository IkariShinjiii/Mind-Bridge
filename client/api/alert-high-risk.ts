/**
 * Vercel serverless route: POST /api/alert-high-risk  { assessmentId }  with a Firebase ID token.
 * Emails staff about a high-risk check-in. Inert until configured: with no environment variables it
 * answers 503 and the app never calls it (see VITE_ALERT_ENABLED). Setup is in docs/DEPLOYMENT.md, section 4.4.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import { handleAlert, type AlertDeps, type AssessmentDoc, type StaffUser } from "./_alertCore.js";

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

function configured(): { serviceAccount: string; smtpUrl: string } | null {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const smtpUrl = process.env.SMTP_URL;
  return serviceAccount && smtpUrl ? { serviceAccount, smtpUrl } : null;
}

function buildDeps(config: { serviceAccount: string; smtpUrl: string }): AlertDeps {
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(config.serviceAccount)) });
  const db = getFirestore();
  const transporter = nodemailer.createTransport(config.smtpUrl);
  const from = process.env.SMTP_FROM || "Mind Bridge <no-reply@mindbridge.app>";

  return {
    verifyIdToken: (token) => getAuth().verifyIdToken(token),
    getAssessment: async (id) => {
      const snap = await db.collection("assessments").doc(id).get();
      return snap.exists ? (snap.data() as AssessmentDoc) : null;
    },
    claimAlert: (id) =>
      db.runTransaction(async (tx) => {
        const ref = db.collection("assessments").doc(id);
        const snap = await tx.get(ref);
        if (snap.data()?.alertSentAt) return false;
        tx.update(ref, { alertSentAt: new Date().toISOString() });
        return true;
      }),
    releaseAlert: async (id) => {
      await db.collection("assessments").doc(id).update({ alertSentAt: FieldValue.delete() });
    },
    getStaff: async () => {
      const snap = await db.collection("users").where("role", "in", ["counselor", "admin"]).get();
      return snap.docs.map((d) => d.data() as StaffUser);
    },
    sendMail: async (mail) => {
      await transporter.sendMail({ from, ...mail });
    },
    appUrl: process.env.APP_URL || "https://mind-bridge-omega.vercel.app",
  };
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  const config = configured();
  if (!config) {
    res.status(503).json({ sent: false, error: "Alerts are not configured" });
    return;
  }
  const auth = req.headers.authorization;
  const result = await handleAlert(
    { method: req.method, authorization: Array.isArray(auth) ? auth[0] : auth, body: req.body },
    buildDeps(config),
  );
  res.status(result.status).json(result.body);
}
