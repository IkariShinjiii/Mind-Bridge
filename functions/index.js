import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

initializeApp();

const SMTP_URL = defineSecret("SMTP_URL"); // e.g. smtps://user:pass@smtp.example.com:465
const SMTP_FROM = defineString("SMTP_FROM", { default: "Mind Bridge <no-reply@mindbridge.app>" });
const APP_URL = defineString("APP_URL", { default: "https://mind-bridge-omega.vercel.app" });

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Recompute risk here instead of trusting the client-supplied riskLevel.
function assess(a) {
  const total = Number(a.total) || 0;
  const maxScore = Number(a.maxScore) || 0;
  const crisis = (a.questionSummary || []).some((q) => q.isCrisisItem && Number(q.score) > 0);
  const high = crisis || (maxScore > 0 && total >= maxScore * 0.6);
  return { total, maxScore, crisis, high };
}

export const alertOnHighRisk = onDocumentCreated(
  // retry: a failed send is re-run (up to 7 days) instead of silently losing a crisis alert.
  { document: "assessments/{id}", secrets: [SMTP_URL], retry: true },
  async (event) => {
    const a = event.data?.data();
    if (!a) return;
    const { total, maxScore, crisis, high } = assess(a);
    if (!high) return;

    // Events are delivered at least once and retried on failure: claim the check-in so staff never get two emails.
    const ref = event.data.ref;
    const claimed = await getFirestore().runTransaction(async (tx) => {
      if ((await tx.get(ref)).get("alertSentAt")) return false;
      tx.update(ref, { alertSentAt: new Date().toISOString() });
      return true;
    });
    if (!claimed) return;

    try {
      const to = await staffEmails();
      if (!to.length) {
        console.warn("High-risk assessment", event.params.id, "but no staff emails found");
        await ref.update({ alertSentAt: FieldValue.delete() });
        return;
      }
      await send(a, to, { total, maxScore, crisis });
    } catch (err) {
      await ref.update({ alertSentAt: FieldValue.delete() }).catch(() => undefined);
      throw err; // let Cloud Functions retry
    }
  }
);

async function staffEmails() {
  const snap = await getFirestore().collection("users").where("role", "in", ["counselor", "admin"]).get();
  return [
    ...new Set(
      snap.docs
        .map((d) => d.data())
        .filter((u) => u.active !== false && (u.role === "admin" || u.approved === true))
        .map((u) => (u.email || "").toLowerCase())
        .filter(Boolean)
    ),
  ];
}

async function send(a, to, { total, maxScore, crisis }) {
  const link = `${APP_URL.value().replace(/\/$/, "")}/admin/dashboard`;
  // No answers in the email body: keep sensitive detail inside the app.
  const text = [
    "A wellness assessment has been flagged as high risk.",
    "",
    `Student: ${a.studentName || "Unknown"}`,
    `Score: ${total}/${maxScore}`,
    `Immediate review flag: ${crisis ? "YES" : "No"}`,
    "",
    `Please review it in the dashboard: ${link}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>High-risk student alert</h2>
      <p><b>Student:</b> ${esc(a.studentName || "Unknown")}</p>
      <p><b>Score:</b> ${total}/${maxScore}</p>
      <p><b>Immediate review:</b> ${crisis ? "Yes" : "No"}</p>
      <p><a href="${esc(link)}">Open dashboard</a></p></div>`;

  const transporter = nodemailer.createTransport(SMTP_URL.value());
  await transporter.sendMail({
    from: SMTP_FROM.value(),
    to,
    subject: `High-risk wellness alert: ${a.studentName || "student"}`,
    text,
    html,
  });
}
