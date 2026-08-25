import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const isDev = process.env.NODE_ENV !== "production";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT || 587) === 465,
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
});

export function sendMail({ to, subject, link, text, html }) {
  const safeText = text || `Please review this item.\n\n${link ? `Open: ${link}` : "No link provided."}`;
  const safeHtml =
    html ||
    `
      <div style="font-family: Arial, sans-serif; color: #1f1c3f; line-height: 1.6;">
        <p>Hello,</p>
        <p>${safeText.replace(/\n/g, "<br />")}</p>
        ${link ? `<p><a href="${link}" style="color:#0f766e;">Open link</a></p>` : ""}
      </div>
    `;

  if (!process.env.SMTP_HOST || isDev) {
    console.log("\n📧  [DEV EMAIL]");
    console.log(`    To:      ${to}`);
    console.log(`    Subject: ${subject}`);
    console.log(`    Link:    ${link || "(no link)"}\n`);
    return { devLink: isDev ? link : undefined, ok: true };
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || "Mind Bridge <no-reply@mindbridge.app>",
    to,
    subject,
    text: safeText,
    html: safeHtml,
  });
}

export async function sendHighRiskAlert({ studentName, studentEmail, riskLevel, total, maxScore, flaggedForImmediateReview }) {
  const data = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "data.json"), "utf-8"));
  const counselorEmails = [...new Set(
    (data.users || [])
      .filter((u) => u.role === "counselor" && u.active !== false && u.approved !== false)
      .map((u) => (u.email || "").toLowerCase())
      .filter(Boolean)
  )];

  if (!counselorEmails.length) return { sent: 0, recipients: [] };

  const APP_URL = process.env.APP_URL || process.env.VITE_API_URL || "http://localhost:4000";
  const link = `${APP_URL.replace(/\/$/, "")}/counselor/dashboard?student=${encodeURIComponent(studentName)}`;
  const subject = `High-risk wellness alert: ${studentName}`;
  const text = [
    "A wellness assessment has triggered a high-risk alert.",
    "",
    `Student: ${studentName}`,
    `Email: ${studentEmail || "Not provided"}`,
    `Risk level: ${riskLevel}`,
    `Score: ${total}/${maxScore}`,
    flaggedForImmediateReview ? "Immediate review flag: YES" : "Immediate review flag: NO",
    "",
    "Please review this assessment and reach out as soon as possible.",
    `Dashboard link: ${link}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f1c3f; line-height: 1.7;">
      <h2 style="color:#0f172a; margin-bottom: 12px;">High-risk student alert</h2>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Email:</strong> ${studentEmail || "Not provided"}</p>
      <p><strong>Risk level:</strong> ${riskLevel}</p>
      <p><strong>Score:</strong> ${total}/${maxScore}</p>
      <p><strong>Immediate review:</strong> ${flaggedForImmediateReview ? "Yes" : "No"}</p>
      <p>Please review this assessment and reach out to the student as soon as possible.</p>
      <p><a href="${link}" style="display:inline-block;background:#0f766e;color:white;padding:10px 16px;border-radius:8px;text-decoration:none;">Open dashboard</a></p>
    </div>
  `;

  const results = await Promise.all(
    counselorEmails.map((email) =>
      sendMail({
        to: email,
        subject,
        link,
        text,
        html,
      })
    )
  );

  return {
    sent: results.filter(Boolean).length,
    recipients: counselorEmails,
  };
}
