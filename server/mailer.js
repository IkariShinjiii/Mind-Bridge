// There's no real email provider wired up here. In production, replace the
// body of sendMail() with an actual call to something like Nodemailer (SMTP),
// Resend, or SendGrid — everything else in the app (token generation,
// expiry, verification routes) already works and won't need to change.
//
// For now, this logs the "email" to the server console so you can see and
// test the flow locally. When NODE_ENV !== "production", the link is also
// handed back in the API response so the frontend can show a dev shortcut —
// that response field is stripped out entirely in production.

const isDev = process.env.NODE_ENV !== "production";

export function sendMail({ to, subject, link }) {
  console.log("\n📧  [DEV EMAIL — not actually sent]");
  console.log(`    To:      ${to}`);
  console.log(`    Subject: ${subject}`);
  console.log(`    Link:    ${link}\n`);

  return { devLink: isDev ? link : undefined };
}
